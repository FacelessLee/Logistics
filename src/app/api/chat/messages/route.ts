import { NextRequest, NextResponse } from 'next/server';
import {
  addChatMessage,
  getMessagesForConversation,
  getConversationById
} from '@/lib/chatStorage';
import { MessageSender } from '@/lib/chatTypes';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'conversationId parameter is required' },
        { status: 400 }
      );
    }

    const messages = getMessagesForConversation(conversationId);
    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    console.error('Failed to get messages:', error);
    return NextResponse.json(
      { success: false, error: 'Server error retrieving messages' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, sender, senderName, text } = body;

    if (!conversationId || !sender || !text || !text.trim()) {
      return NextResponse.json(
        { success: false, error: 'conversationId, sender, and text are required' },
        { status: 400 }
      );
    }

    const conv = getConversationById(conversationId);
    if (!conv) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const effectiveSenderName =
      senderName || (sender === 'agent' ? 'David M. (Operations)' : conv.visitorName);

    const result = addChatMessage(conversationId, {
      sender: sender as MessageSender,
      senderName: effectiveSenderName,
      text: text.trim()
    });

    return NextResponse.json({
      success: true,
      data: result.message,
      conversation: result.conversation
    });
  } catch (error) {
    console.error('Failed to post message:', error);
    return NextResponse.json(
      { success: false, error: 'Server error saving chat message' },
      { status: 500 }
    );
  }
}
