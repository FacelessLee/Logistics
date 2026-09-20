import { NextRequest, NextResponse } from 'next/server';
import { getConsignmentById, updateConsignment, addCheckpointToConsignment } from '@/lib/storage';

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

    const consignment = getConsignmentById(id);
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

    const existing = getConsignmentById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Consignment "${id}" not found.` },
        { status: 404 }
      );
    }

    // If checkpoint is provided, append it
    if (body.checkpoint) {
      const updated = addCheckpointToConsignment(id, body.checkpoint);
      return NextResponse.json({
        success: true,
        message: 'Checkpoint added successfully',
        data: updated
      });
    }

    // Otherwise apply partial updates
    const updated = updateConsignment(id, body);
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
