'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Package,
  Search,
  Send,
  Volume2,
  VolumeX,
  Clock,
  CheckCircle2,
  RotateCcw,
  PlusCircle,
  ExternalLink,
  Shield,
  Download,
  MapPin,
  Building2,
  Globe,
  Radio,
  User,
  Filter,
  Sparkles,
  Paperclip,
  Check,
  ChevronRight
} from 'lucide-react';
import { Conversation, ChatMessage, ConversationStatus, CannedResponse } from '@/lib/chatTypes';
import { INITIAL_CANNED_RESPONSES } from '@/data/initialChats';
import { Consignment, ShipmentStatus } from '@/lib/types';
import { formatDate, getStatusLabel, getStatusColor } from '@/lib/utils';

// Agent notification chime synthesizer
function playAgentAlertChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
    osc.frequency.setValueAtTime(880, now + 0.2); // A5

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  } catch (e) {
    console.debug('Agent alert audio not played:', e);
  }
}

export default function OperationsPortalPage() {
  const [activeTab, setActiveTab] = useState<'CHAT_CRM' | 'CONSIGNMENTS'>('CHAT_CRM');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // ── CRM Conversations & Chat States ──
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [chatSearch, setChatSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ConversationStatus | 'WAITING'>('ALL');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showCannedDrawer, setShowCannedDrawer] = useState(false);
  const [cannedResponses] = useState<CannedResponse[]>(INITIAL_CANNED_RESPONSES);
  const [agentNotes, setAgentNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // ── Logistics Telemetry Lookup in Sidebar ──
  const [sidebarTrackingSearch, setSidebarTrackingSearch] = useState('');
  const [sidebarConsignmentResult, setSidebarConsignmentResult] = useState<Consignment | null>(null);

  // ── Consignments Hub State (Tab 2) ──
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [isLoadingConsignments, setIsLoadingConsignments] = useState(false);
  const [consignmentSearch, setConsignmentSearch] = useState('');
  const [consignmentStatusFilter, setConsignmentStatusFilter] = useState('ALL');

  // Checkpoint Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedConsignment, setSelectedConsignment] = useState<Consignment | null>(null);
  const [modalStatus, setModalStatus] = useState<ShipmentStatus>('IN_TRANSIT');
  const [checkpointTitle, setCheckpointTitle] = useState('');
  const [checkpointLocation, setCheckpointLocation] = useState('');
  const [checkpointFacility, setCheckpointFacility] = useState('');
  const [checkpointDescription, setCheckpointDescription] = useState('');
  const [isSubmittingCheckpoint, setIsSubmittingCheckpoint] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // ── Cross-tab communication with visitors via BroadcastChannel ──
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel('navithon_live_chat');
      broadcastChannelRef.current = bc;

      bc.onmessage = (event) => {
        const { type, data } = event.data;
        if (type === 'NEW_MESSAGE') {
          const { message, conversation } = data;

          // Update message feed if viewing this conversation
          if (message.conversationId === selectedConvId) {
            setActiveMessages((prev) => {
              if (prev.some((m) => m.id === message.id)) return prev;
              return [...prev, message];
            });
          }

          // Update conversation in list
          setConversations((prev) => {
            const index = prev.findIndex((c) => c.id === message.conversationId);
            if (index !== -1) {
              const updated = [...prev];
              updated[index] = conversation;
              return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            } else {
              return [conversation, ...prev];
            }
          });

          // Play sound alert for visitor message
          if (message.sender === 'visitor') {
            if (soundEnabled) playAgentAlertChime();
          }
        }
      };
    }

    return () => {
      broadcastChannelRef.current?.close();
    };
  }, [selectedConvId, soundEnabled]);

  // ── Fetch Conversations on Mount ──
  const fetchConversations = async () => {
    try {
      setIsLoadingChats(true);
      const res = await fetch('/api/chat/conversations');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setConversations(json.data);
        if (!selectedConvId && json.data.length > 0) {
          setSelectedConvId(json.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch CRM conversations:', err);
    } finally {
      setIsLoadingChats(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // ── Auto-poll conversations & active messages every 3 seconds ──
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Poll conversations list
        const res = await fetch('/api/chat/conversations');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setConversations(json.data);
        }

        // Poll messages for active conversation
        if (selectedConvId) {
          const msgRes = await fetch(`/api/chat/messages?conversationId=${selectedConvId}`);
          const msgJson = await msgRes.json();
          if (msgJson.success && Array.isArray(msgJson.data)) {
            setActiveMessages(msgJson.data);
          }
        }
      } catch {
        // silent
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedConvId]);

  // ── Fetch Messages when Selected Conversation changes ──
  useEffect(() => {
    if (!selectedConvId) {
      setActiveMessages([]);
      return;
    }

    const currentConv = conversations.find((c) => c.id === selectedConvId);
    if (currentConv) {
      setAgentNotes(currentConv.internalNotes || '');
      if (currentConv.linkedTrackingId) {
        setSidebarTrackingSearch(currentConv.linkedTrackingId);
        lookupSidebarConsignment(currentConv.linkedTrackingId);
      }
    }

    async function loadMessages() {
      try {
        const res = await fetch(`/api/chat/conversations/${selectedConvId}`);
        const json = await res.json();
        if (json.success) {
          setActiveMessages(json.messages || []);
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);

          // Mark read by agent
          fetch(`/api/chat/conversations/${selectedConvId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markReadBy: 'agent' })
          }).catch(() => {});
        }
      } catch (err) {
        console.error('Failed to fetch messages for conversation:', err);
      }
    }

    loadMessages();
  }, [selectedConvId]);

  // ── Send Agent Reply ──
  const handleSendReply = async (textToSend?: string) => {
    const content = (textToSend || replyText).trim();
    if (!content || !selectedConvId || isSending) return;

    setIsSending(true);
    if (!textToSend) setReplyText('');

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversationId: selectedConvId,
      sender: 'agent',
      senderName: 'David M. (Operations)',
      text: content,
      timestamp: new Date().toISOString(),
      read: true
    };

    setActiveMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConvId,
          sender: 'agent',
          senderName: 'David M. (Operations)',
          text: content
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setActiveMessages((prev) => prev.map((m) => (m.id === tempId ? json.data : m)));

        // Update conversation in state
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedConvId ? json.conversation : c))
        );

        // Broadcast to customer in open tabs
        broadcastChannelRef.current?.postMessage({
          type: 'NEW_MESSAGE',
          data: { message: json.data, conversation: json.conversation }
        });
      }
    } catch (err) {
      console.error('Failed to post agent reply:', err);
    } finally {
      setIsSending(false);
      setTimeout(() => replyInputRef.current?.focus(), 50);
    }
  };

  // ── Status Update ──
  const handleUpdateStatus = async (newStatus: ConversationStatus) => {
    if (!selectedConvId) return;
    try {
      const res = await fetch(`/api/chat/conversations/${selectedConvId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const json = await res.json();
      if (json.success) {
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedConvId ? { ...c, status: newStatus } : c))
        );
        broadcastChannelRef.current?.postMessage({
          type: 'CONVERSATION_UPDATED',
          data: { conversation: json.data }
        });
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // ── Save Notes ──
  const handleSaveNotes = async () => {
    if (!selectedConvId) return;
    setIsSavingNotes(true);
    try {
      await fetch(`/api/chat/conversations/${selectedConvId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: agentNotes,
          linkedTrackingId: sidebarTrackingSearch.trim() || undefined
        })
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConvId
            ? { ...c, internalNotes: agentNotes, linkedTrackingId: sidebarTrackingSearch.trim() }
            : c
        )
      );
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // ── Lookup Consignment in Sidebar ──
  const lookupSidebarConsignment = async (id: string) => {
    if (!id.trim()) {
      setSidebarConsignmentResult(null);
      return;
    }
    try {
      const res = await fetch(`/api/consignments/${encodeURIComponent(id.trim().toUpperCase())}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSidebarConsignmentResult(json.data);
      } else {
        setSidebarConsignmentResult(null);
      }
    } catch {
      setSidebarConsignmentResult(null);
    }
  };

  // ── Reset Chat Seed Data ──
  const handleResetChatStore = async () => {
    if (!confirm('Restore default operations CRM demo conversations and inquiries?')) return;
    try {
      const res = await fetch('/api/chat/reset', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setConversations(json.data);
        if (json.data.length > 0) {
          setSelectedConvId(json.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to reset chat store:', err);
    }
  };

  // ── Export Chat Transcript ──
  const handleExportTranscript = () => {
    if (!selectedConversation) return;
    const lines = [
      `=================================================================`,
      `NAVITHON LOGISTICS OPERATIONS — CHAT TRANSCRIPT`,
      `Session ID: ${selectedConversation.id}`,
      `Customer: ${selectedConversation.visitorName} (${selectedConversation.visitorCompany || 'Direct Client'})`,
      `Location: ${selectedConversation.visitorLocation}`,
      `Assigned Agent: ${selectedConversation.assignedAgent}`,
      `Date: ${new Date(selectedConversation.createdAt).toLocaleString()}`,
      `=================================================================\n`
    ];

    activeMessages.forEach((m) => {
      lines.push(`[${new Date(m.timestamp).toLocaleTimeString()}] ${m.senderName}: ${m.text}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `navithon-chat-${selectedConversation.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Consignments Tab Logic (Tab 2) ──
  const fetchConsignments = async () => {
    try {
      setIsLoadingConsignments(true);
      const res = await fetch('/api/consignments');
      const json = await res.json();
      if (json.success) {
        setConsignments(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch consignments:', err);
    } finally {
      setIsLoadingConsignments(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'CONSIGNMENTS') {
      fetchConsignments();
    }
  }, [activeTab]);

  const openUpdateModal = (c: Consignment) => {
    setSelectedConsignment(c);
    setModalStatus(c.status);
    setCheckpointTitle(`Status update: ${getStatusLabel(c.status)}`);
    setCheckpointLocation(c.currentLocation);
    setCheckpointFacility('');
    setCheckpointDescription(`Telemetry event recorded at ${c.currentLocation}.`);
    setIsModalOpen(true);
  };

  const submitCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsignment) return;

    try {
      setIsSubmittingCheckpoint(true);
      const res = await fetch(`/api/consignments/${selectedConsignment.trackingId}/checkpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: modalStatus,
          title: checkpointTitle,
          location: checkpointLocation,
          description: checkpointDescription,
          facility: checkpointFacility
        })
      });
      const json = await res.json();
      if (json.success) {
        setConsignments((prev) =>
          prev.map((c) => (c.trackingId === selectedConsignment.trackingId ? json.data : c))
        );
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to submit checkpoint:', err);
    } finally {
      setIsSubmittingCheckpoint(false);
    }
  };

  // ── Computed Filtered Conversations ──
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      // Status filter
      if (statusFilter === 'WAITING') {
        if (conv.unreadCountAgent === 0 || conv.status === 'RESOLVED') return false;
      } else if (statusFilter !== 'ALL') {
        if (conv.status !== statusFilter) return false;
      }

      // Search filter
      if (chatSearch.trim()) {
        const q = chatSearch.toLowerCase();
        const matchesName = conv.visitorName.toLowerCase().includes(q);
        const matchesCompany = (conv.visitorCompany || '').toLowerCase().includes(q);
        const matchesLocation = conv.visitorLocation.toLowerCase().includes(q);
        const matchesTracking = (conv.linkedTrackingId || '').toLowerCase().includes(q);
        const matchesLastMsg = conv.lastMessageText.toLowerCase().includes(q);
        return matchesName || matchesCompany || matchesLocation || matchesTracking || matchesLastMsg;
      }
      return true;
    });
  }, [conversations, statusFilter, chatSearch]);

  const selectedConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConvId) || null;
  }, [conversations, selectedConvId]);

  // Aggregate Metrics
  const activeChatsCount = useMemo(() => {
    return conversations.filter((c) => c.status === 'ACTIVE').length;
  }, [conversations]);

  const waitingChatsCount = useMemo(() => {
    return conversations.filter((c) => c.unreadCountAgent > 0 && c.status !== 'RESOLVED').length;
  }, [conversations]);

  const resolvedChatsCount = useMemo(() => {
    return conversations.filter((c) => c.status === 'RESOLVED').length;
  }, [conversations]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080808',
        color: '#FFFFFF',
        fontFamily: 'var(--font-sans)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Top Operations Command Bar ── */}
      <header
        style={{
          height: '70px',
          background: 'rgba(13, 13, 13, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Left: Brand & Operations Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #FF6B35 0%, #E85A24 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(255, 107, 53, 0.4)',
              }}
            >
              <Shield size={18} color="#FFFFFF" />
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.05rem',
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  lineHeight: 1.1,
                }}
              >
                NAVITHON OPERATIONS
              </div>
              <div
                style={{
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--accent-orange)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                AGENT LIVE CHAT CRM & DISPATCH
              </div>
            </div>
          </div>

          <div
            style={{
              height: '28px',
              width: '1px',
              background: 'rgba(255, 255, 255, 0.1)',
            }}
          />

          {/* Tab Switcher: Chat CRM vs Consignments Hub */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '10px',
              padding: '3px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <button
              onClick={() => setActiveTab('CHAT_CRM')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'CHAT_CRM' ? 'rgba(255, 107, 53, 0.15)' : 'transparent',
                color: activeTab === 'CHAT_CRM' ? 'var(--accent-orange)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <MessageSquare size={14} />
              <span>LIVE CUSTOMER CRM</span>
              {waitingChatsCount > 0 && (
                <span
                  style={{
                    background: '#FF6B35',
                    color: '#FFFFFF',
                    borderRadius: '9999px',
                    padding: '1px 6px',
                    fontSize: '0.68rem',
                  }}
                >
                  {waitingChatsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('CONSIGNMENTS')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'CONSIGNMENTS' ? 'rgba(255, 107, 53, 0.15)' : 'transparent',
                color: activeTab === 'CONSIGNMENTS' ? 'var(--accent-orange)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Package size={14} />
              <span>FREIGHT CONSIGNMENTS</span>
            </button>
          </div>
        </div>

        {/* Right: Agent Status, Audio Toggle, Reset Demo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Real-time metrics counters */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              paddingRight: '16px',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                ACTIVE CHATS
              </div>
              <div style={{ fontSize: '0.95rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent-orange)' }}>
                {activeChatsCount}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                IN QUEUE
              </div>
              <div
                style={{
                  fontSize: '0.95rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  color: waitingChatsCount > 0 ? '#F43F5E' : 'var(--accent-emerald)',
                }}
              >
                {waitingChatsCount}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                RESOLVED
              </div>
              <div style={{ fontSize: '0.95rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-secondary)' }}>
                {resolvedChatsCount}
              </div>
            </div>
          </div>

          {/* Sound Alert Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute audio notification chimes' : 'Enable audio notification chimes'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: soundEnabled ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {soundEnabled ? <Volume2 size={15} color="#10B981" /> : <VolumeX size={15} />}
            <span>{soundEnabled ? 'ALERTS ON' : 'MUTED'}</span>
          </button>

          {/* Reset Demo Data */}
          <button
            onClick={handleResetChatStore}
            title="Restore sample demonstration chats"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            <RotateCcw size={14} />
            <span>RESET DEMO</span>
          </button>

          {/* Agent Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(255, 107, 53, 0.08)',
              padding: '5px 12px',
              borderRadius: '30px',
              border: '1px solid rgba(255, 107, 53, 0.25)',
            }}
          >
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: '#FF6B35',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#FFFFFF',
              }}
            >
              DM
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.1 }}>David M.</div>
              <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)' }}>
                DISPATCH CONTROLLER
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════
          TAB 1: LIVE CUSTOMER CHAT CRM (3-COLUMN WORKSPACE)
          ════════════════════════════════════════════════════════════ */}
      {activeTab === 'CHAT_CRM' && (
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '320px 1fr 340px',
            height: 'calc(100vh - 70px)',
            overflow: 'hidden',
          }}
        >
          {/* ── COLUMN 1: INBOX CONVERSATIONS LIST ── */}
          <aside
            style={{
              background: '#0D0D0D',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
            }}
          >
            {/* Inbox Filter & Search */}
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(20, 20, 20, 0.5)',
              }}
            >
              {/* Search Bar */}
              <div
                style={{
                  position: 'relative',
                  marginBottom: '12px',
                }}
              >
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="Search customer, company, ID..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Status Filter Chips */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                }}
              >
                {[
                  { key: 'ALL', label: 'All' },
                  { key: 'WAITING', label: 'Needs Reply' },
                  { key: 'ACTIVE', label: 'Active' },
                  { key: 'RESOLVED', label: 'Resolved' },
                ].map((tab) => {
                  const isActive = statusFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setStatusFilter(tab.key as typeof statusFilter)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-mono)',
                        border: 'none',
                        background: isActive ? 'var(--accent-orange)' : 'rgba(255, 255, 255, 0.05)',
                        color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        fontWeight: isActive ? 700 : 500,
                        transition: 'all 0.15s',
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conversation Cards Feed */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {isLoadingChats ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading incoming dispatch chats...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No conversations match filter criteria.
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = conv.id === selectedConvId;
                  const hasUnread = conv.unreadCountAgent > 0;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConvId(conv.id)}
                      style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background: isSelected
                          ? 'rgba(255, 107, 53, 0.08)'
                          : hasUnread
                          ? 'rgba(255, 255, 255, 0.02)'
                          : 'transparent',
                        borderLeft: isSelected
                          ? '3px solid var(--accent-orange)'
                          : hasUnread
                          ? '3px solid var(--accent-cyan)'
                          : '3px solid transparent',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = hasUnread
                            ? 'rgba(255, 255, 255, 0.02)'
                            : 'transparent';
                        }
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              color: isSelected ? '#FFFFFF' : '#E5E5E5',
                            }}
                          >
                            {conv.visitorName}
                          </span>
                          {conv.status === 'RESOLVED' && (
                            <span
                              style={{
                                fontSize: '0.62rem',
                                fontFamily: 'var(--font-mono)',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10B981',
                              }}
                            >
                              RESOLVED
                            </span>
                          )}
                        </div>

                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontFamily: 'var(--font-mono)',
                            color: hasUnread ? 'var(--accent-orange)' : 'var(--text-muted)',
                            fontWeight: hasUnread ? 700 : 400,
                          }}
                        >
                          {new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Company or Location Subtitle */}
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                          marginBottom: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {conv.visitorCompany ? (
                          <>
                            <Building2 size={12} />
                            <span>{conv.visitorCompany}</span>
                          </>
                        ) : (
                          <>
                            <MapPin size={12} />
                            <span>{conv.visitorLocation}</span>
                          </>
                        )}
                      </div>

                      {/* Last Message Snippet */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: '0.78rem',
                            color: hasUnread ? '#FFFFFF' : 'var(--text-secondary)',
                            fontWeight: hasUnread ? 600 : 400,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                          }}
                        >
                          {conv.lastMessageText}
                        </p>

                        {hasUnread && (
                          <span
                            style={{
                              background: '#FF6B35',
                              color: '#FFFFFF',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '9999px',
                              flexShrink: 0,
                            }}
                          >
                            {conv.unreadCountAgent} new
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* ── COLUMN 2: ACTIVE CONVERSATION & REPLY DESK ── */}
          <main
            style={{
              background: '#090909',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
            }}
          >
            {selectedConversation ? (
              <>
                {/* Active Chat Top Bar */}
                <div
                  style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(15, 15, 15, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #222 0%, #333 100%)',
                        border: '1.5px solid rgba(255, 107, 53, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        color: 'var(--accent-orange)',
                      }}
                    >
                      {selectedConversation.visitorName.slice(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                          {selectedConversation.visitorName}
                        </h2>
                        {selectedConversation.linkedTrackingId && (
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'rgba(255, 107, 53, 0.15)',
                              color: 'var(--accent-orange)',
                              border: '1px solid rgba(255, 107, 53, 0.3)',
                            }}
                          >
                            AWB: {selectedConversation.linkedTrackingId}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          fontSize: '0.74rem',
                          color: 'var(--text-muted)',
                          marginTop: '2px',
                        }}
                      >
                        <span>{selectedConversation.visitorCompany || 'Direct Logistics Inquiry'}</span>
                        <span>•</span>
                        <span>{selectedConversation.visitorLocation}</span>
                        <span>•</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>
                          Active page: {selectedConversation.currentPage}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Status Dropdown & Transcript Export */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Status Changer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        STATUS:
                      </span>
                      <select
                        value={selectedConversation.status}
                        onChange={(e) => handleUpdateStatus(e.target.value as ConversationStatus)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color:
                            selectedConversation.status === 'ACTIVE'
                              ? '#FF6B35'
                              : selectedConversation.status === 'RESOLVED'
                              ? '#10B981'
                              : '#F59E0B',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="ACTIVE" style={{ background: '#111', color: '#FF6B35' }}>
                          ● ACTIVE CHAT
                        </option>
                        <option value="PENDING" style={{ background: '#111', color: '#F59E0B' }}>
                          ● WAITING ON CUSTOMER
                        </option>
                        <option value="RESOLVED" style={{ background: '#111', color: '#10B981' }}>
                          ✓ RESOLVED & CLOSED
                        </option>
                      </select>
                    </div>

                    {/* Export transcript */}
                    <button
                      onClick={handleExportTranscript}
                      title="Download chat transcript log"
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Download size={14} />
                      <span>EXPORT</span>
                    </button>
                  </div>
                </div>

                {/* Messages Stream */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  {activeMessages.map((msg) => {
                    const isAgent = msg.sender === 'agent';

                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isAgent ? 'flex-end' : 'flex-start',
                          maxWidth: '75%',
                          alignSelf: isAgent ? 'flex-end' : 'flex-start',
                        }}
                      >
                        {/* Header label */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '4px',
                            fontSize: '0.68rem',
                            fontFamily: 'var(--font-mono)',
                            color: isAgent ? 'var(--accent-orange)' : 'var(--accent-cyan)',
                          }}
                        >
                          <span style={{ fontWeight: 700 }}>
                            {isAgent ? 'David M. (Operations Agent)' : msg.senderName}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Bubble */}
                        <div
                          style={{
                            padding: '12px 18px',
                            borderRadius: isAgent ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            background: isAgent
                              ? 'linear-gradient(135deg, rgba(255, 107, 53, 0.25) 0%, rgba(200, 75, 30, 0.18) 100%)'
                              : 'rgba(24, 24, 24, 0.95)',
                            border: isAgent
                              ? '1px solid rgba(255, 107, 53, 0.4)'
                              : '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#FFFFFF',
                            fontSize: '0.92rem',
                            lineHeight: 1.5,
                            wordBreak: 'break-word',
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                          }}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Canned Responses Tray (Toggleable) */}
                <div
                  style={{
                    padding: '8px 20px',
                    background: 'rgba(15, 15, 15, 0.9)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--accent-orange)',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Sparkles size={12} />
                    CANNED RESPONSES:
                  </span>

                  {cannedResponses.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSendReply(item.content)}
                      title={item.content}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-orange)';
                        e.currentTarget.style.color = '#FFFFFF';
                        e.currentTarget.style.background = 'rgba(255, 107, 53, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      }}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>

                {/* Reply Composer Box */}
                <div
                  style={{
                    padding: '16px 20px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(12, 12, 12, 0.98)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, position: 'relative' }}>
                    <textarea
                      ref={replyInputRef}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                      placeholder={`Reply to ${selectedConversation.visitorName} as David M. (Enter to send, Shift+Enter for newline)...`}
                      rows={2}
                      disabled={isSending}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#FFFFFF',
                        fontSize: '0.9rem',
                        outline: 'none',
                        resize: 'none',
                        fontFamily: 'inherit',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = 'var(--accent-orange)')}
                      onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
                    />
                  </div>

                  <button
                    onClick={() => handleSendReply()}
                    disabled={!replyText.trim() || isSending}
                    style={{
                      height: '48px',
                      padding: '0 20px',
                      borderRadius: '12px',
                      background: replyText.trim() && !isSending
                        ? 'linear-gradient(135deg, #FF6B35 0%, #E85A24 100%)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      cursor: replyText.trim() && !isSending ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: replyText.trim() && !isSending ? '0 4px 18px rgba(255, 107, 53, 0.35)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span>SEND</span>
                    <Send size={15} />
                  </button>
                </div>
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '16px',
                  color: 'var(--text-muted)',
                }}
              >
                <MessageSquare size={48} strokeWidth={1.2} />
                <p style={{ margin: 0, fontSize: '0.95rem' }}>Select an incoming customer conversation to begin dispatch</p>
              </div>
            )}
          </main>

          {/* ── COLUMN 3: CUSTOMER DOSSIER & SHIPMENT TELEMETRY ── */}
          <aside
            style={{
              background: '#0D0D0D',
              borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
              height: '100%',
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {selectedConversation ? (
              <>
                {/* Section: Visitor Telemetry */}
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: 'var(--accent-orange)',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      marginBottom: '12px',
                    }}
                  >
                    01 • Visitor Telemetry
                  </div>

                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        VISITOR ID
                      </div>
                      <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: '#FFFFFF' }}>
                        {selectedConversation.visitorId}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        GEOGRAPHIC ORIGIN
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#FFFFFF' }}>
                        {selectedConversation.visitorLocation}
                      </div>
                    </div>

                    {selectedConversation.visitorEmail && (
                      <div>
                        <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          EMAIL ADDRESS
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)' }}>
                          {selectedConversation.visitorEmail}
                        </div>
                      </div>
                    )}

                    <div>
                      <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        ACTIVE WEBSITE PAGE
                      </div>
                      <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)' }}>
                        {selectedConversation.currentPage}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        FIRST CONNECTED
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {new Date(selectedConversation.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Live Shipment Telemetry Lookup */}
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: 'var(--accent-orange)',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      marginBottom: '12px',
                    }}
                  >
                    02 • Shipment Telemetry Lookup
                  </div>

                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      padding: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                      <input
                        type="text"
                        value={sidebarTrackingSearch}
                        onChange={(e) => setSidebarTrackingSearch(e.target.value)}
                        placeholder="Tracking ID (NVT-882194)..."
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#FFFFFF',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => lookupSidebarConsignment(sidebarTrackingSearch)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: 'var(--accent-orange)',
                          border: 'none',
                          color: '#FFFFFF',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        PULL
                      </button>
                    </div>

                    {sidebarConsignmentResult ? (
                      <div
                        style={{
                          background: 'rgba(255, 107, 53, 0.05)',
                          border: '1px solid rgba(255, 107, 53, 0.2)',
                          borderRadius: '8px',
                          padding: '10px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '6px',
                          }}
                        >
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 800 }}>
                            {sidebarConsignmentResult.trackingId}
                          </span>
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontFamily: 'var(--font-mono)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: getStatusColor(sidebarConsignmentResult.status).bg,
                              color: getStatusColor(sidebarConsignmentResult.status).text,
                              border: `1px solid ${getStatusColor(sidebarConsignmentResult.status).border}`,
                              fontWeight: 700,
                            }}
                          >
                            {getStatusLabel(sidebarConsignmentResult.status)}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          Route: <strong>{sidebarConsignmentResult.originLocation}</strong> →{' '}
                          <strong>{sidebarConsignmentResult.destinationLocation}</strong>
                        </div>

                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Location: {sidebarConsignmentResult.currentLocation}
                        </div>

                        <button
                          onClick={() => {
                            const snippet = `Consignment ${sidebarConsignmentResult.trackingId} (${sidebarConsignmentResult.originLocation} → ${sidebarConsignmentResult.destinationLocation}) is currently ${getStatusLabel(sidebarConsignmentResult.status)} at ${sidebarConsignmentResult.currentLocation}. Expected delivery: ${new Date(sidebarConsignmentResult.estimatedDelivery).toLocaleDateString()}.`;
                            handleSendReply(snippet);
                          }}
                          style={{
                            width: '100%',
                            marginTop: '10px',
                            padding: '6px',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: 'var(--accent-orange)',
                            fontSize: '0.7rem',
                            fontFamily: 'var(--font-mono)',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          INSERT TELEMETRY INTO CHAT
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                        Enter tracking ID above to pull real-time route info.
                      </div>
                    )}
                  </div>
                </div>

                {/* Section: Internal Private Notes */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: 'var(--accent-orange)',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      marginBottom: '12px',
                    }}
                  >
                    03 • Internal Operations Notes
                  </div>

                  <textarea
                    value={agentNotes}
                    onChange={(e) => setAgentNotes(e.target.value)}
                    placeholder="Private notes (only visible to dispatch team)..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#FFFFFF',
                      fontSize: '0.8rem',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      marginBottom: '8px',
                    }}
                  />

                  <button
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    style={{
                      alignSelf: 'flex-end',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: '0.74rem',
                      fontFamily: 'var(--font-mono)',
                      cursor: isSavingNotes ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Check size={13} />
                    <span>{isSavingNotes ? 'SAVING...' : 'SAVE NOTES'}</span>
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '60px', fontSize: '0.85rem' }}>
                No active session selected.
              </div>
            )}
          </aside>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB 2: FREIGHT CONSIGNMENTS & TELEMETRY HUB
          ════════════════════════════════════════════════════════════ */}
      {activeTab === 'CONSIGNMENTS' && (
        <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>
                Freight Consignments Telemetry
              </h1>
              <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                Monitor active air cargo, ocean containers, customs inspections, and ground fleets.
              </p>
            </div>

            {/* Consignments Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative', width: '260px' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  value={consignmentSearch}
                  onChange={(e) => setConsignmentSearch(e.target.value)}
                  placeholder="Filter tracking ID or city..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    outline: 'none',
                  }}
                />
              </div>

              <select
                value={consignmentStatusFilter}
                onChange={(e) => setConsignmentStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL" style={{ background: '#111' }}>ALL STATUSES</option>
                <option value="ORDER_CREATED" style={{ background: '#111' }}>BOOKING CREATED</option>
                <option value="RECEIVED_AT_FACILITY" style={{ background: '#111' }}>RECEIVED AT FACILITY</option>
                <option value="DEPARTED_FACILITY" style={{ background: '#111' }}>DEPARTED FACILITY</option>
                <option value="IN_TRANSIT" style={{ background: '#111' }}>IN TRANSIT</option>
                <option value="CUSTOMS_CLEARANCE" style={{ background: '#111' }}>CUSTOMS CLEARANCE</option>
                <option value="OUT_FOR_DELIVERY" style={{ background: '#111' }}>OUT FOR DELIVERY</option>
                <option value="DELIVERED" style={{ background: '#111' }}>DELIVERED</option>
                <option value="EXCEPTION_ON_HOLD" style={{ background: '#111' }}>EXCEPTION ON HOLD</option>
              </select>
            </div>
          </div>

          {/* Consignments Table */}
          <div
            style={{
              background: 'rgba(20, 20, 20, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '14px 20px' }}>Tracking ID</th>
                  <th style={{ padding: '14px 20px' }}>Mode / Service</th>
                  <th style={{ padding: '14px 20px' }}>Origin → Destination</th>
                  <th style={{ padding: '14px 20px' }}>Current Telemetry</th>
                  <th style={{ padding: '14px 20px' }}>Status</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {consignments
                  .filter((c) => {
                    if (consignmentStatusFilter !== 'ALL' && c.status !== consignmentStatusFilter) return false;
                    if (consignmentSearch.trim()) {
                      const q = consignmentSearch.toLowerCase();
                      const matchesId = c.trackingId.toLowerCase().includes(q);
                      const matchesOrigin = c.originLocation.toLowerCase().includes(q);
                      const matchesDest = c.destinationLocation.toLowerCase().includes(q);
                      return matchesId || matchesOrigin || matchesDest;
                    }
                    return true;
                  })
                  .map((c) => {
                    const statusColor = getStatusColor(c.status);
                    return (
                    <tr
                      key={c.trackingId}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.2s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '16px 20px', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                        <Link
                          href={`/track?id=${c.trackingId}`}
                          target="_blank"
                          style={{
                            color: 'var(--accent-orange)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {c.trackingId}
                          <ExternalLink size={12} />
                        </Link>
                      </td>

                      <td style={{ padding: '16px 20px', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 600 }}>{c.transportMode.replace('_', ' ')}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.serviceTier.replace('_', ' ')}</div>
                      </td>

                      <td style={{ padding: '16px 20px', fontSize: '0.85rem' }}>
                        <div>
                          <strong>{c.originLocation}</strong> →{' '}
                          <strong>{c.destinationLocation}</strong>
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={13} color="var(--accent-orange)" />
                          <span>{c.currentLocation}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          ETA: {new Date(c.estimatedDelivery).toLocaleDateString()}
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            background: statusColor.bg,
                            color: statusColor.text,
                            border: `1px solid ${statusColor.border}`,
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: statusColor.dot,
                            }}
                          />
                          {getStatusLabel(c.status)}
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <button
                          onClick={() => openUpdateModal(c)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: '#FFFFFF',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent-orange)';
                            e.currentTarget.style.color = 'var(--accent-orange)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                            e.currentTarget.style.color = '#FFFFFF';
                          }}
                        >
                          <PlusCircle size={14} />
                          <span>CHECKPOINT</span>
                        </button>
                      </td>
                    </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Checkpoint Update Modal (for Consignments tab) ── */}
      {isModalOpen && selectedConsignment && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '520px',
              maxWidth: '100%',
              background: '#121212',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '20px',
              padding: '28px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.9)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Record Telemetry Checkpoint</h3>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-orange)', marginTop: '2px' }}>
                  CONSIGNMENT: {selectedConsignment.trackingId}
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitCheckpoint} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  NEW SHIPMENT STATUS
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value as ShipmentStatus)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="ORDER_CREATED" style={{ background: '#111' }}>BOOKING CREATED</option>
                  <option value="RECEIVED_AT_FACILITY" style={{ background: '#111' }}>RECEIVED AT ORIGIN TERMINAL</option>
                  <option value="DEPARTED_FACILITY" style={{ background: '#111' }}>DEPARTED ORIGIN TERMINAL</option>
                  <option value="IN_TRANSIT" style={{ background: '#111' }}>IN TRANSIT</option>
                  <option value="CUSTOMS_CLEARANCE" style={{ background: '#111' }}>CUSTOMS PROCESSING</option>
                  <option value="OUT_FOR_DELIVERY" style={{ background: '#111' }}>OUT FOR DELIVERY</option>
                  <option value="DELIVERED" style={{ background: '#111' }}>DELIVERED</option>
                  <option value="EXCEPTION_ON_HOLD" style={{ background: '#111' }}>ON HOLD / EXCEPTION</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  CHECKPOINT TITLE
                </label>
                <input
                  type="text"
                  value={checkpointTitle}
                  onChange={(e) => setCheckpointTitle(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  LOCATION / TERMINAL FACILITY
                </label>
                <input
                  type="text"
                  value={checkpointLocation}
                  onChange={(e) => setCheckpointLocation(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  DESCRIPTION & DISPATCH LOG
                </label>
                <textarea
                  value={checkpointDescription}
                  onChange={(e) => setCheckpointDescription(e.target.value)}
                  rows={3}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingCheckpoint}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    background: 'var(--accent-orange)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isSubmittingCheckpoint ? 'Broadcasting...' : 'Broadcast Checkpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
