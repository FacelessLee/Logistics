import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getAllConsignments } from '@/lib/storage';
import { generateWaybillPdf } from '@/lib/waybillPdf';
import { logDispatchedEmail } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetEmail = body.to?.trim() || body.email?.trim();

    if (!targetEmail || !targetEmail.includes('@') || !targetEmail.includes('.')) {
      return NextResponse.json(
        { success: false, error: 'A valid recipient email address is required (e.g. { "to": "yourname@gmail.com" }).' },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'RESEND_API_KEY is missing from .env.local.' },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);
    const consignments = getAllConsignments();
    const sample = consignments[0];

    let pdfBase64 = '';
    if (sample) {
      try {
        const pdfBuf = generateWaybillPdf(sample);
        pdfBase64 = pdfBuf.toString('base64');
      } catch (err) {
        console.error('[EmailTest] Failed to generate PDF:', err);
      }
    }

    const sender = process.env.EMAIL_FROM?.trim() || 'Navithon Logistics <support@navithonlogistics.com>';
    const subject = `[Navithon Logistics] Official Waybill & Verification Delivery Test`;
    const trackingId = sample?.trackingId || 'TRK-VERIFY-001';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #070d18; color: #f1f5f9; padding: 24px; margin: 0; }
    .box { max-width: 600px; margin: 0 auto; background: #0b1325; border: 1px solid #1e293b; border-radius: 12px; padding: 32px; }
    .badge { background: #0284c7; color: white; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: bold; }
    .card { background: #0f172a; border: 1px solid #38bdf8; border-radius: 8px; padding: 18px; margin: 20px 0; }
    .btn { display: inline-block; background: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="box">
    <div style="font-size: 20px; font-weight: 900; color: #38bdf8; margin-bottom: 8px;">NAVITHON LOGISTICS</div>
    <div style="font-size: 13px; color: #94a3b8; text-transform: uppercase; margin-bottom: 20px;">Global Telemetry & Waybill Verification</div>
    <span class="badge">Deliverability Check Passed</span>
    <h2 style="color: #ffffff; margin-top: 16px;">Direct Test Email Receipt Confirmed</h2>
    <p style="color: #cbd5e1; line-height: 1.5;">
      This email confirms that your email server and personal mailbox (<strong>${targetEmail}</strong>) can smoothly receive transactional notices and official Air Waybill attachments from <strong>${sender}</strong>.
    </p>
    <div class="card">
      <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Sample Tracking Number</div>
      <div style="font-size: 22px; font-weight: bold; color: #38bdf8; font-family: monospace; margin: 6px 0;">#${trackingId}</div>
      <div style="font-size: 12px; color: #cbd5e1;">Attached Document: Waybill-${trackingId}.pdf</div>
    </div>
    <p style="font-size: 13px; color: #94a3b8;">
      If this message arrived in your Spam or Promotions folder, mark it as <strong>"Not Spam"</strong> to whitelist Navithon status reports for future bookings.
    </p>
  </div>
</body>
</html>
    `.trim();

    const attachments = pdfBase64 ? [
      {
        filename: `Waybill-${trackingId}.pdf`,
        content: pdfBase64,
        contentType: 'application/pdf'
      }
    ] : [];

    const sendRes = await resend.emails.send({
      from: sender,
      replyTo: 'support@navithonlogistics.com',
      to: [targetEmail],
      subject,
      html,
      attachments
    });

    if (sendRes.error) {
      logDispatchedEmail({
        id: `test-err-${Date.now()}`,
        trackingId,
        type: 'MANUAL_REPORT',
        to: [targetEmail],
        subject,
        timestamp: new Date().toISOString(),
        success: false,
        error: sendRes.error.message,
        hasAttachment: attachments.length > 0
      });

      return NextResponse.json(
        { success: false, error: sendRes.error.message },
        { status: 400 }
      );
    }

    logDispatchedEmail({
      id: sendRes.data?.id || `test-${Date.now()}`,
      trackingId,
      type: 'MANUAL_REPORT',
      to: [targetEmail],
      subject,
      timestamp: new Date().toISOString(),
      success: true,
      resendId: sendRes.data?.id,
      hasAttachment: attachments.length > 0
    });

    return NextResponse.json({
      success: true,
      message: `Test email with attached waybill successfully dispatched to ${targetEmail}`,
      resendId: sendRes.data?.id,
      recipient: targetEmail,
      timestamp: new Date().toISOString()
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
