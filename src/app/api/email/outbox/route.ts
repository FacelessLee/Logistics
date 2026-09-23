import { NextResponse } from 'next/server';
import { getRecentDispatchedEmails } from '@/lib/emailService';

export async function GET() {
  const outbox = getRecentDispatchedEmails();
  return NextResponse.json({
    success: true,
    count: outbox.length,
    data: outbox
  });
}
