import fs from 'fs';
import path from 'path';
import { Conversation, ChatMessage, ChatAttachment, MessageSender, ConversationStatus, VisitorMetadata } from './chatTypes';
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

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readChatStoreFromDisk(): ChatStoreData {
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
    // Filter out any legacy demo conversation like conv-rotterdam-01
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

function writeChatStoreToDisk(store: ChatStoreData): void {
  ensureDataDir();
  const tempPath = `${CHAT_STORE_FILE}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(store, null, 2), 'utf-8');
    fs.renameSync(tempPath, CHAT_STORE_FILE);
  } catch (err) {
    console.error('[ChatStorage] Error writing chat-store.json:', err);
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {}
  }
}

function getMemoryStore(): ChatStoreData {
  const disk = readChatStoreFromDisk();
  globalThis.__GLOBAL_CHAT_STORE__ = disk;
  return disk;
}

export async function syncConversationToSupabase(conv: Conversation): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('conversations').upsert(
      {
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
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.warn('[ChatStorage] Supabase conversation sync warning:', error.message);
    }
  } catch (err) {
    console.warn('[ChatStorage] Supabase conversation sync exception:', err instanceof Error ? err.message : err);
  }
}

export async function syncMessageToSupabase(msg: ChatMessage): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('messages').upsert(
      {
        id: msg.id,
        conversation_id: msg.conversationId,
        sender: msg.sender,
        sender_name: msg.senderName,
        text: msg.text,
        timestamp: msg.timestamp,
        read: msg.read,
        data: msg,
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.warn('[ChatStorage] Supabase message sync warning:', error.message);
    }
  } catch (err) {
    console.warn('[ChatStorage] Supabase message sync exception:', err instanceof Error ? err.message : err);
  }
}

export async function syncChatWithSupabase(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { data: remoteConvs, error } = await supabase
      .from('conversations')
      .select('id, data, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('[ChatStorage] Supabase chat hydration warning:', error.message);
      return;
    }

    const store = getMemoryStore();

    if (remoteConvs && remoteConvs.length > 0) {
      let updated = false;
      for (const row of remoteConvs) {
        if (!row.data) continue;
        const conv = row.data as Conversation;
        if (conv.id === 'conv-rotterdam-01') continue;

        const idx = store.conversations.findIndex((c) => c.id === conv.id);
        if (idx === -1) {
          store.conversations.unshift(conv);
          updated = true;
        } else {
          store.conversations[idx] = conv;
          updated = true;
        }
      }
      if (updated) {
        writeChatStoreToDisk(store);
      }
    } else if (store.conversations.length > 0) {
      // Local has conversations but remote is empty: push local records to Supabase
      for (const conv of store.conversations) {
        await syncConversationToSupabase(conv);
        const msgs = store.messages[conv.id] || [];
        for (const msg of msgs) {
          await syncMessageToSupabase(msg);
        }
      }
    }
  } catch (err) {
    console.warn('[ChatStorage] Supabase chat sync error:', err);
  }
}

export async function getAllConversations(): Promise<Conversation[]> {
  await syncChatWithSupabase().catch(() => {});
  const diskData = readChatStoreFromDisk();
  globalThis.__GLOBAL_CHAT_STORE__ = diskData;

  return [...diskData.conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getConversationById(id: string): Promise<Conversation | null> {
  const store = getMemoryStore();
  const conv = store.conversations.find((c) => c.id === id);
  if (conv) return conv;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('data')
        .eq('id', id)
        .maybeSingle();

      if (!error && data?.data) {
        const remote = data.data as Conversation;
        store.conversations.unshift(remote);
        writeChatStoreToDisk(store);
        return remote;
      }
    } catch {
      // Fallback
    }
  }

  // Double check fresh disk in case another process created it
  const disk = readChatStoreFromDisk();
  globalThis.__GLOBAL_CHAT_STORE__ = disk;
  return disk.conversations.find((c) => c.id === id) || null;
}

export async function getMessagesForConversation(convId: string): Promise<ChatMessage[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('data')
        .eq('conversation_id', convId)
        .order('timestamp', { ascending: true });

      if (!error && data && data.length > 0) {
        const msgs = data.map((row) => row.data as ChatMessage);
        const store = getMemoryStore();
        store.messages[convId] = msgs;
        writeChatStoreToDisk(store);
        return msgs;
      }
    } catch {
      // Fallback to disk
    }
  }

  const store = getMemoryStore();
  if (store.messages[convId]) {
    return store.messages[convId];
  }
  const disk = readChatStoreFromDisk();
  globalThis.__GLOBAL_CHAT_STORE__ = disk;
  return disk.messages[convId] || [];
}

/**
 * Idempotent Visitor Conversation Creator / Retriever:
 * Checks for existing conversation by visitorId in local store and Supabase.
 * Returns the existing conversation if already present, preventing duplicate threads.
 */
export async function getOrCreateVisitorConversation(
  visitorId: string,
  metadata?: Partial<VisitorMetadata>
): Promise<{ conversation: Conversation; isNew: boolean }> {
  await syncChatWithSupabase().catch(() => {});
  const store = getMemoryStore();

  // Find existing by visitorId
  const existingIndex = store.conversations.findIndex((c) => c.visitorId === visitorId);
  if (existingIndex !== -1) {
    const existing = store.conversations[existingIndex];
    const updates: Partial<Conversation> = {};
    if (metadata?.currentPage && metadata.currentPage !== existing.currentPage) {
      updates.currentPage = metadata.currentPage;
    }
    if (metadata?.name && !existing.visitorName.includes(metadata.name)) {
      updates.visitorName = metadata.name;
    }
    if (metadata?.email && metadata.email !== existing.visitorEmail) {
      updates.visitorEmail = metadata.email;
    }

    if (Object.keys(updates).length > 0) {
      const updated = { ...existing, ...updates };
      store.conversations[existingIndex] = updated;
      writeChatStoreToDisk(store);
      syncConversationToSupabase(updated).catch(() => {});
      return { conversation: updated, isNew: false };
    }
    return { conversation: existing, isNew: false };
  }

  // Check Supabase directly for this visitorId in case it was created in another session
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('data')
        .eq('visitor_id', visitorId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data?.data) {
        const remote = data.data as Conversation;
        store.conversations.unshift(remote);
        writeChatStoreToDisk(store);
        return { conversation: remote, isNew: false };
      }
    } catch {
      // Continue to create new
    }
  }

  // Create brand new conversation
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

  store.conversations.unshift(newConv);
  if (!store.messages[newConvId]) {
    store.messages[newConvId] = [];
  }
  store.messages[newConvId].push(welcomeMsg);

  // Write durably to disk
  writeChatStoreToDisk(store);

  // Sync to Supabase in background
  syncConversationToSupabase(newConv).catch(() => {});
  syncMessageToSupabase(welcomeMsg).catch(() => {});

  return { conversation: newConv, isNew: true };
}

export async function addChatMessage(
  conversationId: string,
  messageData: {
    sender: MessageSender;
    senderName: string;
    text: string;
    attachment?: ChatAttachment;
  }
): Promise<{ message: ChatMessage; conversation: Conversation }> {
  const store = getMemoryStore();
  let conv: Conversation | null | undefined = store.conversations.find((c) => c.id === conversationId);
  if (!conv) {
    conv = await getConversationById(conversationId);
  }
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

  if (!store.messages[conversationId]) {
    store.messages[conversationId] = [];
  }
  store.messages[conversationId].push(newMsg);

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

  // Write durably to disk
  writeChatStoreToDisk(store);

  // Sync to Supabase in background
  syncConversationToSupabase(conv).catch(() => {});
  syncMessageToSupabase(newMsg).catch(() => {});

  return { message: newMsg, conversation: conv };
}

export async function updateConversationStatus(
  id: string,
  status: ConversationStatus
): Promise<Conversation | null> {
  const store = getMemoryStore();
  const conv = store.conversations.find((c) => c.id === id);
  if (!conv) return null;

  conv.status = status;
  conv.updatedAt = new Date().toISOString();

  writeChatStoreToDisk(store);
  syncConversationToSupabase(conv).catch(() => {});

  return conv;
}

export async function updateConversationNotes(
  id: string,
  notes: string,
  linkedTrackingId?: string
): Promise<Conversation | null> {
  const store = getMemoryStore();
  const conv = store.conversations.find((c) => c.id === id);
  if (!conv) return null;

  conv.internalNotes = notes;
  if (linkedTrackingId !== undefined) {
    conv.linkedTrackingId = linkedTrackingId;
  }
  conv.updatedAt = new Date().toISOString();

  writeChatStoreToDisk(store);
  syncConversationToSupabase(conv).catch(() => {});

  return conv;
}

export async function markConversationRead(
  id: string,
  reader: 'agent' | 'visitor'
): Promise<Conversation | null> {
  const store = getMemoryStore();
  const conv = store.conversations.find((c) => c.id === id);
  if (!conv) return null;

  if (reader === 'agent') {
    conv.unreadCountAgent = 0;
    const msgs = store.messages[id] || [];
    msgs.forEach((m) => {
      if (m.sender === 'visitor') m.read = true;
    });
  } else {
    conv.unreadCountVisitor = 0;
    const msgs = store.messages[id] || [];
    msgs.forEach((m) => {
      if (m.sender === 'agent') m.read = true;
    });
  }

  writeChatStoreToDisk(store);
  syncConversationToSupabase(conv).catch(() => {});

  return conv;
}

export async function resetChatStore(): Promise<void> {
  const empty: ChatStoreData = { conversations: [], messages: {} };
  globalThis.__GLOBAL_CHAT_STORE__ = empty;
  writeChatStoreToDisk(empty);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('messages').delete().neq('id', '__never_match__');
      await supabase.from('conversations').delete().neq('id', '__never_match__');
    } catch {}
  }
}
