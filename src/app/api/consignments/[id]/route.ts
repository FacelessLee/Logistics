import { NextRequest, NextResponse } from 'next/server';
import { getConsignmentByIdAsync, updateConsignment, addCheckpointToConsignment } from '@/lib/storage';
import { sendStatusUpdateEmail } from '@/lib/emailService';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
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
        { success: false, error: `No consignment found with tracking ID "${id}".` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: consignment
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching consignment';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const existing = await getConsignmentByIdAsync(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Consignment "${id}" not found.` },
        { status: 404 }
      );
    }

    // If checkpoint is provided, append it
    if (body.checkpoint) {
      const updated = addCheckpointToConsignment(id, body.checkpoint);
      if (updated && updated.checkpoints.length > 0) {
        const latestCheckpoint = updated.checkpoints[updated.checkpoints.length - 1];
        try {
          await sendStatusUpdateEmail(updated, latestCheckpoint);
        } catch (err) {
          console.error('[API PATCH] Error sending status email:', err);
        }
      }
      return NextResponse.json({
        success: true,
        message: 'Checkpoint added successfully',
        data: updated
      });
    }

    // Otherwise apply partial updates
    const updated = updateConsignment(id, body);
    if (updated && body.status && body.status !== existing.status) {
      const latestCheckpoint = updated.checkpoints.length > 0
        ? updated.checkpoints[updated.checkpoints.length - 1]
        : {
            id: `cp-${Date.now()}`,
            timestamp: new Date().toISOString(),
            status: updated.status,
            title: `Consignment status updated to ${updated.status}`,
            location: updated.currentLocation,
            description: `Status changed to ${updated.status}`,
            facility: 'Navithon Hub'
          };
      try {
        await sendStatusUpdateEmail(updated, latestCheckpoint);
      } catch (err) {
        console.error('[API PATCH] Error sending status email:', err);
      }
    }
    return NextResponse.json({
      success: true,
      message: 'Consignment updated successfully',
      data: updated
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error updating consignment';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
