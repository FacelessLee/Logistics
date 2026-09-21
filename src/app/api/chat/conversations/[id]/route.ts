import { NextRequest, NextResponse } from 'next/server';
import {
  getConversationById,
  getMessagesForConversation,
  updateConversationStatus,
  updateConversationNotes,
  markConversationRead
} from '@/lib/chatStorage';
import { ConversationStatus } from '@/lib/chatTypes';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversation = getConversationById(id);
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const messages = getMessagesForConversation(id);
    return NextResponse.json({
      success: true,
      data: conversation,
      messages
    });
  } catch (error) {
    console.error('Failed to get conversation:', error);
    return NextResponse.json(
      { success: false, error: 'Server error retrieving conversation' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, notes, linkedTrackingId, markReadBy } = body;

    let conv = getConversationById(id);
    if (!conv) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    if (status) {
      conv = updateConversationStatus(id, status as ConversationStatus);
    }

    if (notes !== undefined || linkedTrackingId !== undefined) {
      conv = updateConversationNotes(id, notes ?? conv?.internalNotes ?? '', linkedTrackingId);
    }

    if (markReadBy === 'agent' || markReadBy === 'visitor') {
      conv = markConversationRead(id, markReadBy);
    }

    return NextResponse.json({
      success: true,
      data: conv
    });
  } catch (error) {
    console.error('Failed to update conversation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}
