import { Conversation, ChatMessage, ChatAttachment, MessageSender, ConversationStatus, VisitorMetadata } from './chatTypes';
import { INITIAL_CONVERSATIONS, INITIAL_MESSAGES } from '../data/initialChats';
import { getDatabase, isMongoConfigured } from './mongodb';
import fs from 'fs';
import path from 'path';

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_COLLECTION = 'messages';

let isInitialized = false;
let initPromise: Promise<void> | null = null;

// Fallback in-memory store in case MongoDB is temporarily unavailable
declare global {
  // eslint-disable-next-line no-var
  var __FALLBACK_CHAT_CONVERSATIONS__: Conversation[] | undefined;
  // eslint-disable-next-line no-var
  var __FALLBACK_CHAT_MESSAGES__: Record<string, ChatMessage[]> | undefined;
}

function initFallbackStores() {
  if (!globalThis.__FALLBACK_CHAT_CONVERSATIONS__ || !globalThis.__FALLBACK_CHAT_MESSAGES__) {
    globalThis.__FALLBACK_CHAT_CONVERSATIONS__ = JSON.parse(JSON.stringify(INITIAL_CONVERSATIONS));
    globalThis.__FALLBACK_CHAT_MESSAGES__ = JSON.parse(JSON.stringify(INITIAL_MESSAGES));
  }
}

async function ensureDbInitialized(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (!isMongoConfigured()) {
        console.warn('[ChatStorage] MONGODB_URI not configured, using in-memory store');
        initFallbackStores();
        isInitialized = true;
        return;
      }

      const db = await getDatabase();
      const conversationsCol = db.collection<Conversation>(CONVERSATIONS_COLLECTION);
      const messagesCol = db.collection<ChatMessage>(MESSAGES_COLLECTION);

      // Create helpful indexes
      await Promise.allSettled([
        conversationsCol.createIndex({ id: 1 }, { unique: true }),
        conversationsCol.createIndex({ visitorId: 1 }),
        conversationsCol.createIndex({ updatedAt: -1 }),
        messagesCol.createIndex({ id: 1 }, { unique: true }),
        messagesCol.createIndex({ conversationId: 1, timestamp: 1 }),
      ]);

      const count = await conversationsCol.countDocuments();
      if (count === 0) {
        console.log('[ChatStorage] Initializing MongoDB chat collections...');
        let seedConversations = INITIAL_CONVERSATIONS;
        let seedMessagesMap = INITIAL_MESSAGES;

        // Check if existing .data/chat-store.json has previous conversations
        try {
          const dataFile = path.join(process.cwd(), '.data', 'chat-store.json');
          if (fs.existsSync(dataFile)) {
            const raw = fs.readFileSync(dataFile, 'utf-8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.conversations) && parsed.conversations.length > 0) {
              seedConversations = parsed.conversations;
              if (parsed.messages && typeof parsed.messages === 'object') {
                seedMessagesMap = parsed.messages;
              }
            }
          }
        } catch (err) {
          console.warn('[ChatStorage] Could not read local chat-store.json for initial seed:', err);
        }

        // Insert conversations
        if (seedConversations.length > 0) {
          const convDocs = seedConversations.map((c) => ({ ...c }));
          await conversationsCol.insertMany(convDocs as any);
        }

        // Flatten messages
        const allMessages: ChatMessage[] = [];
        for (const convId of Object.keys(seedMessagesMap)) {
          const msgs = seedMessagesMap[convId] || [];
          for (const msg of msgs) {
            allMessages.push({ ...msg });
          }
        }

        if (allMessages.length > 0) {
          await messagesCol.insertMany(allMessages as any);
        }

        console.log(`[ChatStorage] Seeded ${seedConversations.length} conversations and ${allMessages.length} messages.`);
      }

      isInitialized = true;
    } catch (err) {
      console.error('[ChatStorage] Failed to initialize MongoDB, using fallback in-memory:', err);
      initFallbackStores();
      isInitialized = true;
    }
  })();

  return initPromise;
}

export async function getAllConversations(): Promise<Conversation[]> {
  await ensureDbInitialized();
  try {
    const db = await getDatabase();
    const docs = await db
      .collection<Conversation>(CONVERSATIONS_COLLECTION)
      .find({}, { projection: { _id: 0 } })
      .sort({ updatedAt: -1 })
      .toArray();

    return docs;
  } catch (err) {
    console.error('[ChatStorage] getAllConversations error, falling back:', err);
    initFallbackStores();
    return [...globalThis.__FALLBACK_CHAT_CONVERSATIONS__!].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
}

export async function getConversationById(id: string): Promise<Conversation | null> {
  await ensureDbInitialized();
  try {
    const db = await getDatabase();
    const doc = await db
      .collection<Conversation>(CONVERSATIONS_COLLECTION)
      .findOne({ id }, { projection: { _id: 0 } });

    return doc || null;
  } catch (err) {
    console.error('[ChatStorage] getConversationById error, falling back:', err);
    initFallbackStores();
    return globalThis.__FALLBACK_CHAT_CONVERSATIONS__!.find((c) => c.id === id) || null;
  }
}

export async function getMessagesForConversation(convId: string): Promise<ChatMessage[]> {
  await ensureDbInitialized();
  try {
    const db = await getDatabase();
    const docs = await db
      .collection<ChatMessage>(MESSAGES_COLLECTION)
      .find({ conversationId: convId }, { projection: { _id: 0 } })
      .sort({ timestamp: 1 })
      .toArray();

    return docs;
  } catch (err) {
    console.error('[ChatStorage] getMessagesForConversation error, falling back:', err);
    initFallbackStores();
    return globalThis.__FALLBACK_CHAT_MESSAGES__![convId] || [];
  }
}

export async function getOrCreateVisitorConversation(
  visitorId: string,
  metadata?: Partial<VisitorMetadata>
): Promise<{ conversation: Conversation; isNew: boolean }> {
  await ensureDbInitialized();
  try {
    const db = await getDatabase();
    const conversationsCol = db.collection<Conversation>(CONVERSATIONS_COLLECTION);
    const messagesCol = db.collection<ChatMessage>(MESSAGES_COLLECTION);

    const existing = await conversationsCol.findOne({ visitorId }, { projection: { _id: 0 } });
    if (existing) {
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
        await conversationsCol.updateOne({ visitorId }, { $set: updates });
        return { conversation: { ...existing, ...updates }, isNew: false };
      }
      return { conversation: existing, isNew: false };
    }

    // Create new conversation
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

    await conversationsCol.insertOne({ ...newConv } as any);

    const welcomeMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      conversationId: newConvId,
      sender: 'agent',
      senderName: 'David M. (Operations)',
      text: welcomeMessageText,
      timestamp: now,
      read: false
    };

    await messagesCol.insertOne({ ...welcomeMsg } as any);

    return { conversation: newConv, isNew: true };
  } catch (err) {
    console.error('[ChatStorage] getOrCreateVisitorConversation error, falling back:', err);
    initFallbackStores();
    const conversations = globalThis.__FALLBACK_CHAT_CONVERSATIONS__!;
    let conv = conversations.find((c) => c.visitorId === visitorId);
    if (conv) return { conversation: conv, isNew: false };

    const newConvId = `conv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();
    conv = {
      id: newConvId,
      visitorId,
      visitorName: metadata?.name || `Visitor #${visitorId.slice(-4).toUpperCase()}`,
      visitorLocation: metadata?.location || 'International Visitor',
      currentPage: metadata?.currentPage || '/',
      status: 'ACTIVE',
      unreadCountAgent: 0,
      unreadCountVisitor: 1,
      createdAt: now,
      updatedAt: now,
      lastMessageText: 'Welcome to Navithon Operations!',
      lastMessageTimestamp: now,
      assignedAgent: 'David M. (Operations)'
    };
    conversations.unshift(conv);
    return { conversation: conv, isNew: true };
  }
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
  await ensureDbInitialized();
  try {
    const db = await getDatabase();
    const conversationsCol = db.collection<Conversation>(CONVERSATIONS_COLLECTION);
    const messagesCol = db.collection<ChatMessage>(MESSAGES_COLLECTION);

    const conv = await conversationsCol.findOne({ id: conversationId }, { projection: { _id: 0 } });
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

    await messagesCol.insertOne({ ...newMsg } as any);

    const updateFields: any = {
      lastMessageText: newMsg.text || (newMsg.attachment ? `[Attachment] ${newMsg.attachment.name}` : 'New message'),
      lastMessageTimestamp: now,
      updatedAt: now,
    };

    const incFields: any = {};
    if (messageData.sender === 'visitor') {
      incFields.unreadCountAgent = 1;
      if (conv.status === 'RESOLVED') {
        updateFields.status = 'ACTIVE';
      }
    } else if (messageData.sender === 'agent') {
      incFields.unreadCountVisitor = 1;
    }

    const updateDoc: any = { $set: updateFields };
    if (Object.keys(incFields).length > 0) {
      updateDoc.$inc = incFields;
    }

    await conversationsCol.updateOne({ id: conversationId }, updateDoc);

    const updatedConv = await conversationsCol.findOne({ id: conversationId }, { projection: { _id: 0 } });

    return {
      message: newMsg,
      conversation: updatedConv || { ...conv, ...updateFields }
    };
  } catch (err) {
    console.error('[ChatStorage] addChatMessage error, falling back:', err);
    initFallbackStores();
    const conv = globalThis.__FALLBACK_CHAT_CONVERSATIONS__!.find((c) => c.id === conversationId);
    if (!conv) throw new Error(`Conversation not found: ${conversationId}`);

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

    if (!globalThis.__FALLBACK_CHAT_MESSAGES__![conversationId]) {
      globalThis.__FALLBACK_CHAT_MESSAGES__![conversationId] = [];
    }
    globalThis.__FALLBACK_CHAT_MESSAGES__![conversationId].push(newMsg);

    conv.lastMessageText = newMsg.text || 'New message';
    conv.lastMessageTimestamp = now;
    conv.updatedAt = now;
    if (messageData.sender === 'visitor') conv.unreadCountAgent += 1;
    else if (messageData.sender === 'agent') conv.unreadCountVisitor += 1;

    return { message: newMsg, conversation: conv };
  }
}

export async function updateConversationStatus(
  id: string,
  status: ConversationStatus
): Promise<Conversation | null> {
  await ensureDbInitialized();
  try {
    const db = await getDatabase();
    const conversationsCol = db.collection<Conversation>(CONVERSATIONS_COLLECTION);
    const now = new Date().toISOString();

    await conversationsCol.updateOne({ id }, { $set: { status, updatedAt: now } });
    return await conversationsCol.findOne({ id }, { projection: { _id: 0 } });
  } catch (err) {
    console.error('[ChatStorage] updateConversationStatus error:', err);
    initFallbackStores();
    const conv = globalThis.__FALLBACK_CHAT_CONVERSATIONS__!.find((c) => c.id === id);
    if (!conv) return null;
    conv.status = status;
    conv.updatedAt = new Date().toISOString();
    return conv;
  }
}

export async function updateConversationNotes(
  id: string,
  notes: string,
  linkedTrackingId?: string
): Promise<Conversation | null> {
  await ensureDbInitialized();
  try {
    const db = await getDatabase();
    const conversationsCol = db.collection<Conversation>(CONVERSATIONS_COLLECTION);
    const now = new Date().toISOString();

    const updateFields: Partial<Conversation> = {
      internalNotes: notes,
      updatedAt: now
    };
    if (linkedTrackingId !== undefined) {
      updateFields.linkedTrackingId = linkedTrackingId;
    }

    await conversationsCol.updateOne({ id }, { $set: updateFields });
    return await conversationsCol.findOne({ id }, { projection: { _id: 0 } });
  } catch (err) {
    console.error('[ChatStorage] updateConversationNotes error:', err);
    initFallbackStores();
    const conv = globalThis.__FALLBACK_CHAT_CONVERSATIONS__!.find((c) => c.id === id);
    if (!conv) return null;
    conv.internalNotes = notes;
    if (linkedTrackingId !== undefined) conv.linkedTrackingId = linkedTrackingId;
    conv.updatedAt = new Date().toISOString();
    return conv;
  }
}

export async function markConversationRead(
  id: string,
  reader: 'agent' | 'visitor'
): Promise<Conversation | null> {
  await ensureDbInitialized();
  try {
    const db = await getDatabase();
    const conversationsCol = db.collection<Conversation>(CONVERSATIONS_COLLECTION);
    const messagesCol = db.collection<ChatMessage>(MESSAGES_COLLECTION);

    const updateDoc: any = {};
    if (reader === 'agent') {
      updateDoc.$set = { unreadCountAgent: 0 };
      await messagesCol.updateMany({ conversationId: id, sender: 'visitor' }, { $set: { read: true } });
    } else {
      updateDoc.$set = { unreadCountVisitor: 0 };
      await messagesCol.updateMany({ conversationId: id, sender: 'agent' }, { $set: { read: true } });
    }

    await conversationsCol.updateOne({ id }, updateDoc);
    return await conversationsCol.findOne({ id }, { projection: { _id: 0 } });
  } catch (err) {
    console.error('[ChatStorage] markConversationRead error:', err);
    initFallbackStores();
    const conv = globalThis.__FALLBACK_CHAT_CONVERSATIONS__!.find((c) => c.id === id);
    if (!conv) return null;
    if (reader === 'agent') conv.unreadCountAgent = 0;
    else conv.unreadCountVisitor = 0;
    return conv;
  }
}

export async function resetChatStore(): Promise<void> {
  await ensureDbInitialized();
  try {
    const db = await getDatabase();
    const conversationsCol = db.collection<Conversation>(CONVERSATIONS_COLLECTION);
    const messagesCol = db.collection<ChatMessage>(MESSAGES_COLLECTION);

    await conversationsCol.deleteMany({});
    await messagesCol.deleteMany({});

    const convDocs = INITIAL_CONVERSATIONS.map((c) => ({ ...c }));
    await conversationsCol.insertMany(convDocs as any);

    const allMessages: ChatMessage[] = [];
    for (const convId of Object.keys(INITIAL_MESSAGES)) {
      const msgs = INITIAL_MESSAGES[convId] || [];
      for (const msg of msgs) {
        allMessages.push({ ...msg });
      }
    }
    if (allMessages.length > 0) {
      await messagesCol.insertMany(allMessages as any);
    }
    console.log('[ChatStorage] Chat store reset to default seed data in MongoDB');
  } catch (err) {
    console.error('[ChatStorage] resetChatStore error:', err);
    initFallbackStores();
    globalThis.__FALLBACK_CHAT_CONVERSATIONS__ = JSON.parse(JSON.stringify(INITIAL_CONVERSATIONS));
    globalThis.__FALLBACK_CHAT_MESSAGES__ = JSON.parse(JSON.stringify(INITIAL_MESSAGES));
  }
}
