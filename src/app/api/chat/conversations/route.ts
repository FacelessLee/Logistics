import { NextRequest, NextResponse } from 'next/server';
import {
  getAllConversations,
  getOrCreateVisitorConversation,
  getMessagesForConversation
} from '@/lib/chatStorage';

export async function GET() {
  try {
    const conversations = await getAllConversations();
    return NextResponse.json(
      { success: true, data: conversations },
      { headers: { 'Cache-Control': 'no-store' } }
    );
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
    const { visitorId, name, email, company, location, currentPage, forceNew } = body || {};

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return NextResponse.json(
        { success: false, error: 'A valid email address is required to connect to support.' },
        { status: 400 }
      );
    }

    const effectiveVisitorId =
      typeof visitorId === 'string' && visitorId.trim()
        ? visitorId.trim()
        : `vis-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const { conversation, isNew } = await getOrCreateVisitorConversation(
      effectiveVisitorId,
      {
        name,
        email: cleanEmail,
        company,
        location,
        currentPage
      },
      Boolean(forceNew)
    );

    const messages = await getMessagesForConversation(conversation.id);

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

export async function DELETE() {
  try {
    const { resetChatStore } = await import('@/lib/chatStorage');
    await resetChatStore();
    return NextResponse.json({
      success: true,
      message: 'All chat conversations and messages purged successfully.'
    });
  } catch (error) {
    console.error('Failed to clear chat store:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear chat conversations' },
      { status: 500 }
    );
  }
}
