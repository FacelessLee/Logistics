export type MessageSender = 'visitor' | 'agent' | 'system';

export type ConversationStatus = 'ACTIVE' | 'PENDING' | 'RESOLVED';

export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: MessageSender;
  senderName: string;
  text: string;
  timestamp: string; // ISO string
  read: boolean;
}

export interface VisitorMetadata {
  visitorId: string;
  name?: string;
  email?: string;
  company?: string;
  location?: string;
  ip?: string;
  currentPage?: string;
  userAgent?: string;
  initialReferrer?: string;
}

export interface Conversation {
  id: string;
  visitorId: string;
  visitorName: string;
  visitorEmail?: string;
  visitorCompany?: string;
  visitorLocation: string;
  currentPage: string;
  status: ConversationStatus;
  unreadCountAgent: number;
  unreadCountVisitor: number;
  createdAt: string;
  updatedAt: string;
  lastMessageText: string;
  lastMessageTimestamp: string;
  assignedAgent: string;
  internalNotes?: string;
  linkedTrackingId?: string;
}

export interface CannedResponse {
  id: string;
  title: string;
  shortcut: string;
  category: 'GREETING' | 'TRACKING' | 'CUSTOMS' | 'RATES' | 'CLOSING';
  content: string;
}
