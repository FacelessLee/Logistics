import fs from 'fs';
import path from 'path';
import { Conversation, ChatMessage, ChatAttachment, MessageSender, ConversationStatus, VisitorMetadata } from './chatTypes';
import { INITIAL_CONVERSATIONS, INITIAL_MESSAGES } from '../data/initialChats';
import { isMongoConfigured, safeGetDatabase } from './mongodb';

const DATA_DIR = path.join(process.cwd(), '.data');
const CHAT_STORE_FILE = path.join(DATA_DIR, 'chat-store.json');

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_COLLECTION = 'messages';

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
  if (!globalThis.__GLOBAL_CHAT_STORE__) {
    globalThis.__GLOBAL_CHAT_STORE__ = readChatStoreFromDisk();
  }
  return globalThis.__GLOBAL_CHAT_STORE__;
}

// Asynchronously sync with MongoDB if available without blocking local execution
async function syncConversationToMongo(conv: Conversation): Promise<void> {
  if (!isMongoConfigured()) return;
  try {
    const db = await safeGetDatabase();
    if (!db) return;
    await db.collection<Conversation>(CONVERSATIONS_COLLECTION).updateOne(
      { id: conv.id },
      { $set: conv },
      { upsert: true }
    );
  } catch (err) {
    console.warn('[ChatStorage] MongoDB conversation sync warning:', err instanceof Error ? err.message : err);
  }
}

async function syncMessageToMongo(msg: ChatMessage): Promise<void> {
  if (!isMongoConfigured()) return;
  try {
    const db = await safeGetDatabase();
    if (!db) return;
    await db.collection<ChatMessage>(MESSAGES_COLLECTION).updateOne(
      { id: msg.id },
      { $set: msg },
      { upsert: true }
    );
  } catch (err) {
    console.warn('[ChatStorage] MongoDB message sync warning:', err instanceof Error ? err.message : err);
  }
}

// Trigger background one-time sync / cleanup on start
let hasSyncedWithMongo = false;
async function triggerMongoSync(): Promise<void> {
  if (hasSyncedWithMongo || !isMongoConfigured()) return;
  hasSyncedWithMongo = true;
  try {
    const db = await safeGetDatabase();
    if (!db) return;

    // Purge demo records from Mongo
    await db.collection(CONVERSATIONS_COLLECTION).deleteMany({
      $or: [{ id: 'conv-rotterdam-01' }, { visitorId: 'vis-rotterdam-891' }]
    });
    await db.collection(MESSAGES_COLLECTION).deleteMany({
      conversationId: 'conv-rotterdam-01'
    });

    const store = getMemoryStore();
    // Hydrate remote conversations into local store if any
    const remoteConvs = await db.collection<Conversation>(CONVERSATIONS_COLLECTION).find({}, { projection: { _id: 0 } }).toArray();
    let updated = false;
    for (const rConv of remoteConvs) {
      if (rConv.id === 'conv-rotterdam-01') continue;
      const idx = store.conversations.findIndex((c) => c.id === rConv.id);
      if (idx === -1) {
        store.conversations.unshift(rConv);
        updated = true;
      } else {
        store.conversations[idx] = rConv;
        updated = true;
      }
    }
    if (updated) {
      writeChatStoreToDisk(store);
    }
  } catch (err) {
    console.warn('[ChatStorage] MongoDB initial sync warning:', err);
  }
}

export async function getAllConversations(): Promise<Conversation[]> {
  triggerMongoSync().catch(() => {});
  // Always ensure fresh data from disk
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

  // Double check fresh disk in case another process created it
  const disk = readChatStoreFromDisk();
  globalThis.__GLOBAL_CHAT_STORE__ = disk;
  return disk.conversations.find((c) => c.id === id) || null;
}

export async function getMessagesForConversation(convId: string): Promise<ChatMessage[]> {
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
 * Checks for existing conversation by visitorId. Returns the existing conversation
 * if already present, preventing duplicate threads.
 */
export async function getOrCreateVisitorConversation(
  visitorId: string,
  metadata?: Partial<VisitorMetadata>
): Promise<{ conversation: Conversation; isNew: boolean }> {
  triggerMongoSync().catch(() => {});
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
      syncConversationToMongo(updated);
      return { conversation: updated, isNew: false };
    }
    return { conversation: existing, isNew: false };
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

  // Sync to MongoDB in background
  syncConversationToMongo(newConv);
  syncMessageToMongo(welcomeMsg);

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
  const conv = store.conversations.find((c) => c.id === conversationId);
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

  // Sync to MongoDB in background
  syncConversationToMongo(conv);
  syncMessageToMongo(newMsg);

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
  syncConversationToMongo(conv);

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
  syncConversationToMongo(conv);

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
  syncConversationToMongo(conv);

  return conv;
}

export async function resetChatStore(): Promise<void> {
  const empty: ChatStoreData = { conversations: [], messages: {} };
  globalThis.__GLOBAL_CHAT_STORE__ = empty;
  writeChatStoreToDisk(empty);

  if (isMongoConfigured()) {
    try {
      const db = await safeGetDatabase();
      if (db) {
        await db.collection(CONVERSATIONS_COLLECTION).deleteMany({});
        await db.collection(MESSAGES_COLLECTION).deleteMany({});
      }
    } catch {}
  }
}
