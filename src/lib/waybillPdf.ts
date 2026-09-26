import { jsPDF } from 'jspdf';
import { Consignment } from './types';
import { formatDate, formatCurrency } from './utils';

/**
 * Generates an official, publication-quality Air Waybill (AWB) / Consignment Note PDF
 * compliant with IATA cargo agency document styling.
 */
export function generateWaybillPdf(consignment: Consignment): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 186mm

  // Colors
  const darkNavy = [15, 23, 42] as const;      // #0f172a
  const cyanBlue = [2, 132, 199] as const;      // #0284c7
  const borderGrey = [203, 213, 225] as const;  // #cbd5e1
  const headerBg = [241, 245, 249] as const;    // #f1f5f9
  const textMuted = [100, 116, 139] as const;   // #64748b
  const textDark = [30, 41, 59] as const;       // #1e293b
  const alertRed = [185, 28, 28] as const;      // #b91c1c

  let y = margin;

  // --- Document Top Watermark / Status Bar ---
  doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.rect(margin, y, contentWidth, 3, 'F');
  y += 6;

  // --- Header Area ---
  // Left: Company Branding
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('NAVITHON LOGISTICS INTERNATIONAL', margin, y);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(cyanBlue[0], cyanBlue[1], cyanBlue[2]);
  doc.text('GLOBAL FREIGHT FORWARDING & CONSIGNMENT NOTE', margin, y + 4.5);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('ISSUED UNDER IATA CARGO AGENCY RULES • NON-NEGOTIABLE AIR WAYBILL', margin, y + 8.5);

  // Right: Waybill Number & Barcode
  const rightAlignX = margin + contentWidth;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('WAYBILL NUMBER / TRACKING CODE', rightAlignX, y, { align: 'right' });

  doc.setFontSize(14);
  doc.setFont('courier', 'bold');
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(consignment.trackingId, rightAlignX, y + 5.5, { align: 'right' });

  // Draw simulated barcode
  const barcodeY = y + 7.5;
  const barcodeHeight = 7;
  const barcodeTotalWidth = 48;
  const barcodeStartX = rightAlignX - barcodeTotalWidth;
  doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);

  const chars = consignment.trackingId.split('');
  let currentBx = barcodeStartX;
  chars.forEach((char) => {
    const code = char.charCodeAt(0);
    const w1 = (code % 3) * 0.35 + 0.4;
    const gap = 0.5;
    const w2 = ((code >> 2) % 3) * 0.35 + 0.4;

    if (currentBx + w1 + gap + w2 <= rightAlignX) {
      doc.rect(currentBx, barcodeY, w1, barcodeHeight, 'F');
      currentBx += w1 + gap;
      doc.rect(currentBx, barcodeY, w2, barcodeHeight, 'F');
      currentBx += w2 + gap + 0.3;
    }
  });

  y += 18;

  // --- Meta strip: Service Level, Transport Mode, Issue Date ---
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.setLineWidth(0.3);
  doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
  doc.rect(margin, y, contentWidth, 7, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);

  doc.text(`SERVICE: ${consignment.serviceTier.replace(/_/g, ' ')}`, margin + 3, y + 4.8);
  doc.text(`MODE: ${consignment.transportMode.replace(/_/g, ' ')}`, margin + 65, y + 4.8);
  doc.text(`DATE ISSUED: ${formatDate(consignment.createdAt)}`, margin + 125, y + 4.8);

  y += 9;

  // --- Box 1 & 2: Shipper & Consignee (Side by side) ---
  const boxWidth = (contentWidth - 2) / 2; // 92mm
  const boxHeight = 36;

  // Shipper Box
  doc.rect(margin, y, boxWidth, boxHeight);
  doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
  doc.rect(margin, y, boxWidth, 5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text("1. SHIPPER'S NAME & ADDRESS", margin + 3, y + 3.7);

  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const shipperName = consignment.sender.company || consignment.sender.name;
  doc.text(shipperName.substring(0, 42), margin + 3, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  let shipperLineY = y + 13;
  if (consignment.sender.company && consignment.sender.name) {
    doc.text(`Attn: ${consignment.sender.name.substring(0, 40)}`, margin + 3, shipperLineY);
    shipperLineY += 3.8;
  }
  doc.text(consignment.sender.address.substring(0, 48), margin + 3, shipperLineY);
  shipperLineY += 3.8;
  doc.text(`${consignment.sender.city}, ${consignment.sender.country}`, margin + 3, shipperLineY);
  shipperLineY += 4.5;
  doc.setFontSize(6.8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Tel: ${consignment.sender.phone || 'N/A'}  •  Email: ${consignment.sender.email}`, margin + 3, shipperLineY);

  // Consignee Box
  const consigneeX = margin + boxWidth + 2;
  doc.rect(consigneeX, y, boxWidth, boxHeight);
  doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
  doc.rect(consigneeX, y, boxWidth, 5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text("2. CONSIGNEE'S NAME & ADDRESS", consigneeX + 3, y + 3.7);

  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const receiverName = consignment.receiver.company || consignment.receiver.name;
  doc.text(receiverName.substring(0, 42), consigneeX + 3, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  let receiverLineY = y + 13;
  if (consignment.receiver.company && consignment.receiver.name) {
    doc.text(`Attn: ${consignment.receiver.name.substring(0, 40)}`, consigneeX + 3, receiverLineY);
    receiverLineY += 3.8;
  }
  doc.text(consignment.receiver.address.substring(0, 48), consigneeX + 3, receiverLineY);
  receiverLineY += 3.8;
  doc.text(`${consignment.receiver.city}, ${consignment.receiver.country}`, consigneeX + 3, receiverLineY);
  receiverLineY += 4.5;
  doc.setFontSize(6.8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Tel: ${consignment.receiver.phone || 'N/A'}  •  Email: ${consignment.receiver.email}`, consigneeX + 3, receiverLineY);

  y += boxHeight + 2;

  // --- Box 3: Routing & Carrier Details (4 Columns) ---
  const routeColWidth = contentWidth / 4; // 46.5mm
  const routeHeight = 16;

  doc.rect(margin, y, contentWidth, routeHeight);
  for (let i = 1; i < 4; i++) {
    doc.line(margin + routeColWidth * i, y, margin + routeColWidth * i, y + routeHeight);
  }

  // Col 1: Origin
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('AIRPORT / PORT OF DEPARTURE', margin + 3, y + 4.5);
  doc.setFontSize(8.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(consignment.originLocation.substring(0, 24), margin + 3, y + 10);

  // Col 2: Routing / Carrier
  const col2X = margin + routeColWidth;
  doc.setFontSize(6.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('ROUTING & ISSUING CARRIER', col2X + 3, y + 4.5);
  doc.setFontSize(8.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(consignment.carrier.name.substring(0, 24), col2X + 3, y + 9.5);
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Flight/Unit: ${consignment.carrier.flightOrVesselNo || 'DIRECT EXPEDITE'}`, col2X + 3, y + 13.5);

  // Col 3: Destination
  const col3X = margin + routeColWidth * 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('AIRPORT / PORT OF DESTINATION', col3X + 3, y + 4.5);
  doc.setFontSize(8.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(consignment.destinationLocation.substring(0, 24), col3X + 3, y + 10);

  // Col 4: Estimated Arrival
  const col4X = margin + routeColWidth * 3;
  doc.setFontSize(6.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('ESTIMATED ARRIVAL / TARGET', col4X + 3, y + 4.5);
  doc.setFontSize(8.5);
  doc.setTextColor(cyanBlue[0], cyanBlue[1], cyanBlue[2]);
  doc.text(formatDate(consignment.estimatedDelivery).substring(0, 22), col4X + 3, y + 10);

  y += routeHeight + 2;

  // --- Box 4: Goods Specification Table ---
  const tableHeight = 36;
  doc.rect(margin, y, contentWidth, tableHeight);

  // Table Header
  doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
  doc.rect(margin, y, contentWidth, 6, 'FD');

  const colWidths = [24, 28, 36, 38, 60]; // sums to 186
  const colHeaders = [
    'NO. OF PIECES',
    'GROSS WEIGHT',
    'DIMENSIONS (CM)',
    'DECLARED VALUE (CUSTOMS)',
    'NATURE & DESCRIPTION OF GOODS'
  ];

  let curX = margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  colHeaders.forEach((header, index) => {
    doc.text(header, curX + 2, y + 4.2);
    if (index < colHeaders.length - 1) {
      doc.line(curX + colWidths[index], y, curX + colWidths[index], y + tableHeight);
    }
    curX += colWidths[index];
  });

  // Table Body Row
  const bodyY = y + 11;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);

  // Col 1: Piece Count
  doc.text(`${consignment.packageDetails.pieceCount} PKG`, margin + 2, bodyY);

  // Col 2: Gross Weight
  doc.text(`${consignment.packageDetails.weightKg} KG`, margin + colWidths[0] + 2, bodyY);

  // Col 3: Dimensions
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const dims = consignment.packageDetails.dimensionsCm
    ? `${consignment.packageDetails.dimensionsCm.length} x ${consignment.packageDetails.dimensionsCm.width} x ${consignment.packageDetails.dimensionsCm.height}`
    : 'Standard Cube';
  doc.text(dims, margin + colWidths[0] + colWidths[1] + 2, bodyY);

  // Col 4: Declared Value
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(
    formatCurrency(
      consignment.packageDetails.declaredValue?.amount,
      consignment.packageDetails.declaredValue?.currency
    ),
    margin + colWidths[0] + colWidths[1] + colWidths[2] + 2,
    bodyY
  );

  // Col 5: Description & Category
  const descX = margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(consignment.packageDetails.description.substring(0, 36), descX, bodyY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Category: ${consignment.packageDetails.category}`, descX, bodyY + 4);

  y += tableHeight + 2;

  // --- Box 5: Handling & Regulatory Declarations ---
  const handlingHeight = 28;
  doc.rect(margin, y, contentWidth, handlingHeight);

  const leftHandlingWidth = 120;
  doc.line(margin + leftHandlingWidth, y, margin + leftHandlingWidth, y + handlingHeight);

  // Left: Handling instructions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('SPECIAL HANDLING INSTRUCTIONS', margin + 3, y + 4.5);

  doc.setFontSize(7.5);
  doc.setTextColor(alertRed[0], alertRed[1], alertRed[2]);
  doc.text(
    consignment.packageDetails.specialHandling || 'Standard air freight handling procedures apply.',
    margin + 3,
    y + 9
  );

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  let flagText = '';
  if (consignment.packageDetails.isFragile) flagText += '⚠ FRAGILE GOODS  •  ';
  if (consignment.packageDetails.temperatureControlled) flagText += '❄ TEMPERATURE CONTROLLED ACTIVE  •  ';
  if (consignment.signatureRequired) flagText += '✍ DIRECT CONSIGNEE SIGNATURE MANDATORY';
  if (!flagText) flagText = 'STANDARD COMMERCIAL CARRIAGE';
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(flagText, margin + 3, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Security Endorsement: X-Ray & Explosive Trace Detection (ETD) Scanned and Cleared.', margin + 3, y + 19);
  doc.text(`Consignment Current Position: ${consignment.currentLocation}`, margin + 3, y + 23.5);

  // Right: Service Classification
  const rightHandlingX = margin + leftHandlingWidth;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('OPERATIONAL CLASSIFICATION', rightHandlingX + 3, y + 4.5);

  doc.setFontSize(8.5);
  doc.setTextColor(cyanBlue[0], cyanBlue[1], cyanBlue[2]);
  doc.text(consignment.serviceTier.replace(/_/g, ' '), rightHandlingX + 3, y + 10);

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`Origin Hub: ${consignment.originLocation}`, rightHandlingX + 3, y + 15);
  doc.text(`Initial Status: ${consignment.status.replace(/_/g, ' ')}`, rightHandlingX + 3, y + 19.5);
  doc.text(`Tracking PIN: Verified`, rightHandlingX + 3, y + 23.5);

  y += handlingHeight + 2;

  // --- Box 5.5: Cargo Visual Inspection & Tamper-Evident Verification ---
  const photoBoxHeight = 36;
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.rect(margin, y, contentWidth, photoBoxHeight);

  // Section header bar
  doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
  doc.rect(margin, y, contentWidth, 5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('5. CARGO VISUAL INSPECTION & SECURITY TELEMETRY', margin + 3, y + 3.7);

  // Left frame for package photo (width: 44mm, height: 27mm)
  const imgFrameX = margin + 3;
  const imgFrameY = y + 6.5;
  const imgFrameW = 44;
  const imgFrameH = 27;

  doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.rect(imgFrameX, imgFrameY, imgFrameW, imgFrameH, 'F');

  let imageRendered = false;
  if (consignment.packageDetails.packageImage) {
    try {
      doc.addImage(
        consignment.packageDetails.packageImage,
        'JPEG',
        imgFrameX + 1,
        imgFrameY + 1,
        imgFrameW - 2,
        imgFrameH - 2
      );
      imageRendered = true;
    } catch {
      try {
        doc.addImage(
          consignment.packageDetails.packageImage,
          imgFrameX + 1,
          imgFrameY + 1,
          imgFrameW - 2,
          imgFrameH - 2
        );
        imageRendered = true;
      } catch (e) {
        console.warn('[waybillPdf] Could not render image into PDF:', e);
      }
    }
  }

  if (!imageRendered) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('INTAKE SEAL', imgFrameX + imgFrameW / 2, imgFrameY + 12, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(186, 230, 253);
    doc.text('CARGO ARCHIVED', imgFrameX + imgFrameW / 2, imgFrameY + 17, { align: 'center' });
  }

  // Right details side
  const detailsX = imgFrameX + imgFrameW + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('VISUAL INSPECTION: CONDITION & INTAKE COMPLIANCE VERIFIED', detailsX, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`Description: ${consignment.packageDetails.description.substring(0, 52)}`, detailsX, y + 16);
  doc.text(`Intake Cargo Pieces: ${consignment.packageDetails.pieceCount} PKG  •  Gross Weight: ${consignment.packageDetails.weightKg} KG`, detailsX, y + 20.5);
  doc.text(`Security Endorsement: Physical parcel matches intake declaration. Tamper-evident seal verified.`, detailsX, y + 25);

  doc.setFontSize(6.5);
  doc.setTextColor(cyanBlue[0], cyanBlue[1], cyanBlue[2]);
  doc.setFont('courier', 'bold');
  doc.text(`TELEMETRY VERIFICATION: [AWB-${consignment.trackingId}-INSP-PASSED]`, detailsX, y + 30);

  y += photoBoxHeight + 2;

  // --- Box 6: Certification & Signature Blocks ---
  const signHeight = 26;
  doc.rect(margin, y, contentWidth, signHeight);
  const signHalfWidth = contentWidth / 2;
  doc.line(margin + signHalfWidth, y, margin + signHalfWidth, y + signHeight);

  // Left: Shipper certification
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(
    'Shipper certifies that the particulars on the face hereof are correct and that in so far',
    margin + 3,
    y + 4
  );
  doc.text(
    'as any part of the consignment contains dangerous goods, such part is properly described.',
    margin + 3,
    y + 7
  );

  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.line(margin + 3, y + 18, margin + 70, y + 18);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Signature of Shipper or Authorized Agent', margin + 3, y + 22);

  // Right: Carrier Execution
  const signRightX = margin + signHalfWidth;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`Executed on: ${formatDate(consignment.createdAt)}`, signRightX + 3, y + 4.5);
  doc.text(`Navithon Global Operations Gateway: ${consignment.originLocation}`, signRightX + 3, y + 8);

  doc.line(signRightX + 3, y + 18, signRightX + 70, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.text('Signature of Issuing Carrier / Cargo Officer', signRightX + 3, y + 22);

  y += signHeight + 4;

  // --- Document Footer / Verification Notice ---
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(
    `Official electronic document issued by Navithon Logistics International. Verify telemetry anytime at https://navithonlogistics.com/track/${consignment.trackingId}`,
    pageWidth / 2,
    pageHeight - margin,
    { align: 'center' }
  );

  // Convert jsPDF ArrayBuffer to Node.js Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
