'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Check, CheckCheck, ChevronDown, FileText, MessageSquare, Paperclip, RotateCcw, Send, Volume2, VolumeX, X } from 'lucide-react';
import { ChatAttachment, ChatMessage, Conversation } from '@/lib/chatTypes';

function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, context.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.25);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.25);
  } catch {
    // Audio is optional and may be blocked by the browser.
  }
}

const QUICK_PROMPTS = ['Track my consignment', 'Air freight rates', 'Ocean booking inquiry', 'Customs clearance status'];
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
let optimisticMessageSequence = 0;

export default function LiveChatWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [inputText, setInputText] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState<ChatAttachment>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visitorId, setVisitorId] = useState('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isRestoredSession, setIsRestoredSession] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const conversationRef = useRef<Conversation | null>(null);
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  const isOperationsPage = pathname?.startsWith('/operations') || pathname?.startsWith('/admin');

  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'nearest' });
  }, []);

  const handleResetChat = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      const newId = `vis-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      localStorage.setItem('navithon_chat_visitor_id', newId);
      setVisitorId(newId);
      setConversation(null);
      setMessages([]);
      setIsRestoredSession(false);
      setUnreadCount(0);

      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: newId, currentPage: pathname || '/', location: 'Website visitor' }),
      });
      const result = await response.json();
      if (result.success && result.data) {
        setConversation(result.data);
        setMessages(result.messages || []);
      }
    } catch (err) {
      console.error('Failed to reset chat session:', err);
    }
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let id = localStorage.getItem('navithon_chat_visitor_id');
    if (!id) {
      id = `vis-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      localStorage.setItem('navithon_chat_visitor_id', id);
    }
    window.setTimeout(() => setVisitorId(id), 0);

    const teaserTimer = window.setTimeout(() => {
      if (!sessionStorage.getItem('navithon_teaser_dismissed')) setShowTeaser(true);
    }, 3500);

    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('navithon_live_chat');
      broadcastChannelRef.current = channel;
      channel.onmessage = (event) => {
        const { type, data } = event.data || {};
        if (!data) return;

        if (type === 'NEW_MESSAGE' && data.message) {
          // Strictly ensure message belongs to THIS visitor's active conversation
          const currentConv = conversationRef.current;
          if (currentConv && data.message.conversationId === currentConv.id) {
            setMessages((previous) => previous.some((message) => message.id === data.message.id) ? previous : [...previous, data.message]);
            if (data.message.sender === 'agent') {
              if (soundEnabledRef.current) playNotificationChime();
              setUnreadCount((count) => count + 1);
            }
          }
        }
        if (type === 'CONVERSATION_UPDATED' && data.conversation) {
          // Strictly ensure conversation belongs to THIS visitor's active conversation
          const currentConv = conversationRef.current;
          if (currentConv && data.conversation.id === currentConv.id) {
            setConversation(data.conversation);
          }
        }
      };
    }
    return () => {
      window.clearTimeout(teaserTimer);
      broadcastChannelRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!visitorId || isOperationsPage) return;
    let mounted = true;
    async function loadConversation() {
      try {
        const response = await fetch('/api/chat/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitorId, currentPage: pathname || '/', location: 'Website visitor' }),
        });
        const result = await response.json();
        if (!mounted || !result.success) return;
        setConversation(result.data);
        const incomingMessages = result.messages || [];
        setMessages(incomingMessages);
        // Only show restored badge if there was an actual prior conversation beyond the welcome greeting
        setIsRestoredSession(!result.isNew && incomingMessages.length > 1);
        setUnreadCount(incomingMessages.filter((message: ChatMessage) => message.sender === 'agent' && !message.read).length);
      } catch (error) {
        console.error('Failed to initialize live chat:', error);
      }
    }
    loadConversation();
    return () => { mounted = false; };
  }, [visitorId, pathname, isOperationsPage]);

  useEffect(() => {
    if (!conversation?.id || isOperationsPage) return;
    const interval = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/chat/messages?conversationId=${conversation.id}`);
        const result = await response.json();
        if (!result.success || !Array.isArray(result.data)) return;
        setMessages((previous) => {
          const latest = result.data[result.data.length - 1];
          if (latest && latest.sender === 'agent' && (!previous.length || previous[previous.length - 1].id !== latest.id) && !isOpen) {
            if (soundEnabled) playNotificationChime();
            setUnreadCount((count) => count + 1);
          }
          // Preserve any in-flight optimistic messages until confirmed
          const inFlight = previous.filter((m) => m.id.startsWith('temp-'));
          if (inFlight.length === 0) return result.data;
          const serverIds = new Set(result.data.map((m: ChatMessage) => m.id));
          return [...result.data, ...inFlight.filter((m) => !serverIds.has(m.id))];
        });
      } catch {
        // Polling is a fallback for browsers without a live channel.
      }
    }, 3000);
    return () => window.clearInterval(interval);
  }, [conversation?.id, isOperationsPage, soundEnabled, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    sessionStorage.setItem('navithon_teaser_dismissed', 'true');
    const focusTimer = window.setTimeout(() => {
      scrollToBottom(false);
      inputRef.current?.focus();
    }, 150);
    if (conversation?.id) {
      fetch(`/api/chat/conversations/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markReadBy: 'visitor' }),
      }).catch(() => {});
    }
    return () => window.clearTimeout(focusTimer);
  }, [isOpen, conversation?.id, scrollToBottom]);

  useEffect(() => {
    if (isOpen) scrollToBottom(true);
  }, [messages, isOpen, scrollToBottom]);

  const handleAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_SIZE) {
      window.alert('Please choose a file smaller than 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setSelectedAttachment({ name: file.name, type: file.type || 'application/octet-stream', size: file.size, dataUrl: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend ?? inputText).trim();
    if ((!messageContent && !selectedAttachment) || !conversation?.id || isSubmitting) return;
    setIsSubmitting(true);
    if (!textToSend) setInputText('');
    const attachment = selectedAttachment;
    if (!textToSend) setSelectedAttachment(undefined);
    const tempId = `temp-${++optimisticMessageSequence}`;
    const optimisticMessage: ChatMessage = { id: tempId, conversationId: conversation.id, sender: 'visitor', senderName: conversation.visitorName, text: messageContent, attachment, timestamp: new Date().toISOString(), read: false };
    setMessages((previous) => [...previous, optimisticMessage]);
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: conversation.id, sender: 'visitor', senderName: conversation.visitorName, text: messageContent, attachment }),
      });
      const result = await response.json();
      if (result.success && result.data) {
        setMessages((previous) => previous.map((message) => message.id === tempId ? result.data : message));
        setConversation(result.conversation);
        broadcastChannelRef.current?.postMessage({ type: 'NEW_MESSAGE', data: { message: result.data, conversation: result.conversation } });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((previous) => previous.filter((message) => message.id !== tempId));
    } finally {
      setIsSubmitting(false);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  if (isOperationsPage) return null;

  return (
    <div className="live-chat-widget">
      {showTeaser && !isOpen && <div className="live-chat-teaser"><div className="live-chat-teaser-mark"><MessageSquare size={17} /></div><div><div className="live-chat-teaser-heading"><strong>Need a hand?</strong><button onClick={() => setShowTeaser(false)} aria-label="Dismiss chat invitation"><X size={14} /></button></div><button className="live-chat-teaser-copy" onClick={() => { setShowTeaser(false); setIsOpen(true); setUnreadCount(0); }}>Speak with our freight support team about a shipment, rate, or booking.</button></div></div>}
      {isOpen && <section className="live-chat-window" aria-label="Live freight support chat">
        <header className="live-chat-header">
          <div className="live-chat-agent">
            <div className="live-chat-avatar">N</div>
            <div>
              <strong>Freight support</strong>
              <span><i /> Usually replies quickly</span>
            </div>
          </div>
          <div className="live-chat-actions">
            <button onClick={handleResetChat} aria-label="Start new chat" title="Start new conversation">
              <RotateCcw size={15} />
            </button>
            <button onClick={() => setSoundEnabled(!soundEnabled)} aria-label={soundEnabled ? 'Mute notifications' : 'Enable notifications'}>
              {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
            <button onClick={() => setIsOpen(false)} aria-label="Close chat">
              <ChevronDown size={19} />
            </button>
          </div>
        </header>
        {isRestoredSession && (
          <div className="live-chat-restored">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <RotateCcw size={12} /> Previous conversation restored
            </span>
            <button
              onClick={handleResetChat}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: '#38bdf8',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                padding: 0
              }}
            >
              Start New Chat
            </button>
          </div>
        )}
        <div className="live-chat-messages"><div className="live-chat-welcome">Welcome. How can we help with your shipment?</div>{messages.map((message) => { const isVisitor = message.sender === 'visitor'; return <div className={`live-chat-message ${isVisitor ? 'is-visitor' : 'is-agent'}`} key={message.id}><span className="live-chat-sender">{isVisitor ? 'You' : 'Support team'}</span>{message.text && <div className="live-chat-bubble">{message.text}</div>}{message.attachment && <a className="live-chat-attachment" href={message.attachment.dataUrl} download={message.attachment.name} target="_blank" rel="noreferrer">{message.attachment.type.startsWith('image/') ? <img src={message.attachment.dataUrl} alt={message.attachment.name} /> : <FileText size={17} />}<span>{message.attachment.name}</span></a>}<span className="live-chat-time">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {isVisitor && (message.read ? <CheckCheck size={12} /> : <Check size={12} />)}</span></div>; })}<div ref={messagesEndRef} /></div>
        {messages.length <= 3 && <div className="live-chat-prompts">{QUICK_PROMPTS.map((prompt) => <button key={prompt} onClick={() => handleSendMessage(prompt)}>{prompt}</button>)}</div>}
        <form className="live-chat-composer" onSubmit={(event) => { event.preventDefault(); handleSendMessage(); }}>{selectedAttachment && <div className="live-chat-file-preview"><FileText size={15} /><span>{selectedAttachment.name}</span><button type="button" onClick={() => setSelectedAttachment(undefined)} aria-label="Remove attachment"><X size={14} /></button></div>}<div className="live-chat-compose-row"><input ref={attachmentInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={handleAttachment} hidden /><button type="button" className="live-chat-icon-button" onClick={() => attachmentInputRef.current?.click()} aria-label="Attach a file" title="Attach a file"><Paperclip size={18} /></button><input ref={inputRef} value={inputText} onChange={(event) => setInputText(event.target.value)} placeholder="Write a message..." disabled={isSubmitting} aria-label="Message" /><button className="live-chat-send" type="submit" disabled={(!inputText.trim() && !selectedAttachment) || isSubmitting} aria-label="Send message"><Send size={17} /></button></div><small>Files up to 5 MB</small></form>
      </section>}
      <button className="live-chat-launcher" onClick={() => { const nextOpen = !isOpen; setIsOpen(nextOpen); if (nextOpen) { setUnreadCount(0); setShowTeaser(false); } }} aria-label={isOpen ? 'Close chat' : 'Open live freight chat'}>{isOpen ? <X size={23} /> : <MessageSquare size={23} />}{!isOpen && unreadCount > 0 && <span>{unreadCount}</span>}</button>
    </div>
  );
}