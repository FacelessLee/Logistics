import { NextRequest, NextResponse } from 'next/server';
import { getAllConsignments, addConsignment, getConsignmentById } from '@/lib/storage';
import { generateTrackingId } from '@/lib/utils';
import { Consignment, Checkpoint } from '@/lib/types';
import { sendNewConsignmentEmail } from '@/lib/emailService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase().trim();
    const status = searchParams.get('status');

    let consignments = getAllConsignments();

    if (query) {
      consignments = consignments.filter((c) =>
        c.trackingId.toLowerCase().includes(query) ||
        c.sender.name.toLowerCase().includes(query) ||
        c.receiver.name.toLowerCase().includes(query) ||
        c.originLocation.toLowerCase().includes(query) ||
        c.destinationLocation.toLowerCase().includes(query) ||
        c.packageDetails.description.toLowerCase().includes(query)
      );
    }

    if (status && status !== 'ALL') {
      consignments = consignments.filter((c) => c.status === status);
    }

    return NextResponse.json({
      success: true,
      count: consignments.length,
      data: consignments
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.sender?.name || !body.receiver?.name || !body.packageDetails?.description) {
      return NextResponse.json(
        { success: false, error: 'Sender name, Receiver name, and Package description are required.' },
        { status: 400 }
      );
    }

    // Idempotency Check: if trackingId was explicitly provided and already registered, return existing record
    if (body.trackingId && typeof body.trackingId === 'string') {
      const existing = getConsignmentById(body.trackingId.trim());
      if (existing) {
        return NextResponse.json({
          success: true,
          message: `Consignment #${existing.trackingId} already registered (Idempotent response)`,
          data: existing,
          isIdempotent: true
        }, { status: 200 });
      }
    }

    const prefix = body.transportMode === 'OCEAN_CARGO' ? 'SEA' :
                   body.transportMode === 'ROAD_EXPRESS' ? 'ROD' :
                   body.serviceTier === 'EXPRESS_PRIORITY' ? 'EXP' : 'TRK';

    const trackingId = body.trackingId?.trim().toUpperCase() || generateTrackingId(prefix);
    const now = new Date().toISOString();

    const initialCheckpoint: Checkpoint = {
      id: `cp-${Date.now()}-init`,
      timestamp: now,
      status: 'ORDER_CREATED',
      title: 'Consignment Registered & Tracking Assigned',
      location: `${body.sender.city || 'Origin Terminal'}, ${body.sender.country || ''}`,
      description: `Shipping instructions recorded for ${body.packageDetails.pieceCount || 1} piece(s) (${body.packageDetails.weightKg || 1} kg). Waybill generated.`,
      facility: 'Navithon Central Dispatch & Booking Terminal'
    };

    const newConsignment: Consignment = {
      trackingId,
      status: 'ORDER_CREATED',
      createdAt: now,
      estimatedDelivery: body.estimatedDelivery || new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      transportMode: body.transportMode || 'AIR_FREIGHT',
      serviceTier: body.serviceTier || 'STANDARD_CARGO',
      sender: {
        name: body.sender.name,
        company: body.sender.company || '',
        address: body.sender.address || '',
        city: body.sender.city || '',
        country: body.sender.country || '',
        phone: body.sender.phone || '',
        email: body.sender.email || ''
      },
      receiver: {
        name: body.receiver.name,
        company: body.receiver.company || '',
        address: body.receiver.address || '',
        city: body.receiver.city || '',
        country: body.receiver.country || '',
        phone: body.receiver.phone || '',
        email: body.receiver.email || ''
      },
      packageDetails: {
        description: body.packageDetails.description,
        category: body.packageDetails.category || 'General Cargo',
        pieceCount: Number(body.packageDetails.pieceCount) || 1,
        weightKg: Number(body.packageDetails.weightKg) || 1.0,
        dimensionsCm: body.packageDetails.dimensionsCm || { length: 30, width: 25, height: 20 },
        declaredValue: body.packageDetails.declaredValue || { amount: 500, currency: 'USD' },
        isFragile: Boolean(body.packageDetails.isFragile),
        temperatureControlled: Boolean(body.packageDetails.temperatureControlled),
        specialHandling: body.packageDetails.specialHandling || 'Standard handling procedure'
      },
      carrier: body.carrier || {
        name: 'Navithon Global Logistics Express',
        serviceCode: 'NVT-STD-CARGO'
      },
      originLocation: `${body.sender.city || 'Origin'}, ${body.sender.country || ''}`,
      destinationLocation: `${body.receiver.city || 'Destination'}, ${body.receiver.country || ''}`,
      currentLocation: `${body.sender.city || 'Origin'} Dispatch Center`,
      checkpoints: [initialCheckpoint],
      notes: body.notes || 'Consignment created via online booking portal.',
      signatureRequired: body.signatureRequired !== false
    };

    const saved = addConsignment(newConsignment);

    // Trigger asynchronous confirmation email with attached waybill PDF
    let emailResult: { success: boolean; recipients: string[]; error?: string; resendId?: string } = {
      success: false,
      recipients: []
    };
    try {
      emailResult = await sendNewConsignmentEmail(saved);
    } catch (emailErr) {
      console.error('[API Consignments] Failed to dispatch new consignment confirmation email:', emailErr);
      emailResult.error = emailErr instanceof Error ? emailErr.message : 'Unknown email dispatch error';
    }

    return NextResponse.json({
      success: true,
      message: 'Consignment created successfully and confirmation email dispatched',
      data: saved,
      email: {
        dispatched: emailResult.success,
        recipients: emailResult.recipients,
        error: emailResult.error || undefined
      }
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create consignment';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
