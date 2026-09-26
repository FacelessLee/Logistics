import { NextRequest, NextResponse } from 'next/server';
import { getConsignmentByIdAsync } from '@/lib/storage';
import { generateWaybillPdf } from '@/lib/waybillPdf';

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
        { success: false, error: `Consignment with ID "${id}" not found.` },
        { status: 404 }
      );
    }

    const pdfBuffer = generateWaybillPdf(consignment);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Waybill-${consignment.trackingId}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error generating waybill PDF';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
