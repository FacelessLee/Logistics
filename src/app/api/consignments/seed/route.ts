import { NextResponse } from 'next/server';
import { resetToSeedData } from '@/lib/storage';

export async function POST() {
  try {
    const data = resetToSeedData();
    return NextResponse.json({
      success: true,
      message: 'Consignments reset to original demonstration dataset.',
      count: data.length,
      data
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Reset failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
