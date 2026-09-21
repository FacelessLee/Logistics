import { NextResponse } from 'next/server';
import { resetChatStore, getAllConversations } from '@/lib/chatStorage';

export async function POST() {
  try {
    resetChatStore();
    const refreshed = getAllConversations();
    return NextResponse.json({ success: true, data: refreshed });
  } catch (error) {
    console.error('Failed to reset chat store:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset chat store' },
      { status: 500 }
    );
  }
}
