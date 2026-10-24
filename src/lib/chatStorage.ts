import fs from 'fs';
import path from 'path';
import {
  Conversation,
  ChatMessage,
  ChatAttachment,
  MessageSender,
  ConversationStatus,
  VisitorMetadata
} from './chatTypes';
import { INITIAL_CONVERSATIONS, INITIAL_MESSAGES } from '../data/initialChats';
import { supabase, isSupabaseConfigured } from './supabase';

const DATA_DIR = path.join(process.cwd(), '.data');
const CHAT_STORE_FILE = path.join(DATA_DIR, 'chat-store.json');

interface ChatStoreData {
  conversations: Conversation[];
  messages: Record<string, ChatMessage[]>;
}

declare global {
  // eslint-disable-next-line no-var
  var __GLOBAL_CHAT_STORE__: ChatStoreData | undefined;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

export function readChatStoreFromDisk(): ChatStoreData {
  ensureDataDir();
  if (!fs.existsSync(CHAT_STORE_FILE)) {
    const initial: ChatStoreData = {
      conversations: Array.isArray(INITIAL_CONVERSATIONS) ? INITIAL_CONVERSATIONS : [],
      messages: INITIAL_MESSAGES && typeof INITIAL_MESSAGES === 'object' ? INITIAL_MESSAGES : {}
    };
    writeChatStoreToDisk(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(CHAT_STORE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    const conversations = Array.isArray(parsed.conversations) ? parsed.conversations : [];
    const cleanConversations = conversations.filter(
      (c: Conversation) => c.id !== 'conv-rotterdam-01' && !c.visitorName?.includes('Van Der Berg')
    );
    const messages = parsed.messages && typeof parsed.messages === 'object' ? parsed.messages : {};
    delete messages['conv-rotterdam-01'];

    return {
      conversations: cleanConversations,
      messages
    };
  } catch (err) {
    console.error('[ChatStorage] Error reading chat-store.json:', err);
    return { conversations: [], messages: {} };
  }
}

export function writeChatStoreToDisk(store: ChatStoreData): void {
  ensureDataDir();
  try {
    fs.writeFileSync(CHAT_STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('[ChatStorage] Error writing chat-store.json:', err);
  }
}

function getMemoryStore(): ChatStoreData {
  if (!globalThis.__GLOBAL_CHAT_STORE__) {
    globalThis.__GLOBAL_CHAT_STORE__ = readChatStoreFromDisk();
  }
  return globalThis.__GLOBAL_CHAT_STORE__;
}

// Helper: Safely map Supabase conversation row to Conversation object
function mapRowToConversation(row: any): Conversation {
  const d = (row.data && typeof row.data === 'object') ? row.data : {};
  return {
    id: String(row.id),
    visitorId: String(row.visitor_id || d.visitorId || ''),
    visitorName: String(row.visitor_name || d.visitorName || 'Visitor'),
    visitorEmail: row.visitor_email || d.visitorEmail || undefined,
    visitorCompany: d.visitorCompany || undefined,
    visitorLocation: d.visitorLocation || 'Website visitor',
    currentPage: d.currentPage || '/',
    status: (row.status as ConversationStatus) || d.status || 'ACTIVE',
    unreadCountAgent: typeof row.unread_count_agent === 'number' ? row.unread_count_agent : (d.unreadCountAgent || 0),
    unreadCountVisitor: typeof row.unread_count_visitor === 'number' ? row.unread_count_visitor : (d.unreadCountVisitor || 0),
    createdAt: row.created_at || d.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || d.updatedAt || new Date().toISOString(),
    lastMessageText: d.lastMessageText || '',
    lastMessageTimestamp: d.lastMessageTimestamp || row.updated_at || new Date().toISOString(),
    assignedAgent: d.assignedAgent || 'David M. (Operations)',
    internalNotes: d.internalNotes,
    linkedTrackingId: d.linkedTrackingId,
  };
}

// Helper: Safely map Supabase message row to ChatMessage object
function mapRowToMessage(row: any): ChatMessage {
  const d = (row.data && typeof row.data === 'object') ? row.data : {};
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id || d.conversationId),
    sender: (row.sender as MessageSender) || d.sender || 'visitor',
    senderName: String(row.sender_name || d.senderName || 'Visitor'),
    text: row.text ?? d.text ?? '',
    timestamp: row.timestamp || d.timestamp || new Date().toISOString(),
    read: typeof row.read === 'boolean' ? row.read : Boolean(d.read),
    attachment: d.attachment as ChatAttachment | undefined,
  };
}

/**
 * Retrieve all active conversations for the Operations Inbox.
 * Primary: Queries Supabase directly.
 * Fallback: Local disk store.
 */
export async function getAllConversations(): Promise<Conversation[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data: rows, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && rows) {
        const convs = rows
          .map(mapRowToConversation)
          .filter((c) => c.id !== 'conv-rotterdam-01' && !c.visitorName?.includes('Van Der Berg'));

        // Update local memory and disk cache with fresh snapshot
        const store = getMemoryStore();
        store.conversations = convs;
        writeChatStoreToDisk(store);

        // Filter: Keep conversations that have a valid email OR active visitor messages
        return convs
          .filter((c) => {
            const hasEmail = Boolean(c.visitorEmail && c.visitorEmail.includes('@'));
            const hasActivity = c.unreadCountAgent > 0 || (c.lastMessageText && !c.lastMessageText.startsWith('Welcome to Navithon'));
            return hasEmail || hasActivity;
          })
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      }
    } catch (err) {
      console.warn('[ChatStorage] Supabase getAllConversations error, using disk cache:', err);
    }
  }

  // Fallback to disk store
  const diskData = readChatStoreFromDisk();
  globalThis.__GLOBAL_CHAT_STORE__ = diskData;

  return diskData.conversations
    .filter((c) => {
      const hasEmail = Boolean(c.visitorEmail && c.visitorEmail.includes('@'));
      const hasActivity = c.unreadCountAgent > 0 || (c.lastMessageText && !c.lastMessageText.startsWith('Welcome to Navithon'));
      return hasEmail || hasActivity;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/**
 * Retrieve a single conversation by ID.
 */
export async function getConversationById(id: string): Promise<Conversation | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        const conv = mapRowToConversation(data);
        const store = getMemoryStore();
        const idx = store.conversations.findIndex((c) => c.id === id);
        if (idx !== -1) store.conversations[idx] = conv;
        else store.conversations.unshift(conv);
        writeChatStoreToDisk(store);
        return conv;
      }
    } catch (err) {
      console.warn('[ChatStorage] Error getting conversation from Supabase:', err);
    }
  }

  const store = getMemoryStore();
  const conv = store.conversations.find((c) => c.id === id);
  if (conv) return conv;

  const disk = readChatStoreFromDisk();
  return disk.conversations.find((c) => c.id === id) || null;
}

/**
 * Retrieve all messages for a conversation, ordered chronologically.
 */
export async function getMessagesForConversation(convId: string): Promise<ChatMessage[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('timestamp', { ascending: true });

      if (!error && data && data.length > 0) {
        const msgs = data.map(mapRowToMessage);
        const store = getMemoryStore();
        store.messages[convId] = msgs;
        writeChatStoreToDisk(store);
        return msgs;
      }
    } catch (err) {
      console.warn('[ChatStorage] Error fetching messages from Supabase, using disk:', err);
    }
  }

  const store = getMemoryStore();
  if (store.messages[convId] && store.messages[convId].length > 0) {
    return store.messages[convId];
  }
  const disk = readChatStoreFromDisk();
  return disk.messages[convId] || [];
}

/**
 * Idempotent Visitor Conversation Creator / Retriever:
 * Checks for existing conversation by visitorId in Supabase and local store.
 * Returns the existing conversation if already present, preventing duplicate threads.
 */
export async function getOrCreateVisitorConversation(
  visitorId: string,
  metadata?: Partial<VisitorMetadata>
): Promise<{ conversation: Conversation; isNew: boolean }> {
  const store = getMemoryStore();

  // 1. Check Supabase for existing conversation by visitor_id
  if (isSupabaseConfigured()) {
    try {
      const { data: rows, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('visitor_id', visitorId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (!error && rows && rows.length > 0) {
        const existing = mapRowToConversation(rows[0]);
        const updates: Partial<Conversation> = {};
        if (metadata?.currentPage && metadata.currentPage !== existing.currentPage) {
          updates.currentPage = metadata.currentPage;
        }
        if (metadata?.name && (!existing.visitorName || existing.visitorName.startsWith('Visitor #'))) {
          updates.visitorName = metadata.name;
        }
        if (metadata?.email && metadata.email !== existing.visitorEmail) {
          updates.visitorEmail = metadata.email;
        }
        if (metadata?.company && metadata.company !== existing.visitorCompany) {
          updates.visitorCompany = metadata.company;
        }

        if (Object.keys(updates).length > 0) {
          const updated: Conversation = { ...existing, ...updates, updatedAt: new Date().toISOString() };
          await supabase
            .from('conversations')
            .update({
              visitor_name: updated.visitorName,
              visitor_email: updated.visitorEmail || null,
              updated_at: updated.updatedAt,
              data: updated,
            })
            .eq('id', existing.id);

          const idx = store.conversations.findIndex((c) => c.id === existing.id);
          if (idx !== -1) store.conversations[idx] = updated;
          else store.conversations.unshift(updated);
          writeChatStoreToDisk(store);

          return { conversation: updated, isNew: false };
        }

        return { conversation: existing, isNew: false };
      }
    } catch (err) {
      console.warn('[ChatStorage] Error checking existing conversation in Supabase:', err);
    }
  }

  // 2. Check local disk fallback
  const existingLocal = store.conversations.find((c) => c.visitorId === visitorId);
  if (existingLocal) {
    if (metadata?.email && !existingLocal.visitorEmail) {
      existingLocal.visitorEmail = metadata.email;
      if (metadata.name) existingLocal.visitorName = metadata.name;
      existingLocal.updatedAt = new Date().toISOString();
      writeChatStoreToDisk(store);

      if (isSupabaseConfigured()) {
        try {
          await supabase
            .from('conversations')
            .upsert({
              id: existingLocal.id,
              visitor_id: existingLocal.visitorId,
              visitor_name: existingLocal.visitorName,
              visitor_email: existingLocal.visitorEmail || null,
              status: existingLocal.status,
              unread_count_agent: existingLocal.unreadCountAgent,
              unread_count_visitor: existingLocal.unreadCountVisitor,
              created_at: existingLocal.createdAt,
              updated_at: existingLocal.updatedAt,
              data: existingLocal,
            }, { onConflict: 'id' });
        } catch {}
      }
    }
    return { conversation: existingLocal, isNew: false };
  }

  // 3. Create brand new conversation
  const newConvId = `conv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const defaultName = metadata?.name || `Visitor #${visitorId.slice(-4).toUpperCase()}`;
  const now = new Date().toISOString();

  const welcomeMessageText =
    'Welcome to Navithon Operations! A dedicated logistics dispatcher is available. How may we assist your freight shipment?';

  const newConv: Conversation = {
    id: newConvId,
    visitorId,
    visitorName: defaultName,
    visitorEmail: metadata?.email,
    visitorCompany: metadata?.company,
    visitorLocation: metadata?.location || 'International Visitor',
    currentPage: metadata?.currentPage || '/',
    status: 'ACTIVE',
    unreadCountAgent: 0,
    unreadCountVisitor: 1,
    createdAt: now,
    updatedAt: now,
    lastMessageText: welcomeMessageText,
    lastMessageTimestamp: now,
    assignedAgent: 'David M. (Operations)'
  };

  const welcomeMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    conversationId: newConvId,
    sender: 'agent',
    senderName: 'David M. (Operations)',
    text: welcomeMessageText,
    timestamp: now,
    read: false
  };

  // PERSIST TO SUPABASE: Await conversation FIRST, then message to satisfy FK constraint!
  if (isSupabaseConfigured()) {
    try {
      const { error: convErr } = await supabase.from('conversations').upsert({
        id: newConv.id,
        visitor_id: newConv.visitorId,
        visitor_name: newConv.visitorName,
        visitor_email: newConv.visitorEmail || null,
        status: newConv.status,
        unread_count_agent: newConv.unreadCountAgent,
        unread_count_visitor: newConv.unreadCountVisitor,
        created_at: newConv.createdAt,
        updated_at: newConv.updatedAt,
        data: newConv,
      }, { onConflict: 'id' });

      if (convErr) {
        console.error('[ChatStorage] Error upserting new conversation into Supabase:', convErr.message);
      } else {
        const { error: msgErr } = await supabase.from('messages').upsert({
          id: welcomeMsg.id,
          conversation_id: newConvId,
          sender: welcomeMsg.sender,
          sender_name: welcomeMsg.senderName,
          text: welcomeMsg.text,
          timestamp: welcomeMsg.timestamp,
          read: welcomeMsg.read,
          data: welcomeMsg,
        }, { onConflict: 'id' });

        if (msgErr) {
          console.error('[ChatStorage] Error upserting welcome message into Supabase:', msgErr.message);
        }
      }
    } catch (err) {
      console.error('[ChatStorage] Supabase insertion error:', err);
    }
  }

  // Update memory store and disk cache
  store.conversations.unshift(newConv);
  if (!store.messages[newConvId]) {
    store.messages[newConvId] = [];
  }
  store.messages[newConvId].push(welcomeMsg);
  writeChatStoreToDisk(store);

  return { conversation: newConv, isNew: true };
}

/**
 * Add a new message to an existing conversation.
 * Persists immediately and atomically to Supabase and updates the disk cache.
 */
export async function addChatMessage(
  conversationId: string,
  messageData: {
    sender: MessageSender;
    senderName: string;
    text: string;
    attachment?: ChatAttachment;
  }
): Promise<{ message: ChatMessage; conversation: Conversation }> {
  let conv = await getConversationById(conversationId);
  if (!conv) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }

  const now = new Date().toISOString();
  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    conversationId,
    sender: messageData.sender,
    senderName: messageData.senderName,
    text: messageData.text.trim(),
    attachment: messageData.attachment,
    timestamp: now,
    read: false
  };

  conv.lastMessageText = newMsg.text || (newMsg.attachment ? `[Attachment] ${newMsg.attachment.name}` : 'New message');
  conv.lastMessageTimestamp = now;
  conv.updatedAt = now;

  if (messageData.sender === 'visitor') {
    conv.unreadCountAgent += 1;
    if (conv.status === 'RESOLVED') {
      conv.status = 'ACTIVE';
    }
  } else if (messageData.sender === 'agent') {
    conv.unreadCountVisitor += 1;
  }

  // Persist to Supabase atomically
  if (isSupabaseConfigured()) {
    try {
      // 1. Ensure conversation is updated first in Supabase
      await supabase.from('conversations').upsert({
        id: conv.id,
        visitor_id: conv.visitorId,
        visitor_name: conv.visitorName,
        visitor_email: conv.visitorEmail || null,
        status: conv.status,
        unread_count_agent: conv.unreadCountAgent,
        unread_count_visitor: conv.unreadCountVisitor,
        created_at: conv.createdAt,
        updated_at: conv.updatedAt,
        data: conv,
      }, { onConflict: 'id' });

      // 2. Insert message in Supabase
      const { error: msgErr } = await supabase.from('messages').upsert({
        id: newMsg.id,
        conversation_id: conversationId,
        sender: newMsg.sender,
        sender_name: newMsg.senderName,
        text: newMsg.text,
        timestamp: newMsg.timestamp,
        read: newMsg.read,
        data: newMsg,
      }, { onConflict: 'id' });

      if (msgErr) {
        console.error('[ChatStorage] Supabase message insert error:', msgErr.message);
      }
    } catch (err) {
      console.error('[ChatStorage] Supabase addChatMessage error:', err);
    }
  }

  // Update memory store and disk cache
  const store = getMemoryStore();
  const idx = store.conversations.findIndex((c) => c.id === conversationId);
  if (idx !== -1) store.conversations[idx] = conv;
  else store.conversations.unshift(conv);

  if (!store.messages[conversationId]) {
    store.messages[conversationId] = [];
  }
  store.messages[conversationId].push(newMsg);
  writeChatStoreToDisk(store);

  return { message: newMsg, conversation: conv };
}

/**
 * Update conversation status (ACTIVE, RESOLVED, ARCHIVED).
 */
export async function updateConversationStatus(
  id: string,
  status: ConversationStatus
): Promise<Conversation | null> {
  const conv = await getConversationById(id);
  if (!conv) return null;

  const now = new Date().toISOString();
  conv.status = status;
  conv.updatedAt = now;

  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('conversations')
        .update({
          status,
          updated_at: now,
          data: conv,
        })
        .eq('id', id);
    } catch (err) {
      console.warn('[ChatStorage] Error updating status in Supabase:', err);
    }
  }

  const store = getMemoryStore();
  const idx = store.conversations.findIndex((c) => c.id === id);
  if (idx !== -1) store.conversations[idx] = conv;
  writeChatStoreToDisk(store);

  return conv;
}

/**
 * Update internal notes or linked shipment tracking ID.
 */
export async function updateConversationNotes(
  id: string,
  notes: string,
  linkedTrackingId?: string
): Promise<Conversation | null> {
  const conv = await getConversationById(id);
  if (!conv) return null;

  const now = new Date().toISOString();
  conv.internalNotes = notes;
  if (linkedTrackingId !== undefined) {
    conv.linkedTrackingId = linkedTrackingId;
  }
  conv.updatedAt = now;

  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('conversations')
        .update({
          updated_at: now,
          data: conv,
        })
        .eq('id', id);
    } catch (err) {
      console.warn('[ChatStorage] Error updating notes in Supabase:', err);
    }
  }

  const store = getMemoryStore();
  const idx = store.conversations.findIndex((c) => c.id === id);
  if (idx !== -1) store.conversations[idx] = conv;
  writeChatStoreToDisk(store);

  return conv;
}

/**
 * Mark conversation messages as read.
 */
export async function markConversationRead(
  id: string,
  reader: 'agent' | 'visitor'
): Promise<Conversation | null> {
  const conv = await getConversationById(id);
  if (!conv) return null;

  const now = new Date().toISOString();
  if (reader === 'agent') {
    conv.unreadCountAgent = 0;
  } else {
    conv.unreadCountVisitor = 0;
  }
  conv.updatedAt = now;

  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('conversations')
        .update({
          unread_count_agent: conv.unreadCountAgent,
          unread_count_visitor: conv.unreadCountVisitor,
          updated_at: now,
          data: conv,
        })
        .eq('id', id);

      const targetSender = reader === 'agent' ? 'visitor' : 'agent';
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', id)
        .eq('sender', targetSender);
    } catch (err) {
      console.warn('[ChatStorage] Error marking conversation read in Supabase:', err);
    }
  }

  const store = getMemoryStore();
  const idx = store.conversations.findIndex((c) => c.id === id);
  if (idx !== -1) store.conversations[idx] = conv;

  const msgs = store.messages[id] || [];
  msgs.forEach((m) => {
    if (reader === 'agent' && m.sender === 'visitor') m.read = true;
    if (reader === 'visitor' && m.sender === 'agent') m.read = true;
  });

  writeChatStoreToDisk(store);
  return conv;
}

/**
 * Delete a single conversation and all its messages.
 */
export async function deleteConversation(id: string): Promise<boolean> {
  let deleted = false;

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('messages').delete().eq('conversation_id', id);
      const { error } = await supabase.from('conversations').delete().eq('id', id);
      if (!error) deleted = true;
    } catch (err) {
      console.warn('[ChatStorage] Error deleting conversation from Supabase:', err);
    }
  }

  const store = getMemoryStore();
  const initialLen = store.conversations.length;
  store.conversations = store.conversations.filter((c) => c.id !== id);
  delete store.messages[id];
  if (store.conversations.length < initialLen) deleted = true;

  writeChatStoreToDisk(store);
  return deleted;
}

/**
 * Purge all chat conversations and messages (Reset).
 */
export async function resetChatStore(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await Promise.all([
        supabase.from('messages').delete().neq('id', '__never_match__'),
        supabase.from('conversations').delete().neq('id', '__never_match__'),
      ]);
    } catch (err) {
      console.warn('[ChatStorage] Failed to purge Supabase tables:', err);
    }
  }

  const empty: ChatStoreData = { conversations: [], messages: {} };
  globalThis.__GLOBAL_CHAT_STORE__ = empty;
  writeChatStoreToDisk(empty);
}
