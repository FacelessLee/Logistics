import { NextRequest, NextResponse } from 'next/server';
import { getConsignmentByIdAsync } from '@/lib/storage';
import { sendStatusUpdateEmail, sendNewConsignmentEmail } from '@/lib/emailService';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Tracking ID is required.' },
        { status: 400 }
      );
    }

    const consignment = await getConsignmentByIdAsync(id);
    if (!consignment) {
      return NextResponse.json(
        { success: false, error: `Consignment with ID "${id}" not found.` },
        { status: 404 }
      );
    }

    let body: { recipientEmail?: string; reportType?: 'STATUS' | 'CONFIRMATION' } = {};
    try {
      body = await request.json();
    } catch {
      // body is optional
    }

    const recipient = body.recipientEmail?.trim() || undefined;
    const reportType = body.reportType || 'STATUS';

    let result;
    if (reportType === 'CONFIRMATION') {
      result = await sendNewConsignmentEmail(consignment, recipient);
    } else {
      const latestCheckpoint = consignment.checkpoints.length > 0
        ? consignment.checkpoints[consignment.checkpoints.length - 1]
        : {
            id: `cp-${Date.now()}`,
            timestamp: consignment.createdAt,
            status: consignment.status,
            title: `Consignment Status: ${consignment.status}`,
            location: consignment.currentLocation,
            description: `Current consignment position: ${consignment.currentLocation}`,
            facility: 'Navithon Hub'
          };
      result = await sendStatusUpdateEmail(consignment, latestCheckpoint, recipient);
    }

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Status report email with waybill copy dispatched to ${result.recipients.join(', ')}`
        : `Failed to dispatch email: ${result.error || 'Unknown error'}`,
      data: {
        trackingId: consignment.trackingId,
        recipients: result.recipients,
        resendId: result.resendId,
        error: result.error
      }
    }, { status: result.success ? 200 : 500 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error sending report email';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
