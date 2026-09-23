import { Resend } from 'resend';
import { Consignment, Checkpoint } from './types';
import { formatDate, getStatusLabel, formatCurrency } from './utils';
import { generateWaybillPdf } from './waybillPdf';

export interface EmailOutboxItem {
  id: string;
  trackingId: string;
  type: 'CONSIGNMENT_CONFIRMATION' | 'STATUS_UPDATE' | 'MANUAL_REPORT';
  to: string[];
  subject: string;
  timestamp: string;
  success: boolean;
  resendId?: string;
  error?: string;
  hasAttachment: boolean;
  previewHtml?: string;
}

// Global in-memory outbox log for auditing and status inspection
declare global {
  // eslint-disable-next-line no-var
  var __EMAIL_OUTBOX_LOG__: EmailOutboxItem[] | undefined;
}

function getOutboxLog(): EmailOutboxItem[] {
  if (!globalThis.__EMAIL_OUTBOX_LOG__) {
    globalThis.__EMAIL_OUTBOX_LOG__ = [];
  }
  return globalThis.__EMAIL_OUTBOX_LOG__;
}

export function logDispatchedEmail(item: EmailOutboxItem) {
  const log = getOutboxLog();
  log.unshift(item);
  // Keep last 100 entries
  if (log.length > 100) {
    log.length = 100;
  }
}

export function getRecentDispatchedEmails(trackingId?: string): EmailOutboxItem[] {
  const log = getOutboxLog();
  if (!trackingId) return log;
  const normalized = trackingId.trim().toUpperCase();
  return log.filter((item) => item.trackingId.toUpperCase() === normalized);
}

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.trim() === '') {
    return null;
  }
  return new Resend(key.trim());
}

function getSenderAddress(): string {
  return process.env.EMAIL_FROM?.trim() || 'Navithon Logistics <support@navithonlogistics.com>';
}

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'https://navithonlogistics.com';
}

function extractRecipients(consignment: Consignment): string[] {
  const recipients = new Set<string>();
  const senderEmail = consignment.sender?.email?.trim().toLowerCase();
  const receiverEmail = consignment.receiver?.email?.trim().toLowerCase();

  const isValid = (email?: string) => Boolean(email && email.includes('@') && email.includes('.'));

  if (isValid(senderEmail)) recipients.add(senderEmail!);
  if (isValid(receiverEmail)) recipients.add(receiverEmail!);

  return Array.from(recipients);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. NEW CONSIGNMENT CONFIRMATION EMAIL (WITH ATTACHED WAYBILL PDF)
// ─────────────────────────────────────────────────────────────────────────────

export async function sendNewConsignmentEmail(
  consignment: Consignment,
  customRecipient?: string
): Promise<{ success: boolean; resendId?: string; error?: string; recipients: string[] }> {
  const recipients = customRecipient ? [customRecipient] : extractRecipients(consignment);

  if (recipients.length === 0) {
    const errorMsg = `No valid recipient email registered for consignment #${consignment.trackingId}.`;
    console.warn(`[EmailService] ${errorMsg}`);
    return { success: false, error: errorMsg, recipients: [] };
  }

  const baseUrl = getBaseUrl();
  const trackingUrl = `${baseUrl}/track/${consignment.trackingId}`;
  const pdfDownloadUrl = `${baseUrl}/api/consignments/${consignment.trackingId}/waybill-pdf`;

  // Generate Official Air Waybill PDF
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = generateWaybillPdf(consignment);
  } catch (pdfErr) {
    console.error('[EmailService] Failed to generate waybill PDF:', pdfErr);
    pdfBuffer = Buffer.from('Navithon Logistics Waybill');
  }

  const subject = `[Navithon Logistics] Consignment Registered & Waybill Issued - #${consignment.trackingId}`;

  // Package dimensions string
  const dims = consignment.packageDetails.dimensionsCm
    ? `${consignment.packageDetails.dimensionsCm.length} x ${consignment.packageDetails.dimensionsCm.width} x ${consignment.packageDetails.dimensionsCm.height} cm`
    : 'Standard dimensions';

  // Handling flags
  const flags: string[] = [];
  if (consignment.packageDetails.isFragile) flags.push('⚠ Fragile Goods');
  if (consignment.packageDetails.temperatureControlled) flags.push('❄ Temperature Controlled');
  if (consignment.signatureRequired) flags.push('✍ Direct Signature Mandatory');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin:0; padding:0; background-color:#070d18; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#f1f5f9; }
    table { border-collapse:collapse; }
    .wrapper { width:100%; max-width:680px; margin:0 auto; background-color:#0b1325; border:1px solid #1e293b; border-radius:12px; overflow:hidden; }
    .header { background:linear-gradient(135deg, #0f172a 0%, #0369a1 100%); padding:32px 28px; text-align:left; border-bottom:1px solid #38bdf8; }
    .logo { font-size:22px; font-weight:900; letter-spacing:1px; color:#ffffff; margin:0; text-transform:uppercase; }
    .subhead { font-size:12px; color:#bae6fd; letter-spacing:0.5px; margin-top:4px; text-transform:uppercase; font-weight:600; }
    .content { padding:28px 24px; }
    .badge { display:inline-block; padding:6px 14px; border-radius:999px; font-size:12px; font-weight:700; background-color:#0284c7; color:#ffffff; letter-spacing:0.5px; text-transform:uppercase; }
    .tracking-card { background:#0f172a; border:2px dashed #0284c7; border-radius:10px; padding:20px; text-align:center; margin:24px 0; }
    .tracking-num { font-size:26px; font-weight:900; color:#38bdf8; letter-spacing:2px; font-family:monospace; margin:8px 0; }
    .section-title { font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; border-bottom:1px solid #1e293b; padding-bottom:8px; margin:28px 0 16px 0; }
    .grid-table { width:100%; margin-bottom:16px; }
    .grid-cell { padding:10px; vertical-align:top; background:#0f172a; border:1px solid #1e293b; border-radius:6px; font-size:13px; }
    .cell-label { font-size:11px; color:#94a3b8; text-transform:uppercase; font-weight:600; margin-bottom:4px; }
    .cell-value { font-weight:700; color:#f8fafc; font-size:14px; }
    .attachment-box { background:linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%); border:1px solid #0284c7; border-radius:8px; padding:18px; margin:24px 0; }
    .btn { display:inline-block; background:#0284c7; color:#ffffff !important; text-decoration:none; padding:14px 30px; border-radius:8px; font-weight:700; font-size:14px; letter-spacing:0.5px; text-align:center; }
    .footer { background:#080e1c; padding:24px; text-align:center; font-size:11px; color:#64748b; border-top:1px solid #1e293b; line-height:1.6; }
    .alert-tag { display:inline-block; background:rgba(239, 68, 68, 0.15); border:1px solid #ef4444; color:#fca5a5; font-size:11px; padding:3px 8px; border-radius:4px; margin-right:6px; margin-top:4px; font-weight:600; }
  </style>
</head>
<body>
  <div style="padding:24px 12px;">
    <div class="wrapper">
      <!-- Header -->
      <div class="header">
        <h1 class="logo">NAVITHON LOGISTICS</h1>
        <div class="subhead">Global Cargo Telemetry & Freight Forwarding</div>
      </div>

      <!-- Main Body -->
      <div class="content">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <span class="badge">Booking Confirmed</span>
          <span style="font-size:12px; color:#94a3b8;">Issued on ${formatDate(consignment.createdAt)}</span>
        </div>

        <h2 style="font-size:20px; font-weight:800; margin:0 0 12px 0; color:#ffffff;">
          Your Consignment is Registered
        </h2>
        <p style="font-size:14px; color:#cbd5e1; line-height:1.5; margin:0 0 20px 0;">
          Dear <strong>${consignment.sender.name}</strong> / <strong>${consignment.receiver.name}</strong>,<br>
          We are pleased to inform you that your international shipping order has been officially processed and logged into the Navithon global dispatch network. An official Air Waybill (AWB) has been generated.
        </p>

        <!-- Tracking Banner -->
        <div class="tracking-card">
          <div style="font-size:11px; text-transform:uppercase; color:#94a3b8; font-weight:700; letter-spacing:1px;">
            OFFICIAL WAYBILL / TRACKING NUMBER
          </div>
          <div class="tracking-num">${consignment.trackingId}</div>
          <div style="font-size:12px; color:#cbd5e1; margin-top:6px;">
            Service Classification: <strong>${consignment.serviceTier.replace(/_/g, ' ')}</strong> (${consignment.transportMode.replace(/_/g, ' ')})
          </div>
        </div>

        <!-- Waybill Attachment Notification -->
        <div class="attachment-box">
          <table style="width:100%;">
            <tr>
              <td style="width:36px; vertical-align:middle; font-size:24px;">📄</td>
              <td style="vertical-align:middle; padding-left:12px;">
                <div style="font-weight:800; font-size:14px; color:#38bdf8;">
                  Official Air Waybill Attached: Waybill-${consignment.trackingId}.pdf
                </div>
                <div style="font-size:12px; color:#94a3b8; margin-top:3px;">
                  A formal, IATA-compliant copy of your cargo waybill is attached to this email. You can also <a href="${pdfDownloadUrl}" style="color:#38bdf8; text-decoration:underline;">download the PDF online</a> anytime.
                </div>
              </td>
            </tr>
          </table>
        </div>

        <!-- Delivery Timeline & Locations -->
        <div class="section-title">Delivery Timeline & Location Details</div>
        <table class="grid-table">
          <tr>
            <td class="grid-cell" style="width:50%;">
              <div class="cell-label">Origin (Shipper)</div>
              <div class="cell-value">${consignment.sender.company || consignment.sender.name}</div>
              <div style="color:#94a3b8; font-size:12px; margin-top:4px;">
                ${consignment.sender.address}<br>
                ${consignment.sender.city}, ${consignment.sender.country}<br>
                Contact: ${consignment.sender.phone || consignment.sender.email}
              </div>
            </td>
            <td class="grid-cell" style="width:50%;">
              <div class="cell-label">Destination (Consignee)</div>
              <div class="cell-value">${consignment.receiver.company || consignment.receiver.name}</div>
              <div style="color:#94a3b8; font-size:12px; margin-top:4px;">
                ${consignment.receiver.address}<br>
                ${consignment.receiver.city}, ${consignment.receiver.country}<br>
                Contact: ${consignment.receiver.phone || consignment.receiver.email}
              </div>
            </td>
          </tr>
        </table>

        <!-- Order / Cargo Specifications -->
        <div class="section-title">Order Specifications & Cargo Details</div>
        <table class="grid-table">
          <tr>
            <td class="grid-cell" style="width:33%;">
              <div class="cell-label">Package Count</div>
              <div class="cell-value">${consignment.packageDetails.pieceCount} Piece(s)</div>
            </td>
            <td class="grid-cell" style="width:33%;">
              <div class="cell-label">Gross Weight</div>
              <div class="cell-value">${consignment.packageDetails.weightKg} kg</div>
            </td>
            <td class="grid-cell" style="width:33%;">
              <div class="cell-label">Estimated Delivery</div>
              <div class="cell-value" style="color:#38bdf8;">${formatDate(consignment.estimatedDelivery)}</div>
            </td>
          </tr>
          <tr>
            <td class="grid-cell" style="width:33%; margin-top:6px;">
              <div class="cell-label">Cargo Dimensions</div>
              <div class="cell-value" style="font-size:12px;">${dims}</div>
            </td>
            <td class="grid-cell" style="width:33%; margin-top:6px;">
              <div class="cell-label">Declared Customs Value</div>
              <div class="cell-value">
                ${formatCurrency(consignment.packageDetails.declaredValue?.amount, consignment.packageDetails.declaredValue?.currency)}
              </div>
            </td>
            <td class="grid-cell" style="width:33%; margin-top:6px;">
              <div class="cell-label">Assigned Carrier</div>
              <div class="cell-value" style="font-size:12px;">${consignment.carrier.name}</div>
            </td>
          </tr>
        </table>

        <div style="background:#0f172a; border:1px solid #1e293b; border-radius:6px; padding:12px; margin-bottom:20px;">
          <div class="cell-label">Description of Goods</div>
          <div style="font-weight:700; color:#ffffff; font-size:14px;">${consignment.packageDetails.description}</div>
          <div style="font-size:12px; color:#94a3b8; margin-top:4px;">Category: ${consignment.packageDetails.category}</div>
          ${
            flags.length > 0
              ? `<div style="margin-top:8px;">${flags.map((f) => `<span class="alert-tag">${f}</span>`).join('')}</div>`
              : ''
          }
          ${
            consignment.packageDetails.specialHandling
              ? `<div style="margin-top:8px; font-size:12px; color:#cbd5e1;"><strong>Handling Instructions:</strong> ${consignment.packageDetails.specialHandling}</div>`
              : ''
          }
        </div>

        <!-- Action Button -->
        <div style="text-align:center; margin:32px 0;">
          <a href="${trackingUrl}" class="btn">
            Track Consignment in Real-Time &rarr;
          </a>
          <div style="margin-top:12px; font-size:12px; color:#94a3b8;">
            Direct tracking link: <a href="${trackingUrl}" style="color:#38bdf8;">${trackingUrl}</a>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <strong>NAVITHON LOGISTICS INTERNATIONAL OPERATIONS COMMAND</strong><br>
        24/7 Global Air & Ocean Freight Telemetry Center<br>
        Inquiries: dispatch@navithonlogistics.com | Direct Support: +1 (800) 849-0129<br>
        <span style="opacity:0.6; display:inline-block; margin-top:8px;">
          This is an automated operational notification. The attached electronic Air Waybill constitutes an official cargo transport record.
        </span>
      </div>
    </div>
  </div>
</body>
</html>
`;

  const text = `
NAVITHON LOGISTICS INTERNATIONAL
CONSIGNMENT REGISTRATION & AIR WAYBILL ISSUED
=============================================================
Tracking / Waybill ID: ${consignment.trackingId}
Date Registered: ${formatDate(consignment.createdAt)}
Estimated Delivery: ${formatDate(consignment.estimatedDelivery)}

ORIGIN (SHIPPER):
${consignment.sender.company || consignment.sender.name}
${consignment.sender.address}, ${consignment.sender.city}, ${consignment.sender.country}
Contact: ${consignment.sender.phone} | ${consignment.sender.email}

DESTINATION (CONSIGNEE):
${consignment.receiver.company || consignment.receiver.name}
${consignment.receiver.address}, ${consignment.receiver.city}, ${consignment.receiver.country}
Contact: ${consignment.receiver.phone} | ${consignment.receiver.email}

CARGO SPECIFICATIONS:
- Description: ${consignment.packageDetails.description} (Category: ${consignment.packageDetails.category})
- Pieces: ${consignment.packageDetails.pieceCount} PKG
- Gross Weight: ${consignment.packageDetails.weightKg} kg
- Dimensions: ${dims}
- Declared Value: ${formatCurrency(consignment.packageDetails.declaredValue?.amount, consignment.packageDetails.declaredValue?.currency)}
- Carrier: ${consignment.carrier.name}
- Service Tier: ${consignment.serviceTier.replace(/_/g, ' ')} (${consignment.transportMode.replace(/_/g, ' ')})

DOCUMENT ATTACHMENT:
The official IATA Air Waybill document (Waybill-${consignment.trackingId}.pdf) has been attached to this email.

TRACK YOUR SHIPMENT LIVE:
${trackingUrl}

Navithon Global Dispatch Command: dispatch@navithonlogistics.com
=============================================================
`.trim();

  const resend = getResendClient();

  if (!resend) {
    const warnMsg = 'RESEND_API_KEY is not configured. Emulating email dispatch.';
    console.warn(`[EmailService] ${warnMsg}`);
    logDispatchedEmail({
      id: `mock-${Date.now()}`,
      trackingId: consignment.trackingId,
      type: 'CONSIGNMENT_CONFIRMATION',
      to: recipients,
      subject,
      timestamp: new Date().toISOString(),
      success: true,
      hasAttachment: true,
      previewHtml: html
    });
    return { success: true, recipients };
  }

  try {
    const res = await resend.emails.send({
      from: getSenderAddress(),
      to: recipients,
      subject,
      html,
      text,
      attachments: [
        {
          filename: `Waybill-${consignment.trackingId}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (res.error) {
      console.error('[EmailService] Resend API returned error:', res.error);
      logDispatchedEmail({
        id: `err-${Date.now()}`,
        trackingId: consignment.trackingId,
        type: 'CONSIGNMENT_CONFIRMATION',
        to: recipients,
        subject,
        timestamp: new Date().toISOString(),
        success: false,
        error: res.error.message,
        hasAttachment: true,
        previewHtml: html
      });
      return { success: false, error: res.error.message, recipients };
    }

    console.log(`[EmailService] Confirmation email sent via Resend: ID ${res.data?.id}`);
    logDispatchedEmail({
      id: res.data?.id || `sent-${Date.now()}`,
      trackingId: consignment.trackingId,
      type: 'CONSIGNMENT_CONFIRMATION',
      to: recipients,
      subject,
      timestamp: new Date().toISOString(),
      success: true,
      resendId: res.data?.id,
      hasAttachment: true,
      previewHtml: html
    });

    return { success: true, resendId: res.data?.id, recipients };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown Resend error';
    console.error('[EmailService] Unexpected error sending email:', err);
    logDispatchedEmail({
      id: `exc-${Date.now()}`,
      trackingId: consignment.trackingId,
      type: 'CONSIGNMENT_CONFIRMATION',
      to: recipients,
      subject,
      timestamp: new Date().toISOString(),
      success: false,
      error: msg,
      hasAttachment: true,
      previewHtml: html
    });
    return { success: false, error: msg, recipients };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CONSIGNMENT STATUS REPORT / MILESTONE UPDATE EMAIL
// ─────────────────────────────────────────────────────────────────────────────

export async function sendStatusUpdateEmail(
  consignment: Consignment,
  checkpoint: Checkpoint,
  customRecipient?: string
): Promise<{ success: boolean; resendId?: string; error?: string; recipients: string[] }> {
  const recipients = customRecipient ? [customRecipient] : extractRecipients(consignment);

  if (recipients.length === 0) {
    const errorMsg = `No valid recipient email registered for consignment #${consignment.trackingId}.`;
    console.warn(`[EmailService] ${errorMsg}`);
    return { success: false, error: errorMsg, recipients: [] };
  }

  const baseUrl = getBaseUrl();
  const trackingUrl = `${baseUrl}/track/${consignment.trackingId}`;
  const pdfDownloadUrl = `${baseUrl}/api/consignments/${consignment.trackingId}/waybill-pdf`;

  // Generate Official Air Waybill PDF copy for attachment as requested
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = generateWaybillPdf(consignment);
  } catch (pdfErr) {
    console.error('[EmailService] Failed to generate waybill PDF for status update:', pdfErr);
    pdfBuffer = Buffer.from('Navithon Logistics Waybill');
  }

  const statusLabel = getStatusLabel(checkpoint.status);
  const subject = `[Navithon Update] #${consignment.trackingId}: ${checkpoint.title} (${statusLabel})`;

  // Status-dependent theme colors
  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    DELIVERED: { bg: '#065f46', text: '#34d399', border: '#10b981' },
    OUT_FOR_DELIVERY: { bg: '#854d0e', text: '#fde047', border: '#eab308' },
    IN_TRANSIT: { bg: '#075985', text: '#38bdf8', border: '#0284c7' },
    CUSTOMS_CLEARANCE: { bg: '#581c87', text: '#e9d5ff', border: '#a855f7' },
    EXCEPTION_ON_HOLD: { bg: '#991b1b', text: '#fca5a5', border: '#ef4444' },
    DEFAULT: { bg: '#1e293b', text: '#94a3b8', border: '#475569' }
  };
  const theme = statusColors[checkpoint.status] || statusColors.DEFAULT;

  // Shipment milestones progress indicator
  const stages = [
    { key: 'ORDER_CREATED', label: 'Registered' },
    { key: 'RECEIVED_AT_FACILITY', label: 'Facility' },
    { key: 'IN_TRANSIT', label: 'In Transit' },
    { key: 'CUSTOMS_CLEARANCE', label: 'Customs' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
    { key: 'DELIVERED', label: 'Delivered' }
  ];

  const currentIdx = stages.findIndex((s) => s.key === checkpoint.status);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin:0; padding:0; background-color:#070d18; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#f1f5f9; }
    table { border-collapse:collapse; }
    .wrapper { width:100%; max-width:680px; margin:0 auto; background-color:#0b1325; border:1px solid #1e293b; border-radius:12px; overflow:hidden; }
    .header { background:linear-gradient(135deg, #0f172a 0%, #0369a1 100%); padding:28px 24px; text-align:left; border-bottom:1px solid #38bdf8; }
    .logo { font-size:20px; font-weight:900; letter-spacing:1px; color:#ffffff; margin:0; text-transform:uppercase; }
    .content { padding:28px 24px; }
    .status-badge { display:inline-block; padding:6px 16px; border-radius:999px; font-size:13px; font-weight:800; background-color:${theme.bg}; color:${theme.text}; border:1px solid ${theme.border}; text-transform:uppercase; }
    .milestone-card { background:#0f172a; border-left:4px solid ${theme.border}; border-top:1px solid #1e293b; border-right:1px solid #1e293b; border-bottom:1px solid #1e293b; border-radius:8px; padding:20px; margin:20px 0; }
    .section-title { font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; border-bottom:1px solid #1e293b; padding-bottom:6px; margin:24px 0 14px 0; }
    .btn { display:inline-block; background:#0284c7; color:#ffffff !important; text-decoration:none; padding:14px 30px; border-radius:8px; font-weight:700; font-size:14px; letter-spacing:0.5px; text-align:center; }
    .footer { background:#080e1c; padding:24px; text-align:center; font-size:11px; color:#64748b; border-top:1px solid #1e293b; line-height:1.6; }
    .prog-step { text-align:center; font-size:11px; padding:4px; }
  </style>
</head>
<body>
  <div style="padding:24px 12px;">
    <div class="wrapper">
      <!-- Header -->
      <div class="header">
        <h1 class="logo">NAVITHON LOGISTICS</h1>
        <div style="font-size:12px; color:#bae6fd; margin-top:4px; font-weight:600; text-transform:uppercase;">
          Live Consignment Status Report
        </div>
      </div>

      <!-- Main Body -->
      <div class="content">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <span class="status-badge">${statusLabel}</span>
          <span style="font-size:12px; color:#94a3b8; font-family:monospace; font-weight:700;">#${consignment.trackingId}</span>
        </div>

        <h2 style="font-size:20px; font-weight:800; margin:0 0 8px 0; color:#ffffff;">
          ${checkpoint.title}
        </h2>
        <p style="font-size:14px; color:#cbd5e1; line-height:1.5; margin:0 0 16px 0;">
          A real-time telemetry update has been recorded for your consignment by the Navithon Operations Dispatch Desk.
        </p>

        <!-- Milestone Card -->
        <div class="milestone-card">
          <table style="width:100%;">
            <tr>
              <td style="font-size:11px; color:#94a3b8; text-transform:uppercase; font-weight:700; width:130px; padding:4px 0;">Recorded Time:</td>
              <td style="font-weight:700; color:#f8fafc; font-size:13px; padding:4px 0;">${formatDate(checkpoint.timestamp)}</td>
            </tr>
            <tr>
              <td style="font-size:11px; color:#94a3b8; text-transform:uppercase; font-weight:700; padding:4px 0;">Current Location:</td>
              <td style="font-weight:700; color:#38bdf8; font-size:13px; padding:4px 0;">${checkpoint.location}</td>
            </tr>
            ${
              checkpoint.facility
                ? `<tr>
                    <td style="font-size:11px; color:#94a3b8; text-transform:uppercase; font-weight:700; padding:4px 0;">Facility / Hub:</td>
                    <td style="font-weight:600; color:#cbd5e1; font-size:13px; padding:4px 0;">${checkpoint.facility}</td>
                  </tr>`
                : ''
            }
            <tr>
              <td style="font-size:11px; color:#94a3b8; text-transform:uppercase; font-weight:700; padding:4px 0; vertical-align:top;">Telemetry Notes:</td>
              <td style="color:#f1f5f9; font-size:13px; line-height:1.4; padding:4px 0;">${checkpoint.description}</td>
            </tr>
          </table>
        </div>

        <!-- Waybill Copy Attached -->
        <div style="background:rgba(2, 132, 199, 0.1); border:1px solid #0284c7; border-radius:8px; padding:14px; margin:20px 0;">
          <table style="width:100%;">
            <tr>
              <td style="width:32px; font-size:20px; vertical-align:middle;">📑</td>
              <td style="vertical-align:middle; padding-left:10px;">
                <div style="font-weight:700; font-size:13px; color:#38bdf8;">
                  Attached: Official Waybill Document (Waybill-${consignment.trackingId}.pdf)
                </div>
                <div style="font-size:11px; color:#94a3b8; margin-top:2px;">
                  A PDF copy of the consignment waybill is attached for your records, or you can <a href="${pdfDownloadUrl}" style="color:#38bdf8; text-decoration:underline;">download it online</a>.
                </div>
              </td>
            </tr>
          </table>
        </div>

        <!-- Shipment Progression -->
        <div class="section-title">Shipment Progression</div>
        <table style="width:100%; margin-bottom:20px; background:#0f172a; border-radius:8px; border:1px solid #1e293b; padding:8px;">
          <tr>
            ${stages
              .map((s, idx) => {
                const isPassed = currentIdx >= 0 && idx <= currentIdx;
                const isCurrent = idx === currentIdx;
                const dotColor = isCurrent ? theme.border : isPassed ? '#10b981' : '#334155';
                const textColor = isCurrent ? '#ffffff' : isPassed ? '#94a3b8' : '#475569';
                const fw = isCurrent ? '800' : '500';
                return `
                  <td class="prog-step" style="width:16.66%;">
                    <div style="width:10px; height:10px; border-radius:50%; background:${dotColor}; margin:0 auto 4px auto;"></div>
                    <div style="color:${textColor}; font-weight:${fw}; font-size:10px;">${s.label}</div>
                  </td>
                `;
              })
              .join('')}
          </tr>
        </table>

        <!-- Consignment Summary -->
        <div class="section-title">Consignment Summary</div>
        <table style="width:100%; font-size:13px; background:#0f172a; border-radius:6px; border:1px solid #1e293b; padding:12px; margin-bottom:24px;">
          <tr>
            <td style="color:#94a3b8; padding:4px;">Origin:</td>
            <td style="font-weight:700; color:#fff; padding:4px;">${consignment.originLocation}</td>
            <td style="color:#94a3b8; padding:4px;">Destination:</td>
            <td style="font-weight:700; color:#fff; padding:4px;">${consignment.destinationLocation}</td>
          </tr>
          <tr>
            <td style="color:#94a3b8; padding:4px;">Target Delivery:</td>
            <td style="font-weight:700; color:#38bdf8; padding:4px;">${formatDate(consignment.estimatedDelivery)}</td>
            <td style="color:#94a3b8; padding:4px;">Cargo:</td>
            <td style="font-weight:700; color:#fff; padding:4px;">${consignment.packageDetails.pieceCount} Pcs (${consignment.packageDetails.weightKg} kg)</td>
          </tr>
        </table>

        <!-- Action Button -->
        <div style="text-align:center; margin:28px 0 12px 0;">
          <a href="${trackingUrl}" class="btn">
            View Live Telemetry Timeline &rarr;
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <strong>NAVITHON LOGISTICS INTERNATIONAL OPERATIONS COMMAND</strong><br>
        24/7 Global Air & Ocean Freight Telemetry Center<br>
        Inquiries: dispatch@navithonlogistics.com | Direct Support: +1 (800) 849-0129
      </div>
    </div>
  </div>
</body>
</html>
`;

  const text = `
NAVITHON LOGISTICS STATUS REPORT
=============================================================
Consignment Tracking ID: ${consignment.trackingId}
Status Update: ${statusLabel}
Event Title: ${checkpoint.title}
Timestamp: ${formatDate(checkpoint.timestamp)}
Location: ${checkpoint.location}
Facility: ${checkpoint.facility || 'Navithon Hub Network'}
Notes: ${checkpoint.description}

CONSIGNMENT RECAP:
Origin: ${consignment.originLocation}
Destination: ${consignment.destinationLocation}
Cargo: ${consignment.packageDetails.description} (${consignment.packageDetails.pieceCount} pcs, ${consignment.packageDetails.weightKg} kg)
Estimated Delivery: ${formatDate(consignment.estimatedDelivery)}

ATTACHED WAYBILL:
A copy of your official Air Waybill (Waybill-${consignment.trackingId}.pdf) has been attached to this email.

TRACK LIVE TELEMETRY:
${trackingUrl}
=============================================================
`.trim();

  const resend = getResendClient();

  if (!resend) {
    const warnMsg = 'RESEND_API_KEY is not configured. Emulating status email dispatch.';
    console.warn(`[EmailService] ${warnMsg}`);
    logDispatchedEmail({
      id: `mock-${Date.now()}`,
      trackingId: consignment.trackingId,
      type: 'STATUS_UPDATE',
      to: recipients,
      subject,
      timestamp: new Date().toISOString(),
      success: true,
      hasAttachment: true,
      previewHtml: html
    });
    return { success: true, recipients };
  }

  try {
    const res = await resend.emails.send({
      from: getSenderAddress(),
      to: recipients,
      subject,
      html,
      text,
      attachments: [
        {
          filename: `Waybill-${consignment.trackingId}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (res.error) {
      console.error('[EmailService] Resend API error for status update:', res.error);
      logDispatchedEmail({
        id: `err-${Date.now()}`,
        trackingId: consignment.trackingId,
        type: 'STATUS_UPDATE',
        to: recipients,
        subject,
        timestamp: new Date().toISOString(),
        success: false,
        error: res.error.message,
        hasAttachment: true,
        previewHtml: html
      });
      return { success: false, error: res.error.message, recipients };
    }

    console.log(`[EmailService] Status report email sent via Resend: ID ${res.data?.id}`);
    logDispatchedEmail({
      id: res.data?.id || `sent-${Date.now()}`,
      trackingId: consignment.trackingId,
      type: 'STATUS_UPDATE',
      to: recipients,
      subject,
      timestamp: new Date().toISOString(),
      success: true,
      resendId: res.data?.id,
      hasAttachment: true,
      previewHtml: html
    });

    return { success: true, resendId: res.data?.id, recipients };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown Resend error';
    console.error('[EmailService] Unexpected error sending status email:', err);
    logDispatchedEmail({
      id: `exc-${Date.now()}`,
      trackingId: consignment.trackingId,
      type: 'STATUS_UPDATE',
      to: recipients,
      subject,
      timestamp: new Date().toISOString(),
      success: false,
      error: msg,
      hasAttachment: true,
      previewHtml: html
    });
    return { success: false, error: msg, recipients };
  }
}
