import { Conversation, ChatMessage, MessageSender, ConversationStatus, VisitorMetadata } from './chatTypes';
import { INITIAL_CONVERSATIONS, INITIAL_MESSAGES } from '../data/initialChats';
import fs from 'fs';
import path from 'path';

declare global {
  // eslint-disable-next-line no-var
  var __CHAT_CONVERSATIONS__: Conversation[] | undefined;
  // eslint-disable-next-line no-var
  var __CHAT_MESSAGES__: Record<string, ChatMessage[]> | undefined;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'chat-store.json');

interface PersistedChatData {
  conversations: Conversation[];
  messages: Record<string, ChatMessage[]>;
}

function loadFromFile(): PersistedChatData | null {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Could not read chat store file, falling back to memory/defaults:', err);
  }
  return null;
}

function saveToFile(conversations: Conversation[], messages: Record<string, ChatMessage[]>) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify({ conversations, messages }, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist chat store file:', err);
  }
}

function initStores() {
  if (!globalThis.__CHAT_CONVERSATIONS__ || !globalThis.__CHAT_MESSAGES__) {
    const fromDisk = loadFromFile();
    if (fromDisk && Array.isArray(fromDisk.conversations) && fromDisk.messages) {
      globalThis.__CHAT_CONVERSATIONS__ = fromDisk.conversations;
      globalThis.__CHAT_MESSAGES__ = fromDisk.messages;
    } else {
      globalThis.__CHAT_CONVERSATIONS__ = JSON.parse(JSON.stringify(INITIAL_CONVERSATIONS));
      globalThis.__CHAT_MESSAGES__ = JSON.parse(JSON.stringify(INITIAL_MESSAGES));
      saveToFile(globalThis.__CHAT_CONVERSATIONS__!, globalThis.__CHAT_MESSAGES__!);
    }
  }
}

export function getAllConversations(): Conversation[] {
  initStores();
  // Return sorted by latest activity descending
  return [...globalThis.__CHAT_CONVERSATIONS__!].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getConversationById(id: string): Conversation | undefined {
  initStores();
  return globalThis.__CHAT_CONVERSATIONS__!.find((c) => c.id === id);
}

export function getMessagesForConversation(convId: string): ChatMessage[] {
  initStores();
  return globalThis.__CHAT_MESSAGES__![convId] || [];
}

export function getOrCreateVisitorConversation(
  visitorId: string,
  metadata?: Partial<VisitorMetadata>
): { conversation: Conversation; isNew: boolean } {
  initStores();
  const conversations = globalThis.__CHAT_CONVERSATIONS__!;
  let conv = conversations.find((c) => c.visitorId === visitorId);

  if (conv) {
    // If metadata provided, update current page or location
    if (metadata?.currentPage) conv.currentPage = metadata.currentPage;
    if (metadata?.name && !conv.visitorName.includes(metadata.name)) conv.visitorName = metadata.name;
    if (metadata?.email) conv.visitorEmail = metadata.email;
    saveToFile(conversations, globalThis.__CHAT_MESSAGES__!);
    return { conversation: conv, isNew: false };
  }

  // Create new conversation
  const newConvId = `conv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const defaultName = metadata?.name || `Visitor #${visitorId.slice(-4).toUpperCase()}`;
  const now = new Date().toISOString();

  const welcomeMessageText =
    'Welcome to Navithon Operations! A dedicated logistics dispatcher is available. How may we assist your freight shipment?';

  conv = {
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

  conversations.unshift(conv);

  // Initial welcome message from the system/agent
  const welcomeMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    conversationId: newConvId,
    sender: 'agent',
    senderName: 'David M. (Operations)',
    text: welcomeMessageText,
    timestamp: now,
    read: false
  };

  globalThis.__CHAT_MESSAGES__![newConvId] = [welcomeMsg];
  saveToFile(conversations, globalThis.__CHAT_MESSAGES__!);

  return { conversation: conv, isNew: true };
}

export function addChatMessage(
  conversationId: string,
  messageData: {
    sender: MessageSender;
    senderName: string;
    text: string;
  }
): { message: ChatMessage; conversation: Conversation } {
  initStores();
  const conv = getConversationById(conversationId);
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
    timestamp: now,
    read: false
  };

  if (!globalThis.__CHAT_MESSAGES__![conversationId]) {
    globalThis.__CHAT_MESSAGES__![conversationId] = [];
  }
  globalThis.__CHAT_MESSAGES__![conversationId].push(newMsg);

  // Update conversation
  conv.lastMessageText = newMsg.text;
  conv.lastMessageTimestamp = now;
  conv.updatedAt = now;

  if (messageData.sender === 'visitor') {
    conv.unreadCountAgent += 1;
    // If conversation was resolved, reopen it
    if (conv.status === 'RESOLVED') {
      conv.status = 'ACTIVE';
    }
  } else if (messageData.sender === 'agent') {
    conv.unreadCountVisitor += 1;
  }

  saveToFile(globalThis.__CHAT_CONVERSATIONS__!, globalThis.__CHAT_MESSAGES__!);

  return { message: newMsg, conversation: conv };
}

export function updateConversationStatus(
  id: string,
  status: ConversationStatus
): Conversation | undefined {
  initStores();
  const conv = getConversationById(id);
  if (!conv) return undefined;
  conv.status = status;
  conv.updatedAt = new Date().toISOString();
  saveToFile(globalThis.__CHAT_CONVERSATIONS__!, globalThis.__CHAT_MESSAGES__!);
  return conv;
}

export function updateConversationNotes(
  id: string,
  notes: string,
  linkedTrackingId?: string
): Conversation | undefined {
  initStores();
  const conv = getConversationById(id);
  if (!conv) return undefined;
  conv.internalNotes = notes;
  if (linkedTrackingId !== undefined) {
    conv.linkedTrackingId = linkedTrackingId;
  }
  conv.updatedAt = new Date().toISOString();
  saveToFile(globalThis.__CHAT_CONVERSATIONS__!, globalThis.__CHAT_MESSAGES__!);
  return conv;
}

export function markConversationRead(
  id: string,
  reader: 'agent' | 'visitor'
): Conversation | undefined {
  initStores();
  const conv = getConversationById(id);
  if (!conv) return undefined;

  if (reader === 'agent') {
    conv.unreadCountAgent = 0;
  } else {
    conv.unreadCountVisitor = 0;
  }

  // Mark all messages in conversation as read for this party
  const messages = globalThis.__CHAT_MESSAGES__![id];
  if (messages) {
    messages.forEach((m) => {
      if (reader === 'agent' && m.sender === 'visitor') m.read = true;
      if (reader === 'visitor' && m.sender === 'agent') m.read = true;
    });
  }

  saveToFile(globalThis.__CHAT_CONVERSATIONS__!, globalThis.__CHAT_MESSAGES__!);
  return conv;
}

export function resetChatStore(): void {
  globalThis.__CHAT_CONVERSATIONS__ = JSON.parse(JSON.stringify(INITIAL_CONVERSATIONS));
  globalThis.__CHAT_MESSAGES__ = JSON.parse(JSON.stringify(INITIAL_MESSAGES));
  saveToFile(globalThis.__CHAT_CONVERSATIONS__!, globalThis.__CHAT_MESSAGES__!);
}
