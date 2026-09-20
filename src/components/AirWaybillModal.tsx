'use client';

import React from 'react';
import { X, Printer, Download, CheckCircle, ShieldCheck, QrCode } from 'lucide-react';
import { Consignment } from '@/lib/types';
import { formatDate, formatCurrency } from '@/lib/utils';

interface AirWaybillModalProps {
  consignment: Consignment;
  isOpen: boolean;
  onClose: () => void;
}

export default function AirWaybillModal({ consignment, isOpen, onClose }: AirWaybillModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Generate SVG barcode pattern based on tracking ID characters
  const renderBarcodeLines = () => {
    const chars = consignment.trackingId.split('');
    return (
      <svg width="260" height="50" viewBox="0 0 260 50">
        <rect width="260" height="50" fill="#ffffff" />
        {chars.map((char, index) => {
          const code = char.charCodeAt(0);
          const x = 15 + index * 16;
          const w1 = (code % 3) + 1;
          const w2 = ((code >> 2) % 3) + 1;
          return (
            <g key={index}>
              <rect x={x} y="5" width={w1} height="40" fill="#000000" />
              <rect x={x + w1 + 2} y="5" width={w2} height="40" fill="#000000" />
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(3, 7, 18, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#ffffff',
        color: '#0f172a',
        width: '100%',
        maxWidth: '850px',
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Top Action Bar (hidden on print) */}
        <div className="no-print" style={{
          background: '#0f172a',
          color: '#ffffff',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #1e293b'
        }}>
          <div>
            <span style={{ fontSize: '1rem', fontWeight: 700 }}>Official Consignment Note / Air Waybill</span>
            <span style={{ marginLeft: '12px', fontSize: '0.85rem', color: '#94a3b8', fontFamily: 'monospace' }}>
              {consignment.trackingId}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handlePrint}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '0.88rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Printer size={16} />
              <span>Print Waybill</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '6px',
                padding: '8px',
                cursor: 'pointer'
              }}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Waybill Printable Document Body */}
        <div className="waybill-document" style={{
          padding: '30px',
          overflowY: 'auto',
          fontSize: '12px',
          lineHeight: '1.4',
          background: '#ffffff',
          fontFamily: 'Helvetica, Arial, sans-serif'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid #0f172a',
            paddingBottom: '16px',
            marginBottom: '16px'
          }}>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                NAVITHON LOGISTICS INTERNATIONAL
              </h2>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                GLOBAL FREIGHT FORWARDING & CONSIGNMENT NOTE
              </div>
              <div style={{ fontSize: '10px', color: '#475569', marginTop: '4px' }}>
                ISSUED UNDER IATA CARGO AGENCY RULES • NON-NEGOTIABLE AIR WAYBILL
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>WAYBILL NUMBER</div>
              <div style={{ fontSize: '20px', fontWeight: '900', fontFamily: 'monospace', letterSpacing: '1px' }}>
                {consignment.trackingId}
              </div>
              <div style={{ marginTop: '4px' }}>
                {renderBarcodeLines()}
              </div>
            </div>
          </div>

          {/* Parties Grid (Shipper & Consignee) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            border: '1px solid #0f172a',
            marginBottom: '16px'
          }}>
            {/* Shipper's Box */}
            <div style={{ padding: '12px', borderRight: '1px solid #0f172a' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>
                1. SHIPPER'S NAME & ADDRESS
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '13px', marginTop: '4px' }}>
                {consignment.sender.company || consignment.sender.name}
              </div>
              {consignment.sender.company && <div>Attn: {consignment.sender.name}</div>}
              <div>{consignment.sender.address}</div>
              <div>{consignment.sender.city}, {consignment.sender.country}</div>
              <div style={{ marginTop: '4px', fontSize: '11px', color: '#475569' }}>
                Tel: {consignment.sender.phone} | Email: {consignment.sender.email}
              </div>
            </div>

            {/* Consignee's Box */}
            <div style={{ padding: '12px' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>
                2. CONSIGNEE'S NAME & ADDRESS
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '13px', marginTop: '4px' }}>
                {consignment.receiver.company || consignment.receiver.name}
              </div>
              {consignment.receiver.company && <div>Attn: {consignment.receiver.name}</div>}
              <div>{consignment.receiver.address}</div>
              <div>{consignment.receiver.city}, {consignment.receiver.country}</div>
              <div style={{ marginTop: '4px', fontSize: '11px', color: '#475569' }}>
                Tel: {consignment.receiver.phone} | Email: {consignment.receiver.email}
              </div>
            </div>
          </div>

          {/* Carrier & Routing Details */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            border: '1px solid #0f172a',
            borderTop: 'none',
            marginBottom: '16px'
          }}>
            <div style={{ padding: '8px', borderRight: '1px solid #0f172a' }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#475569' }}>AIRPORT / PORT OF DEPARTURE</div>
              <div style={{ fontWeight: 'bold' }}>{consignment.originLocation}</div>
            </div>
            <div style={{ padding: '8px', borderRight: '1px solid #0f172a' }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#475569' }}>ROUTING & CARRIER</div>
              <div style={{ fontWeight: 'bold' }}>{consignment.carrier.name}</div>
              <div style={{ fontSize: '10px' }}>{consignment.carrier.flightOrVesselNo || 'DIRECT'}</div>
            </div>
            <div style={{ padding: '8px', borderRight: '1px solid #0f172a' }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#475569' }}>AIRPORT / PORT OF DESTINATION</div>
              <div style={{ fontWeight: 'bold' }}>{consignment.destinationLocation}</div>
            </div>
            <div style={{ padding: '8px' }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#475569' }}>ESTIMATED ARRIVAL</div>
              <div style={{ fontWeight: 'bold' }}>{formatDate(consignment.estimatedDelivery)}</div>
            </div>
          </div>

          {/* Goods Specification Table */}
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #0f172a',
            marginBottom: '16px'
          }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #0f172a' }}>
                <th style={{ padding: '8px', textAlign: 'left', borderRight: '1px solid #0f172a' }}>No. of Pieces</th>
                <th style={{ padding: '8px', textAlign: 'left', borderRight: '1px solid #0f172a' }}>Gross Weight (kg)</th>
                <th style={{ padding: '8px', textAlign: 'left', borderRight: '1px solid #0f172a' }}>Dimensions (cm)</th>
                <th style={{ padding: '8px', textAlign: 'left', borderRight: '1px solid #0f172a' }}>Declared Value (Customs)</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Nature & Quantity of Goods</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '10px 8px', borderRight: '1px solid #0f172a', fontWeight: 'bold' }}>
                  {consignment.packageDetails.pieceCount} PKG
                </td>
                <td style={{ padding: '10px 8px', borderRight: '1px solid #0f172a', fontWeight: 'bold' }}>
                  {consignment.packageDetails.weightKg} KG
                </td>
                <td style={{ padding: '10px 8px', borderRight: '1px solid #0f172a' }}>
                  {consignment.packageDetails.dimensionsCm
                    ? `${consignment.packageDetails.dimensionsCm.length} x ${consignment.packageDetails.dimensionsCm.width} x ${consignment.packageDetails.dimensionsCm.height}`
                    : 'Standard Cube'}
                </td>
                <td style={{ padding: '10px 8px', borderRight: '1px solid #0f172a', fontWeight: 'bold' }}>
                  {formatCurrency(
                    consignment.packageDetails.declaredValue?.amount,
                    consignment.packageDetails.declaredValue?.currency
                  )}
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <div style={{ fontWeight: 'bold' }}>{consignment.packageDetails.description}</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    Category: {consignment.packageDetails.category}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Handling & Declarations */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            border: '1px solid #0f172a',
            marginBottom: '16px'
          }}>
            <div style={{ padding: '10px', borderRight: '1px solid #0f172a' }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#475569' }}>SPECIAL HANDLING INSTRUCTIONS</div>
              <div style={{ fontWeight: 'bold', color: '#b91c1c', marginTop: '4px' }}>
                {consignment.packageDetails.specialHandling || 'Standard air freight handling procedures apply.'}
              </div>
              <div style={{ fontSize: '10px', marginTop: '6px' }}>
                {consignment.packageDetails.isFragile && '⚠ FRAGILE GOODS • '}
                {consignment.packageDetails.temperatureControlled && '❄ TEMPERATURE CONTROLLED ACTIVE • '}
                {consignment.signatureRequired && '✍ DIRECT CONSIGNEE SIGNATURE MANDATORY'}
              </div>
            </div>

            <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#475569' }}>SERVICE CLASSIFICATION</div>
                <div style={{ fontWeight: 'bold', color: '#0284c7' }}>{consignment.serviceTier.replace('_', ' ')}</div>
              </div>
              <div style={{ fontSize: '9px', color: '#64748b', marginTop: '8px' }}>
                Security Endorsement: X-Ray & ETD Scanned
              </div>
            </div>
          </div>

          {/* Signatures & Execution Box */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            border: '1px solid #0f172a',
            padding: '12px'
          }}>
            <div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>
                Shipper certifies that the particulars on the face hereof are correct and that in so far as any part of the consignment contains dangerous goods, such part is properly described by name and is in proper condition for carriage.
              </div>
              <div style={{ marginTop: '20px', borderBottom: '1px solid #94a3b8', width: '220px' }} />
              <div style={{ fontSize: '9px', fontWeight: 'bold', marginTop: '4px' }}>
                Signature of Shipper or his Agent
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold' }}>
                Executed on: {formatDate(consignment.createdAt)}
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                Navithon Logistics Operations Gateway: {consignment.originLocation}
              </div>
              <div style={{ marginTop: '20px', borderBottom: '1px solid #94a3b8', width: '220px', marginLeft: 'auto' }} />
              <div style={{ fontSize: '9px', fontWeight: 'bold', marginTop: '4px' }}>
                Signature of Issuing Carrier / Cargo Agent
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
