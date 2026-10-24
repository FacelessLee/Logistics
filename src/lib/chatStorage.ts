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
        const filtered = convs
          .filter((c) => {
            const hasEmail = Boolean(c.visitorEmail && c.visitorEmail.includes('@'));
            const hasActivity = c.unreadCountAgent > 0 || (c.lastMessageText && !c.lastMessageText.startsWith('Welcome to Navithon'));
            return hasEmail || hasActivity;
          })
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        // Deduplicate by visitorEmail so operations inbox has one consolidated thread per visitor email
        const seenEmail = new Set<string>();
        const deduped: Conversation[] = [];
        for (const c of filtered) {
          if (c.visitorEmail && c.visitorEmail.includes('@')) {
            const normalized = c.visitorEmail.trim().toLowerCase();
            if (seenEmail.has(normalized)) continue;
            seenEmail.add(normalized);
          }
          deduped.push(c);
        }
        return deduped;
      }
    } catch (err) {
      console.warn('[ChatStorage] Supabase getAllConversations error, using disk cache:', err);
    }
  }

  // Fallback to disk store
  const diskData = readChatStoreFromDisk();
  globalThis.__GLOBAL_CHAT_STORE__ = diskData;

  const filteredLocal = diskData.conversations
    .filter((c) => {
      const hasEmail = Boolean(c.visitorEmail && c.visitorEmail.includes('@'));
      const hasActivity = c.unreadCountAgent > 0 || (c.lastMessageText && !c.lastMessageText.startsWith('Welcome to Navithon'));
      return hasEmail || hasActivity;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const seenEmailLocal = new Set<string>();
  const dedupedLocal: Conversation[] = [];
  for (const c of filteredLocal) {
    if (c.visitorEmail && c.visitorEmail.includes('@')) {
      const normalized = c.visitorEmail.trim().toLowerCase();
      if (seenEmailLocal.has(normalized)) continue;
      seenEmailLocal.add(normalized);
    }
    dedupedLocal.push(c);
  }
  return dedupedLocal;
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
 * Deduplicates any legacy duplicate welcome messages.
 */
export async function getMessagesForConversation(convId: string): Promise<ChatMessage[]> {
  const sanitizeMessages = (msgs: ChatMessage[]): ChatMessage[] => {
    let hasSeenWelcome = false;
    return msgs.filter((m) => {
      if (m.sender === 'agent' && m.text.startsWith('Welcome to Navithon Operations!')) {
        if (hasSeenWelcome) return false;
        hasSeenWelcome = true;
      }
      return true;
    });
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('timestamp', { ascending: true });

      if (!error && data && data.length > 0) {
        const msgs = sanitizeMessages(data.map(mapRowToMessage));
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
    return sanitizeMessages(store.messages[convId]);
  }
  const disk = readChatStoreFromDisk();
  return sanitizeMessages(disk.messages[convId] || []);
}

/**
 * Idempotent Visitor Conversation Creator / Retriever:
 * Prioritizes cross-device lookup by visitorEmail so users returning on any device
 * are instantly reconnected to their complete conversation history with the agent.
 */
export async function getOrCreateVisitorConversation(
  visitorId: string,
  metadata?: Partial<VisitorMetadata>,
  forceNew?: boolean
): Promise<{ conversation: Conversation; isNew: boolean }> {
  const store = getMemoryStore();
  const cleanEmail = metadata?.email?.trim().toLowerCase();

  // 1. Primary Cross-Device Lookup: Search Supabase by visitor_email
  if (isSupabaseConfigured()) {
    try {
      let matchedRows: any[] | null = null;

      // Check by email first for cross-device persistence
      if (cleanEmail && !forceNew) {
        const { data: emailRows, error: emailErr } = await supabase
          .from('conversations')
          .select('*')
          .ilike('visitor_email', cleanEmail)
          .order('updated_at', { ascending: false });

        if (!emailErr && emailRows && emailRows.length > 0) {
          matchedRows = emailRows;
        }
      }

      // Fallback to visitor_id if email was not provided or didn't match
      if ((!matchedRows || matchedRows.length === 0) && visitorId && !forceNew) {
        const { data: vidRows, error: vidErr } = await supabase
          .from('conversations')
          .select('*')
          .eq('visitor_id', visitorId)
          .order('updated_at', { ascending: false });

        if (!vidErr && vidRows && vidRows.length > 0) {
          matchedRows = vidRows;
        }
      }

      if (matchedRows && matchedRows.length > 0) {
        const primaryRow = matchedRows[0];
        let existing = mapRowToConversation(primaryRow);

        // If multiple duplicate conversations exist from past fragmented sessions, consolidate them into primary
        if (matchedRows.length > 1 && cleanEmail) {
          const duplicateIds = matchedRows.slice(1).map((r) => String(r.id));
          try {
            // Re-parent all messages to the primary conversation
            await supabase
              .from('messages')
              .update({ conversation_id: existing.id })
              .in('conversation_id', duplicateIds);

            // Delete duplicate conversation headers
            await supabase
              .from('conversations')
              .delete()
              .in('id', duplicateIds);

            // Consolidate in-memory store
            duplicateIds.forEach((dupId) => {
              const dupMsgs = store.messages[dupId] || [];
              if (!store.messages[existing.id]) store.messages[existing.id] = [];
              store.messages[existing.id].push(...dupMsgs);
              delete store.messages[dupId];
            });
            store.conversations = store.conversations.filter((c) => !duplicateIds.includes(c.id));
          } catch (mergeErr) {
            console.warn('[ChatStorage] Error consolidating duplicate conversations:', mergeErr);
          }
        }

        const updates: Partial<Conversation> = {};
        if (metadata?.currentPage && metadata.currentPage !== existing.currentPage) {
          updates.currentPage = metadata.currentPage;
        }
        if (
          metadata?.name &&
          metadata.name.trim() &&
          (!existing.visitorName || existing.visitorName.startsWith('Visitor #') || existing.visitorName === 'Visitor')
        ) {
          updates.visitorName = metadata.name.trim();
        }
        if (cleanEmail && existing.visitorEmail !== cleanEmail) {
          updates.visitorEmail = cleanEmail;
        }
        if (metadata?.company && metadata.company !== existing.visitorCompany) {
          updates.visitorCompany = metadata.company;
        }

        if (Object.keys(updates).length > 0) {
          existing = { ...existing, ...updates, updatedAt: new Date().toISOString() };
          await supabase
            .from('conversations')
            .update({
              visitor_name: existing.visitorName,
              visitor_email: existing.visitorEmail || null,
              updated_at: existing.updatedAt,
              data: existing,
            })
            .eq('id', existing.id);
        }

        const idx = store.conversations.findIndex((c) => c.id === existing.id);
        if (idx !== -1) store.conversations[idx] = existing;
        else store.conversations.unshift(existing);
        writeChatStoreToDisk(store);

        return { conversation: existing, isNew: false };
      }
    } catch (err) {
      console.warn('[ChatStorage] Error checking existing conversation in Supabase:', err);
    }
  }

  // 2. Check local disk fallback: check email first, then visitorId
  let existingLocal: Conversation | undefined;
  if (cleanEmail && !forceNew) {
    existingLocal = store.conversations.find(
      (c) => c.visitorEmail && c.visitorEmail.trim().toLowerCase() === cleanEmail
    );
  }
  if (!existingLocal && visitorId && !forceNew) {
    existingLocal = store.conversations.find((c) => c.visitorId === visitorId);
  }

  if (existingLocal) {
    let updated = false;
    if (cleanEmail && existingLocal.visitorEmail !== cleanEmail) {
      existingLocal.visitorEmail = cleanEmail;
      updated = true;
    }
    if (
      metadata?.name &&
      metadata.name.trim() &&
      (!existingLocal.visitorName || existingLocal.visitorName.startsWith('Visitor #') || existingLocal.visitorName === 'Visitor')
    ) {
      existingLocal.visitorName = metadata.name.trim();
      updated = true;
    }
    if (metadata?.currentPage && metadata.currentPage !== existingLocal.currentPage) {
      existingLocal.currentPage = metadata.currentPage;
      updated = true;
    }
    if (updated) {
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

  // 3. Create brand new conversation (only when no existing conversation matches email or visitorId)
  const newConvId = `conv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const defaultName = metadata?.name?.trim() || `Visitor #${visitorId.slice(-4).toUpperCase()}`;
  const now = new Date().toISOString();

  const welcomeMessageText =
    'Welcome to Navithon Operations! A dedicated logistics dispatcher is available. How may we assist your freight shipment?';

  const newConv: Conversation = {
    id: newConvId,
    visitorId,
    visitorName: defaultName,
    visitorEmail: cleanEmail || metadata?.email,
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
