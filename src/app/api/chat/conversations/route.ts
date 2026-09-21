import { NextRequest, NextResponse } from 'next/server';
import {
  getAllConversations,
  getOrCreateVisitorConversation,
  getMessagesForConversation
} from '@/lib/chatStorage';

export async function GET() {
  try {
    const conversations = getAllConversations();
    return NextResponse.json({ success: true, data: conversations });
  } catch (error) {
    console.error('Failed to get conversations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error fetching conversations' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { visitorId, name, email, company, location, currentPage } = body;

    if (!visitorId || typeof visitorId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'visitorId string is required' },
        { status: 400 }
      );
    }

    const { conversation, isNew } = getOrCreateVisitorConversation(visitorId, {
      name,
      email,
      company,
      location,
      currentPage
    });

    const messages = getMessagesForConversation(conversation.id);

    return NextResponse.json({
      success: true,
      data: conversation,
      messages,
      isNew
    });
  } catch (error) {
    console.error('Failed to create/resume conversation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create or retrieve conversation' },
      { status: 500 }
    );
  }
}
