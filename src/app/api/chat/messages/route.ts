import { NextRequest, NextResponse } from 'next/server';
import {
  addChatMessage,
  getMessagesForConversation,
  getConversationById
} from '@/lib/chatStorage';
import { ChatAttachment, MessageSender } from '@/lib/chatTypes';

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

    const messages = await getMessagesForConversation(conversationId);
    return NextResponse.json(
      { success: true, data: messages },
      { headers: { 'Cache-Control': 'no-store' } }
    );
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
    const { conversationId, sender, senderName, text, attachment } = body;

    if (!conversationId || !sender || (!text?.trim() && !attachment)) {
      return NextResponse.json(
        { success: false, error: 'conversationId, sender, and text or attachment are required' },
        { status: 400 }
      );
    }

    const validAttachment = attachment &&
      typeof attachment.name === 'string' &&
      typeof attachment.type === 'string' &&
      typeof attachment.size === 'number' &&
      typeof attachment.dataUrl === 'string' &&
      attachment.size <= 5 * 1024 * 1024 &&
      attachment.dataUrl.startsWith(`data:${attachment.type};`)
      ? attachment as ChatAttachment
      : undefined;

    if (attachment && !validAttachment) {
      return NextResponse.json(
        { success: false, error: 'Attachments must be valid files up to 5 MB' },
        { status: 400 }
      );
    }

    const conv = await getConversationById(conversationId);
    if (!conv) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const effectiveSenderName =
      senderName || (sender === 'agent' ? 'David M. (Operations)' : conv.visitorName);

    const result = await addChatMessage(conversationId, {
      sender: sender as MessageSender,
      senderName: effectiveSenderName,
      text: typeof text === 'string' ? text.trim() : '',
      attachment: validAttachment
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
