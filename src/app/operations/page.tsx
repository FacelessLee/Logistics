'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  ChevronRight,
  Mail,
  Trash2,
  AlertTriangle,
  Eye,
  CheckCircle,
  FileText,
  RefreshCw,
  Camera,
  ChevronLeft,
  Info,
  ArrowLeft
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

interface EmailOutboxItem {
  id: string;
  trackingId: string;
  type: 'CONSIGNMENT_CONFIRMATION' | 'STATUS_UPDATE' | 'MANUAL_REPORT';
  to: string[];
  subject: string;
  timestamp: string;
  success: boolean;
  resendId?: string;
  error?: string;
  hasAttachment: boolean;
  previewHtml?: string;
}

export default function OperationsPortalPage() {
  const [activeTab, setActiveTab] = useState<'CHAT_CRM' | 'CONSIGNMENTS' | 'EMAIL_DELIVERABILITY'>('CHAT_CRM');
  const [mobileChatView, setMobileChatView] = useState<'INBOX' | 'CONVERSATION' | 'INFO'>('INBOX');
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
  const [isPurgingChat, setIsPurgingChat] = useState(false);
  const [purgeNotice, setPurgeNotice] = useState<string | null>(null);

  // ── Logistics Telemetry Lookup in Sidebar ──
  const [sidebarTrackingSearch, setSidebarTrackingSearch] = useState('');
  const [sidebarConsignmentResult, setSidebarConsignmentResult] = useState<Consignment | null>(null);

  // ── Consignments Hub State (Tab 2) ──
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [isLoadingConsignments, setIsLoadingConsignments] = useState(false);
  const [consignmentSearch, setConsignmentSearch] = useState('');
  const [consignmentStatusFilter, setConsignmentStatusFilter] = useState('ALL');

  // ── Outbox & Deliverability Hub State (Tab 3) ──
  const [outboxItems, setOutboxItems] = useState<EmailOutboxItem[]>([]);
  const [isLoadingOutbox, setIsLoadingOutbox] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string; resendId?: string } | null>(null);
  const [previewItem, setPreviewItem] = useState<EmailOutboxItem | null>(null);

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
            setActiveMessages((prev) => {
              const inFlight = prev.filter((m) => m.id.startsWith('temp-'));
              if (inFlight.length === 0) return msgJson.data;
              const serverIds = new Set(msgJson.data.map((m: ChatMessage) => m.id));
              return [...msgJson.data, ...inFlight.filter((m) => !serverIds.has(m.id))];
            });
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

  // ── Refresh Live Operations Data ──
  const handleRefreshAll = async () => {
    try {
      await Promise.allSettled([fetchConversations(), fetchConsignments()]);
    } catch (err) {
      console.error('Failed to refresh operations data:', err);
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

  const fetchOutbox = useCallback(async () => {
    try {
      setIsLoadingOutbox(true);
      const res = await fetch('/api/email/outbox');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setOutboxItems(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch email outbox:', err);
    } finally {
      setIsLoadingOutbox(false);
    }
  }, []);

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailAddress || !testEmailAddress.includes('@')) return;
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmailAddress.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: data.message, resendId: data.resendId });
        fetchOutbox();
      } else {
        setTestResult({ success: false, error: data.error || 'Failed to dispatch test email' });
      }
    } catch (err: unknown) {
      setTestResult({ success: false, error: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handlePurgeAllChats = async () => {
    if (!window.confirm('Are you sure you want to purge all customer conversations and clear all chat history? Real visitors will get fresh new sessions.')) return;
    setIsPurgingChat(true);
    try {
      const res = await fetch('/api/chat/conversations', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setConversations([]);
        setSelectedConvId(null);
        setActiveMessages([]);
        setPurgeNotice('All customer chat conversations purged successfully.');
        setTimeout(() => setPurgeNotice(null), 4000);
      }
    } catch (err) {
      console.error('Failed to purge chat data:', err);
    } finally {
      setIsPurgingChat(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'CONSIGNMENTS') {
      fetchConsignments();
    } else if (activeTab === 'EMAIL_DELIVERABILITY') {
      fetchOutbox();
    }
  }, [activeTab, fetchOutbox]);

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
        fetchOutbox();
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

  // Computed Filtered Consignments
  const filteredConsignments = useMemo(() => {
    return consignments.filter((c) => {
      if (consignmentStatusFilter !== 'ALL' && c.status !== consignmentStatusFilter) return false;
      if (consignmentSearch.trim()) {
        const q = consignmentSearch.toLowerCase();
        const matchesId = c.trackingId.toLowerCase().includes(q);
        const matchesOrigin = c.originLocation.toLowerCase().includes(q);
        const matchesDest = c.destinationLocation.toLowerCase().includes(q);
        return matchesId || matchesOrigin || matchesDest;
      }
      return true;
    });
  }, [consignments, consignmentStatusFilter, consignmentSearch]);

  return (
    <div
      className="operations-shell"
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
      {/* ── Top Operations Command Bar ── */}
      <header className="operations-header">
        <div className="operations-header-inner">
          {/* Top Brand & Actions Row */}
          <div className="operations-header-top-row">
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
                  flexShrink: 0,
                }}
              >
                <Shield size={18} color="#FFFFFF" />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.02rem',
                    fontWeight: 900,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    lineHeight: 1.1,
                  }}
                >
                  NAVITHON OPERATIONS
                </div>
                <div
                  className="hide-mobile"
                  style={{
                    fontSize: '0.66rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--accent-orange)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  CUSTOMERS / CONSIGNMENTS / DELIVERIES / TRACKING
                </div>
              </div>
            </div>

            {/* Quick Actions (Audio, Refresh, Purge, Agent badge) */}
            <div className="operations-header-actions">
              {/* Real-time metrics counters - visible on desktop/tablet */}
              <div
                className="hide-mobile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  paddingRight: '12px',
                  borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    ACTIVE
                  </div>
                  <div style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent-orange)' }}>
                    {activeChatsCount}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    QUEUE
                  </div>
                  <div
                    style={{
                      fontSize: '0.9rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      color: waitingChatsCount > 0 ? '#F43F5E' : 'var(--accent-emerald)',
                    }}
                  >
                    {waitingChatsCount}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    RESOLVED
                  </div>
                  <div style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-secondary)' }}>
                    {resolvedChatsCount}
                  </div>
                </div>
              </div>

              {/* Sound Alert Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? 'Mute audio notification chimes' : 'Enable audio notification chimes'}
                className="operations-tool-btn"
              >
                {soundEnabled ? <Volume2 size={15} color="#10B981" /> : <VolumeX size={15} />}
                <span className="hide-mobile">{soundEnabled ? 'ALERTS ON' : 'MUTED'}</span>
              </button>

              {/* Refresh Operations Data */}
              <button
                onClick={handleRefreshAll}
                title="Refresh active inquiries and consignments"
                className="operations-tool-btn"
              >
                <RotateCcw size={14} />
                <span className="hide-mobile">REFRESH</span>
              </button>

              {/* Purge All Chats */}
              <button
                onClick={handlePurgeAllChats}
                disabled={isPurgingChat}
                title="Purge all customer chat records and reset to clean state"
                className="operations-tool-btn operations-tool-btn-danger"
              >
                <Trash2 size={13} />
                <span className="hide-mobile">{isPurgingChat ? 'PURGING...' : 'PURGE'}</span>
              </button>

              {/* Agent Badge */}
              <div className="operations-agent-badge">
                <div className="operations-agent-avatar">DM</div>
                <div className="hide-mobile">
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.1 }}>David M.</div>
                  <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)' }}>
                    DISPATCH
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="operations-tabs-container">
            <button
              onClick={() => {
                setActiveTab('CHAT_CRM');
                setMobileChatView('INBOX');
              }}
              className={`operations-tab-btn ${activeTab === 'CHAT_CRM' ? 'active' : ''}`}
            >
              <MessageSquare size={14} />
              <span>CUSTOMER INBOX</span>
              {waitingChatsCount > 0 && (
                <span className="operations-tab-badge">
                  {waitingChatsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('CONSIGNMENTS')}
              className={`operations-tab-btn ${activeTab === 'CONSIGNMENTS' ? 'active' : ''}`}
            >
              <Package size={14} />
              <span>SHIPMENTS & DELIVERY</span>
            </button>

            <button
              onClick={() => setActiveTab('EMAIL_DELIVERABILITY')}
              className={`operations-tab-btn ${activeTab === 'EMAIL_DELIVERABILITY' ? 'active email' : ''}`}
            >
              <Mail size={14} />
              <span>OUTBOX &amp; EMAIL</span>
              {outboxItems.length > 0 && (
                <span className="operations-tab-badge email">
                  {outboxItems.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════
          TAB 1: LIVE CUSTOMER CHAT CRM (3-COLUMN WORKSPACE)
          ════════════════════════════════════════════════════════════ */}
      {activeTab === 'CHAT_CRM' && (
        <div className="operations-chat-layout">
          {/* ── COLUMN 1: INBOX CONVERSATIONS LIST ── */}
          <aside
            className={`operations-inbox-col ${mobileChatView === 'INBOX' ? 'mobile-active' : 'mobile-hidden'}`}
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
                      onClick={() => {
                        setSelectedConvId(conv.id);
                        setMobileChatView('CONVERSATION');
                      }}
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
            className={`operations-chat-col ${mobileChatView === 'CONVERSATION' ? 'mobile-active' : 'mobile-hidden'}`}
          >
            {selectedConversation ? (
              <>
                {/* Active Chat Top Bar */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(15, 15, 15, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '180px' }}>
                    {/* Mobile Back to Inbox Button */}
                    <button
                      onClick={() => setMobileChatView('INBOX')}
                      className="operations-tool-btn show-mobile-flex"
                      title="Back to inbox list"
                      style={{ padding: '6px 8px', flexShrink: 0 }}
                    >
                      <ChevronLeft size={16} />
                      <span>INBOX</span>
                    </button>

                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #222 0%, #333 100%)',
                        border: '1.5px solid rgba(255, 107, 53, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        color: 'var(--accent-orange)',
                        flexShrink: 0,
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

                  {/* Actions: Status Dropdown, Mobile Dossier Toggle & Transcript Export */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Status Changer */}
                    <select
                      value={selectedConversation.status}
                      onChange={(e) => handleUpdateStatus(e.target.value as ConversationStatus)}
                      style={{
                        padding: '6px 10px',
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
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="ACTIVE" style={{ background: '#111', color: '#FF6B35' }}>
                        ● ACTIVE
                      </option>
                      <option value="PENDING" style={{ background: '#111', color: '#F59E0B' }}>
                        ● PENDING
                      </option>
                      <option value="RESOLVED" style={{ background: '#111', color: '#10B981' }}>
                        ✓ RESOLVED
                      </option>
                    </select>

                    {/* Mobile View Dossier Button */}
                    <button
                      onClick={() => setMobileChatView('INFO')}
                      className="operations-tool-btn show-mobile-flex"
                      title="View Customer Dossier & Telemetry"
                    >
                      <Info size={14} color="var(--accent-orange)" />
                      <span>DOSSIER</span>
                    </button>

                    {/* Export transcript */}
                    <button
                      onClick={handleExportTranscript}
                      title="Download chat transcript log"
                      className="operations-tool-btn hide-mobile"
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
                        {msg.attachment && (
                          <a
                            href={msg.attachment.dataUrl}
                            download={msg.attachment.name}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginTop: '6px',
                              padding: '7px 10px',
                              color: isAgent ? '#FFD9C9' : 'var(--accent-orange)',
                              fontSize: '0.74rem',
                              textDecoration: 'none',
                              background: isAgent ? 'rgba(255, 107, 53, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 107, 53, 0.3)',
                              borderRadius: '8px',
                            }}
                          >
                            <Paperclip size={14} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {msg.attachment.name}
                            </span>
                          </a>
                        )}
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
                <button
                  onClick={() => setMobileChatView('INBOX')}
                  className="btn btn-primary btn-sm show-mobile-flex"
                  style={{ marginTop: '8px' }}
                >
                  <ArrowLeft size={14} />
                  <span>View Customer Inbox</span>
                </button>
              </div>
            )}
          </main>

          {/* ── COLUMN 3: CUSTOMER DOSSIER & SHIPMENT TELEMETRY ── */}
          <aside
            className={`operations-dossier-col ${mobileChatView === 'INFO' ? 'mobile-active' : 'mobile-hidden'}`}
          >
            {/* Mobile Return to Chat Button */}
            <div className="show-mobile" style={{ marginBottom: '10px' }}>
              <button
                onClick={() => setMobileChatView('CONVERSATION')}
                className="operations-tool-btn"
                style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '0.8rem' }}
              >
                <ChevronLeft size={16} />
                <span>RETURN TO CHAT CONVERSATION</span>
              </button>
            </div>
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
        <div className="operations-content-padding" style={{ flex: 1, overflowY: 'auto' }}>
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
              <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800 }}>
                Freight Consignments Telemetry
              </h1>
              <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Monitor active air cargo, ocean containers, customs inspections, and ground fleets.
              </p>
            </div>

            {/* Consignments Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: '100%', maxWidth: '560px' }}>
              <div style={{ position: 'relative', flex: '1 1 200px' }}>
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
                  flex: '1 1 180px',
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

          {/* Desktop Consignments Table */}
          <div
            className="hide-mobile overflow-touch"
            style={{
              background: 'rgba(20, 20, 20, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              overflow: 'hidden',
              marginBottom: '20px',
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
                {filteredConsignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <Package size={32} strokeWidth={1.5} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.9rem' }}>No freight consignments recorded yet.</span>
                        <Link href="/book" className="btn btn-primary btn-sm" style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <PlusCircle size={14} />
                          <span>Register New Consignment</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredConsignments.map((c) => {
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
                        {c.packageDetails.packageImage && (
                          <div style={{ marginTop: '4px' }}>
                            <span style={{
                              fontSize: '0.65rem',
                              fontFamily: 'var(--font-mono)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'rgba(56, 189, 248, 0.12)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              <Camera size={10} />
                              <span>PHOTO VERIFIED</span>
                            </span>
                          </div>
                        )}
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
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <a
                            href={`/api/consignments/${encodeURIComponent(c.trackingId)}/waybill-pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              background: 'rgba(2, 132, 199, 0.12)',
                              border: '1px solid rgba(2, 132, 199, 0.3)',
                              color: '#38bdf8',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.75rem',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s',
                            }}
                            title="Download official Air Waybill PDF"
                          >
                            <Download size={13} />
                            <span>PDF</span>
                          </a>

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
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Consignment Cards View */}
          <div className="show-mobile">
            {filteredConsignments.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(20, 20, 20, 0.5)', borderRadius: '12px' }}>
                <Package size={28} strokeWidth={1.5} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontSize: '0.88rem' }}>No freight consignments match filter.</p>
                <Link href="/book" className="btn btn-primary btn-sm" style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <PlusCircle size={14} />
                  <span>Register Consignment</span>
                </Link>
              </div>
            ) : (
              filteredConsignments.map((c) => {
                const statusColor = getStatusColor(c.status);
                return (
                  <div key={c.trackingId} className="operations-mobile-card">
                    <div className="operations-mobile-card-header">
                      <Link
                        href={`/track?id=${c.trackingId}`}
                        target="_blank"
                        style={{
                          color: 'var(--accent-orange)',
                          textDecoration: 'none',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 800,
                          fontSize: '0.92rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {c.trackingId}
                        <ExternalLink size={12} />
                      </Link>

                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.68rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          background: statusColor.bg,
                          color: statusColor.text,
                          border: `1px solid ${statusColor.border}`,
                        }}
                      >
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: statusColor.dot,
                          }}
                        />
                        {getStatusLabel(c.status)}
                      </span>
                    </div>

                    <div className="operations-mobile-card-route">
                      <span>{c.originLocation}</span>
                      <span style={{ color: 'var(--accent-orange)' }}>→</span>
                      <span>{c.destinationLocation}</span>
                    </div>

                    <div className="operations-mobile-card-meta">
                      <div>Mode: <strong>{c.transportMode.replace('_', ' ')}</strong></div>
                      <div>•</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} color="var(--accent-orange)" />
                        <span>{c.currentLocation}</span>
                      </div>
                      {c.packageDetails.packageImage && (
                        <>
                          <div>•</div>
                          <span style={{
                            fontSize: '0.62rem',
                            fontFamily: 'var(--font-mono)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: 'rgba(56, 189, 248, 0.12)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <Camera size={10} />
                            <span>PHOTO</span>
                          </span>
                        </>
                      )}
                    </div>

                    <div className="operations-mobile-card-actions">
                      <button
                        onClick={() => openUpdateModal(c)}
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, padding: '8px 12px', fontSize: '0.74rem' }}
                      >
                        <PlusCircle size={14} />
                        <span>CHECKPOINT</span>
                      </button>

                      <a
                        href={`/api/consignments/${encodeURIComponent(c.trackingId)}/waybill-pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '8px 12px', fontSize: '0.74rem' }}
                      >
                        <Download size={14} />
                        <span>PDF</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB 3: OUTBOX & REAL-WORLD EMAIL DELIVERABILITY HUB
          ════════════════════════════════════════════════════════════ */}
      {activeTab === 'EMAIL_DELIVERABILITY' && (
        <div className="operations-content-padding" style={{ flex: 1, overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Email Outbox &amp; Deliverability Center
                </h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px' }}>
                Real-time transaction audit and live inbox probe tester.
              </p>
            </div>

            <button
              onClick={fetchOutbox}
              disabled={isLoadingOutbox}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                fontSize: '0.8rem',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={14} />
              <span>{isLoadingOutbox ? 'REFRESHING...' : 'REFRESH LOGS'}</span>
            </button>
          </div>

          {/* Direct Deliverability Probe Card */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{
              background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.8) 0%, rgba(8, 14, 28, 0.95) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '12px',
              padding: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Send size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                    Direct Inbox Deliverability Probe
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Send an instantaneous test waybill to your personal or tester mailbox
                  </div>
                </div>
              </div>

              <form onSubmit={handleSendTestEmail} style={{ marginTop: '16px' }}>
                <div className="outbox-probe-form-row">
                  <input
                    type="email"
                    required
                    placeholder="Enter email (e.g. yourname@gmail.com)"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isSendingTest || !testEmailAddress}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      background: 'var(--accent-orange)',
                      border: 'none',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {isSendingTest ? 'Sending...' : 'Send Live Test'}
                  </button>
                </div>
              </form>

              {testResult && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: testResult.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  border: testResult.success ? '1px solid #10b981' : '1px solid #ef4444',
                  fontSize: '0.82rem',
                  color: testResult.success ? '#34d399' : '#fca5a5'
                }}>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                    {testResult.success ? '✓ Resend Dispatch Confirmed' : '⚠ Dispatch Failed'}
                  </div>
                  <div>{testResult.message || testResult.error}</div>
                  {testResult.resendId && (
                    <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#94a3b8', marginTop: '6px' }}>
                      Resend Message ID: <code>{testResult.resendId}</code>
                    </div>
                  )}
                  {testResult.success && (
                    <div style={{ fontSize: '0.74rem', color: '#bae6fd', marginTop: '8px', borderTop: '1px dashed rgba(56, 189, 248, 0.3)', paddingTop: '6px' }}>
                      💡 <strong>Inbox Placement Advice:</strong> Emails originate from <code>dispatch@navithonlogistics.com</code>. If the email is not in your Primary Inbox within 1 minute, inspect your <strong>Spam / Junk</strong> folder and mark as &quot;Not Spam&quot;.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Outbox Table */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.7) 0%, rgba(8, 14, 28, 0.9) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                Dispatched Outbox Audit Log ({outboxItems.length})
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Durable disk log (.data/outbox.json)
              </span>
            </div>

            {outboxItems.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Mail size={32} style={{ opacity: 0.4, margin: '0 auto 12px' }} />
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No dispatched emails in outbox yet.</div>
                <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                  Book a consignment on <code>/book</code> or send a test probe above to record dispatches.
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Outbox Table */}
                <div className="hide-mobile overflow-touch">
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>TIME</th>
                        <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>TRACKING ID</th>
                        <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>RECIPIENT</th>
                        <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>SUBJECT</th>
                        <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>ATTACHMENT</th>
                        <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>STATUS</th>
                        <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outboxItems.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '12px 20px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                            <small style={{ opacity: 0.6 }}>{new Date(item.timestamp).toLocaleDateString()}</small>
                          </td>
                          <td style={{ padding: '12px 20px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8' }}>
                            <Link href={`/track/${item.trackingId}`} target="_blank" style={{ color: '#38bdf8', textDecoration: 'none' }}>
                              {item.trackingId}
                            </Link>
                          </td>
                          <td style={{ padding: '12px 20px', color: '#FFFFFF', fontWeight: 600 }}>
                            {item.to.join(', ')}
                          </td>
                          <td style={{ padding: '12px 20px', color: 'var(--text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.subject}
                          </td>
                          <td style={{ padding: '12px 20px' }}>
                            {item.hasAttachment ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '0.72rem' }}>
                                <FileText size={12} /> Waybill PDF
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>None</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 20px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '999px',
                              fontSize: '0.7rem',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              background: item.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: item.success ? '#34d399' : '#fca5a5',
                              border: item.success ? '1px solid #10b981' : '1px solid #ef4444'
                            }}>
                              {item.success ? 'DISPATCHED' : 'FAILED'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                            {item.previewHtml && (
                              <button
                                onClick={() => setPreviewItem(item)}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  color: '#FFFFFF',
                                  fontSize: '0.72rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Eye size={12} />
                                <span>Preview</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Outbox Cards */}
                <div className="show-mobile" style={{ padding: '12px' }}>
                  {outboxItems.map((item) => (
                    <div key={item.id} className="operations-mobile-card" style={{ marginBottom: '10px' }}>
                      <div className="operations-mobile-card-header">
                        <Link href={`/track/${item.trackingId}`} target="_blank" style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' }}>
                          {item.trackingId}
                        </Link>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '0.68rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          background: item.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: item.success ? '#34d399' : '#fca5a5',
                          border: item.success ? '1px solid #10b981' : '1px solid #ef4444'
                        }}>
                          {item.success ? 'DISPATCHED' : 'FAILED'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#FFFFFF' }}>
                        {item.subject}
                      </div>

                      <div className="operations-mobile-card-meta">
                        <div>To: <strong>{item.to.join(', ')}</strong></div>
                        <div>•</div>
                        <div>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        {item.hasAttachment && (
                          <>
                            <div>•</div>
                            <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem' }}>
                              <FileText size={11} /> Waybill PDF
                            </span>
                          </>
                        )}
                      </div>

                      {item.previewHtml && (
                        <div className="operations-mobile-card-actions">
                          <button
                            onClick={() => setPreviewItem(item)}
                            className="btn btn-secondary btn-sm"
                            style={{ width: '100%', padding: '8px', fontSize: '0.74rem' }}
                          >
                            <Eye size={13} />
                            <span>Preview Email HTML</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* HTML Preview Modal */}
          {previewItem && previewItem.previewHtml && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '12px'
            }}>
              <div style={{
                background: '#0b1325',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '740px',
                maxHeight: '94vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                      Dispatched Email Preview
                    </h3>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      To: {previewItem.to.join(', ')} | Subject: {previewItem.subject}
                    </div>
                  </div>
                  <button
                    onClick={() => setPreviewItem(null)}
                    style={{ background: 'transparent', border: 'none', color: '#FFFFFF', cursor: 'pointer', fontSize: '1.2rem' }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px', background: '#070d18' }}>
                  <iframe
                    srcDoc={previewItem.previewHtml}
                    title="Email Preview"
                    style={{ width: '100%', height: 'min(70vh, 520px)', border: 'none', borderRadius: '8px' }}
                  />
                </div>
              </div>
            </div>
          )}
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
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '520px',
              maxWidth: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: '#121212',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '20px',
              padding: '20px',
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

              <div style={{
                marginTop: '12px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(2, 132, 199, 0.12)',
                border: '1px solid rgba(2, 132, 199, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.78rem',
                color: '#38bdf8'
              }}>
                <Mail size={15} />
                <span>Broadcasting checkpoint will auto-dispatch real-time status update &amp; waybill PDF to: <strong>Shipper ({selectedConsignment.sender.email})</strong> and <strong>Consignee ({selectedConsignment.receiver.email})</strong></span>
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
