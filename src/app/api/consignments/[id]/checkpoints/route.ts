import { NextRequest, NextResponse } from 'next/server';
import { getConsignmentById, addCheckpointToConsignment } from '@/lib/storage';
import { sendStatusUpdateEmail } from '@/lib/emailService';
import { ShipmentStatus } from '@/lib/types';

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

    const existing = getConsignmentById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Consignment with ID "${id}" not found.` },
        { status: 404 }
      );
    }

    const body = await request.json();
    const status: ShipmentStatus = body.status || existing.status;
    const title = body.title || `Status updated to ${status}`;
    const location = body.location || existing.currentLocation;
    const description = body.description || `Milestone recorded at ${location}.`;
    const facility = body.facility || '';

    const updated = addCheckpointToConsignment(id, {
      status,
      title,
      location,
      description,
      facility
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update consignment checkpoint.' },
        { status: 500 }
      );
    }

    const latestCheckpoint = updated.checkpoints[updated.checkpoints.length - 1];

    // Trigger asynchronous email status report to registered parties
    let emailResult: { success: boolean; recipients: string[]; error?: string; resendId?: string } = {
      success: false,
      recipients: []
    };
    try {
      emailResult = await sendStatusUpdateEmail(updated, latestCheckpoint);
    } catch (emailErr) {
      console.error('[API Checkpoints] Failed to dispatch status email:', emailErr);
      emailResult.error = emailErr instanceof Error ? emailErr.message : 'Unknown email error';
    }

    return NextResponse.json({
      success: true,
      message: 'Checkpoint logged successfully and status report email dispatched',
      data: updated,
      email: {
        dispatched: emailResult.success,
        recipients: emailResult.recipients,
        error: emailResult.error || undefined
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error processing checkpoint';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
