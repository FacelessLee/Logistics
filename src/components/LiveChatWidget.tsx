'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  X,
  Send,
  Volume2,
  VolumeX,
  Sparkles,
  RotateCcw,
  CheckCheck,
  ChevronDown
} from 'lucide-react';
import { ChatMessage, Conversation } from '@/lib/chatTypes';

// Web Audio API chime synthesizer for incoming messages
function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.12); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880.0, now + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.28); // D6

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.12);
    osc1.stop(now + 0.2);
    osc2.stop(now + 0.35);
  } catch (err) {
    console.debug('Audio playback blocked or unavailable:', err);
  }
}

const QUICK_PROMPTS = [
  '📦 Track my consignment',
  '✈️ Air charter capacity & rates',
  '🚢 Ocean container booking inquiry',
  '📑 In-house customs clearance status'
];

export default function LiveChatWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chat Data
  const [visitorId, setVisitorId] = useState<string>('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isRestoredSession, setIsRestoredSession] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Automatically hide widget on /operations or /admin
  const isOperationsPage = pathname?.startsWith('/operations') || pathname?.startsWith('/admin');

  // Scroll messages to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'nearest'
    });
  }, []);

  // Initialize or restore visitor ID
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let id = localStorage.getItem('navithon_chat_visitor_id');
    if (!id) {
      id = `vis-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      localStorage.setItem('navithon_chat_visitor_id', id);
    } else {
      setIsRestoredSession(true);
    }
    setVisitorId(id);

    // Initial show teaser after 3.5 seconds if not opened
    const teaserTimer = setTimeout(() => {
      if (!sessionStorage.getItem('navithon_teaser_dismissed')) {
        setShowTeaser(true);
      }
    }, 3500);

    // BroadcastChannel for instant cross-tab sync
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel('navithon_live_chat');
      broadcastChannelRef.current = bc;
      bc.onmessage = (event) => {
        const { type, data } = event.data;
        if (type === 'NEW_MESSAGE') {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
          if (data.message.sender === 'agent') {
            if (soundEnabled) playNotificationChime();
            setUnreadCount((prev) => prev + 1);
          }
        } else if (type === 'CONVERSATION_UPDATED') {
          setConversation(data.conversation);
        }
      };
    }

    return () => {
      clearTimeout(teaserTimer);
      broadcastChannelRef.current?.close();
    };
  }, [soundEnabled]);

  // Load or start conversation when visitorId is established
  useEffect(() => {
    if (!visitorId || isOperationsPage) return;

    let isMounted = true;

    async function initChat() {
      try {
        const res = await fetch('/api/chat/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitorId,
            currentPage: pathname || '/',
            location: 'Active Visitor Session'
          })
        });
        const json = await res.json();
        if (json.success && isMounted) {
          setConversation(json.data);
          setMessages(json.messages || []);
          if (!json.isNew && (json.messages || []).length > 1) {
            setIsRestoredSession(true);
          }
          // Count unread agent messages
          const unread = (json.messages || []).filter(
            (m: ChatMessage) => m.sender === 'agent' && !m.read
          ).length;
          setUnreadCount(unread);
        }
      } catch (err) {
        console.error('Failed to init live chat:', err);
      }
    }

    initChat();

    return () => {
      isMounted = false;
    };
  }, [visitorId, pathname, isOperationsPage]);

  // Periodic sync / polling fallback (every 3 seconds)
  useEffect(() => {
    if (!conversation?.id || isOperationsPage) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/chat/messages?conversationId=${conversation.id}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setMessages((prev) => {
            if (json.data.length !== prev.length) {
              const lastMsg = json.data[json.data.length - 1];
              if (lastMsg && lastMsg.sender === 'agent' && (!prev.length || prev[prev.length - 1].id !== lastMsg.id)) {
                if (soundEnabled && !isOpen) {
                  playNotificationChime();
                  setUnreadCount((c) => c + 1);
                }
              }
              return json.data;
            }
            return prev;
          });
        }
      } catch {
        // silent fallback
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [conversation?.id, isOperationsPage, soundEnabled, isOpen]);

  // When opening chat, reset unread counter and focus input
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setShowTeaser(false);
      sessionStorage.setItem('navithon_teaser_dismissed', 'true');
      setTimeout(() => {
        scrollToBottom(false);
        inputRef.current?.focus();
      }, 150);

      // Notify server that visitor has read
      if (conversation?.id) {
        fetch(`/api/chat/conversations/${conversation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markReadBy: 'visitor' })
        }).catch(() => {});
      }
    }
  }, [isOpen, conversation?.id, scrollToBottom]);

  // Scroll whenever messages change
  useEffect(() => {
    if (isOpen) {
      scrollToBottom(true);
    }
  }, [messages, isOpen, scrollToBottom]);

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || inputText).trim();
    if (!messageContent || !conversation?.id || isSubmitting) return;

    setIsSubmitting(true);
    if (!textToSend) setInputText('');

    // Optimistic local add
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversationId: conversation.id,
      sender: 'visitor',
      senderName: conversation.visitorName,
      text: messageContent,
      timestamp: new Date().toISOString(),
      read: false
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom(true);

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          sender: 'visitor',
          senderName: conversation.visitorName,
          text: messageContent
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        // Replace optimistic message with real saved message
        setMessages((prev) => prev.map((m) => (m.id === tempId ? json.data : m)));
        setConversation(json.conversation);

        // Broadcast to other tabs (like agent in /operations)
        broadcastChannelRef.current?.postMessage({
          type: 'NEW_MESSAGE',
          data: { message: json.data, conversation: json.conversation }
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Do not render on operations or admin portal
  if (isOperationsPage) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* ── Teaser Callout Pill ── */}
      {showTeaser && !isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '72px',
            right: '0',
            width: '290px',
            background: 'rgba(18, 18, 18, 0.95)',
            border: '1px solid rgba(255, 107, 53, 0.35)',
            borderRadius: '14px',
            padding: '14px 16px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6), 0 0 24px rgba(255, 107, 53, 0.12)',
            backdropFilter: 'blur(16px)',
            color: '#FFFFFF',
            animation: 'fadeInUp 0.3s ease',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF6B35 0%, #E85A24 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 0 14px rgba(255, 107, 53, 0.4)',
            }}
          >
            <Sparkles size={18} color="#FFFFFF" />
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '4px',
              }}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--accent-orange)',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                DISPATCH DESK ONLINE
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTeaser(false);
                  sessionStorage.setItem('navithon_teaser_dismissed', 'true');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                }}
                aria-label="Dismiss teaser"
              >
                <X size={14} />
              </button>
            </div>
            <p
              onClick={() => setIsOpen(true)}
              style={{
                margin: 0,
                fontSize: '0.84rem',
                lineHeight: 1.4,
                color: '#E0E0E0',
                cursor: 'pointer',
              }}
            >
              Need immediate assistance with a shipment or charter? Speak with our live freight operations team.
            </p>
          </div>
        </div>
      )}

      {/* ── Chat Window Modal ── */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '76px',
            right: '0',
            width: '380px',
            maxWidth: 'calc(100vw - 32px)',
            height: '570px',
            maxHeight: 'calc(100vh - 110px)',
            background: 'rgba(12, 12, 12, 0.95)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 32px rgba(255, 107, 53, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'scaleInChat 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Top Header Bar */}
          <div
            style={{
              padding: '16px 20px',
              background: 'linear-gradient(180deg, rgba(255, 107, 53, 0.12) 0%, rgba(20, 20, 20, 0.6) 100%)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Agent Avatar with glowing active badge */}
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1C1C1C 0%, #2A2A2A 100%)',
                    border: '1.5px solid rgba(255, 107, 53, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FF6B35',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                  }}
                >
                  NVT
                </div>
                <span
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '11px',
                    height: '11px',
                    borderRadius: '50%',
                    background: '#10B981',
                    border: '2px solid #0C0C0C',
                    boxShadow: '0 0 8px #10B981',
                  }}
                />
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.94rem',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Navithon Dispatch Desk
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.72rem',
                    color: 'var(--accent-emerald)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'currentColor',
                    }}
                  />
                  <span>AGENT ONLINE • GLOBAL OPS</span>
                </div>
              </div>
            </div>

            {/* Header controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                aria-label={soundEnabled ? 'Mute notification sound' : 'Enable notification sound'}
                title={soundEnabled ? 'Mute notifications' : 'Enable audio notifications'}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: soundEnabled ? 'var(--text-secondary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close chat window"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#FFFFFF';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
              >
                <ChevronDown size={18} />
              </button>
            </div>
          </div>

          {/* Session continuity banner */}
          {isRestoredSession && (
            <div
              style={{
                padding: '6px 16px',
                background: 'rgba(255, 107, 53, 0.08)',
                borderBottom: '1px solid rgba(255, 107, 53, 0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent-orange)',
              }}
            >
              <RotateCcw size={12} />
              <span>Prior chat history restored • Session #{conversation?.id.slice(-6).toUpperCase()}</span>
            </div>
          )}

          {/* Messages Feed */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              scrollBehavior: 'smooth',
            }}
          >
            {/* System Info Bubble */}
            <div
              style={{
                alignSelf: 'center',
                maxWidth: '90%',
                textAlign: 'center',
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '6px 12px',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              Navithon Secure Encrypted Telemetry Dispatch
            </div>

            {messages.map((msg) => {
              const isVisitor = msg.sender === 'visitor';
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isVisitor ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    alignSelf: isVisitor ? 'flex-end' : 'flex-start',
                  }}
                >
                  {/* Sender Name tag */}
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-mono)',
                      color: isVisitor ? 'var(--text-muted)' : 'var(--accent-orange)',
                      marginBottom: '3px',
                      paddingLeft: isVisitor ? 0 : '4px',
                      paddingRight: isVisitor ? '4px' : 0,
                    }}
                  >
                    {isVisitor ? 'You' : msg.senderName}
                  </span>

                  {/* Bubble */}
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: isVisitor ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isVisitor
                        ? 'linear-gradient(135deg, #FF6B35 0%, #E85A24 100%)'
                        : 'rgba(28, 28, 28, 0.95)',
                      border: isVisitor
                        ? '1px solid rgba(255, 255, 255, 0.15)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      lineHeight: 1.45,
                      wordBreak: 'break-word',
                      boxShadow: isVisitor
                        ? '0 4px 14px rgba(255, 107, 53, 0.25)'
                        : '0 4px 12px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    {msg.text}
                  </div>

                  {/* Timestamp & read receipts */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.65rem',
                      color: 'var(--text-muted)',
                      marginTop: '3px',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <span>{formatMessageTime(msg.timestamp)}</span>
                    {isVisitor && (
                      <CheckCheck size={12} color={msg.read ? '#10B981' : 'var(--text-muted)'} />
                    )}
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips (show if fewer than 4 messages) */}
          {messages.length <= 3 && (
            <div
              style={{
                padding: '6px 14px',
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                background: 'rgba(15, 15, 15, 0.8)',
              }}
            >
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  style={{
                    whiteSpace: 'nowrap',
                    fontSize: '0.72rem',
                    padding: '6px 10px',
                    borderRadius: '9999px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-orange)';
                    e.currentTarget.style.color = '#FFFFFF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <div
            style={{
              padding: '12px 14px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(18, 18, 18, 0.98)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask an on-duty operations agent..."
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                fontSize: '0.88rem',
                outline: 'none',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent-orange)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isSubmitting}
              aria-label="Send message"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: inputText.trim() && !isSubmitting
                  ? 'linear-gradient(135deg, #FF6B35 0%, #E85A24 100%)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                cursor: inputText.trim() && !isSubmitting ? 'pointer' : 'default',
                opacity: inputText.trim() && !isSubmitting ? 1 : 0.4,
                boxShadow: inputText.trim() && !isSubmitting ? '0 4px 14px rgba(255, 107, 53, 0.3)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Floating Launcher Button ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close chat' : 'Open live freight chat'}
        style={{
          position: 'relative',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #FF6B35 0%, #E85A24 100%)',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          color: '#FFFFFF',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 30px rgba(255, 107, 53, 0.45), 0 4px 12px rgba(0, 0, 0, 0.5)',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 12px 36px rgba(255, 107, 53, 0.6), 0 6px 16px rgba(0, 0, 0, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 30px rgba(255, 107, 53, 0.45), 0 4px 12px rgba(0, 0, 0, 0.5)';
        }}
      >
        {/* Pulsing radar ring */}
        <span
          style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '50%',
            border: '2px solid rgba(255, 107, 53, 0.4)',
            animation: 'pingRing 2.4s cubic-bezier(0, 0, 0.2, 1) infinite',
            pointerEvents: 'none',
          }}
        />

        {isOpen ? (
          <X size={26} />
        ) : (
          <MessageSquare size={26} />
        )}

        {/* Unread badge */}
        {!isOpen && unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              background: '#FFFFFF',
              color: '#0A0A0A',
              fontSize: '0.72rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #FF6B35',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Embedded keyframe animations */}
      <style jsx global>{`
        @keyframes pingRing {
          0% {
            transform: scale(0.95);
            opacity: 0.8;
          }
          70%, 100% {
            transform: scale(1.35);
            opacity: 0;
          }
        }
        @keyframes scaleInChat {
          0% {
            opacity: 0;
            transform: scale(0.94) translateY(12px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes fadeInUp {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
