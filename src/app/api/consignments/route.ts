import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getAllConsignmentsAsync, addConsignment, getConsignmentByIdAsync } from '@/lib/storage';
import { generateTrackingId } from '@/lib/utils';
import { Consignment, Checkpoint } from '@/lib/types';
import { sendNewConsignmentEmail } from '@/lib/emailService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase().trim();
    const status = searchParams.get('status');

    let consignments = await getAllConsignmentsAsync();

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

    if (!body.receiver?.name || !body.packageDetails?.description) {
      return NextResponse.json(
        { success: false, error: 'Receiver name and Package description are required.' },
        { status: 400 }
      );
    }

    // Idempotency Check: if trackingId was explicitly provided and already registered, return existing record
    if (body.trackingId && typeof body.trackingId === 'string') {
      const existing = await getConsignmentByIdAsync(body.trackingId.trim());
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

    const senderName = body.sender?.name?.trim() || 'Authorized Shipper';
    const senderCity = body.sender?.city?.trim() || '';
    const senderCountry = body.sender?.country?.trim() || '';
    const originLocation = (senderCity && senderCountry)
      ? `${senderCity}, ${senderCountry}`
      : (senderCity || senderCountry || 'Central Hub / Origin Terminal');

    const receiverCity = body.receiver?.city?.trim() || '';
    const receiverCountry = body.receiver?.country?.trim() || '';
    const destinationLocation = (receiverCity && receiverCountry)
      ? `${receiverCity}, ${receiverCountry}`
      : (receiverCity || receiverCountry || 'Destination Terminal');

    const currentLocation = senderCity ? `${senderCity} Dispatch Center` : 'Central Hub Dispatch Terminal';

    const initialCheckpoint: Checkpoint = {
      id: `cp-${Date.now()}-init`,
      timestamp: now,
      status: 'ORDER_CREATED',
      title: 'Consignment Registered & Tracking Assigned',
      location: originLocation,
      description: `Shipping instructions recorded for ${body.packageDetails?.pieceCount || 1} piece(s) (${body.packageDetails?.weightKg || 1} kg). Waybill generated.`,
      facility: 'Navithon Central Dispatch & Booking Terminal'
    };

    // If packageImage is provided as Base64 data URL, cache to public uploads folder for high-availability access
    const rawImage = body.packageDetails?.packageImage;
    let savedPackageImage: string | undefined = typeof rawImage === 'string' && rawImage.trim().length > 0 ? rawImage : undefined;

    if (savedPackageImage && savedPackageImage.startsWith('data:image/')) {
      try {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'packages');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const base64Data = savedPackageImage.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(path.join(uploadDir, `${trackingId}.jpg`), buffer);
      } catch (imgErr) {
        console.warn('[API Consignments] Could not cache package image to public disk:', imgErr);
      }
    }

    const newConsignment: Consignment = {
      trackingId,
      status: 'ORDER_CREATED',
      createdAt: now,
      estimatedDelivery: body.estimatedDelivery || new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      transportMode: body.transportMode || 'AIR_FREIGHT',
      serviceTier: body.serviceTier || 'STANDARD_CARGO',
      sender: {
        name: senderName,
        company: body.sender?.company?.trim() || '',
        address: body.sender?.address?.trim() || '',
        city: senderCity,
        country: senderCountry,
        phone: body.sender?.phone?.trim() || '',
        email: body.sender?.email?.trim() || ''
      },
      receiver: {
        name: body.receiver.name,
        company: body.receiver.company || '',
        address: body.receiver.address || '',
        city: receiverCity,
        country: receiverCountry,
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
        specialHandling: body.packageDetails.specialHandling || 'Standard handling procedure',
        packageImage: savedPackageImage
      },
      carrier: body.carrier || {
        name: 'Navithon Global Logistics Express',
        serviceCode: 'NVT-STD-CARGO'
      },
      originLocation,
      destinationLocation,
      currentLocation,
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
