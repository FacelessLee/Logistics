'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  Clock,
  MapPin,
  Calendar,
  Share2,
  Printer,
  RefreshCw,
  ArrowLeft,
  Copy,
  Check,
  Building2,
  User,
  ShieldCheck,
  Truck,
  Plane,
  Ship,
  AlertCircle,
  FileText
} from 'lucide-react';
import { Consignment } from '@/lib/types';
import { formatDate, getStatusLabel, getStatusColor, formatCurrency } from '@/lib/utils';
import TrackingTimeline from '@/components/TrackingTimeline';
import RouteMapVisual from '@/components/RouteMapVisual';
import AirWaybillModal from '@/components/AirWaybillModal';
import TrackingSearch from '@/components/TrackingSearch';

export default function ConsignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [consignment, setConsignment] = useState<Consignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [showWaybill, setShowWaybill] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const fetchConsignment = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setErrorMessage('');
      const res = await fetch(`/api/consignments/${encodeURIComponent(id)}`);
      const json = await res.json();
      if (json.success && json.data) {
        setConsignment(json.data);
      } else {
        setErrorMessage(json.error || `No consignment found for tracking ID "${id}".`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching consignment data.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConsignment();
  }, [id]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyId = () => {
    if (consignment?.trackingId) {
      navigator.clipboard.writeText(consignment.trackingId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center' }}>
        <div className="container">
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            color: 'var(--accent-cyan-light)',
            fontSize: '1.1rem'
          }}>
            <RefreshCw size={24} className="badge-pulse" />
            <span>Retrieving live telemetry for Consignment #{id}...</span>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage || !consignment) {
    return (
      <div style={{ padding: '70px 0' }}>
        <div className="container" style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
          <div className="glass-panel" style={{ padding: '40px 30px' }}>
            <AlertCircle size={48} color="var(--accent-rose)" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '12px', color: '#ffffff' }}>
              Consignment Not Located
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px' }}>
              We could not find an active consignment matching <strong style={{ color: '#fff', fontFamily: 'monospace' }}>"{id}"</strong>. Please verify the ID or check the format.
            </p>

            <div style={{ marginBottom: '30px' }}>
              <TrackingSearch size="normal" initialValue={id} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
              <Link href="/track" className="btn btn-secondary btn-sm">
                <ArrowLeft size={16} />
                <span>Return to Tracking Hub</span>
              </Link>

              <Link href="/book" className="btn btn-primary btn-sm">
                <span>Book This Shipment</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const colors = getStatusColor(consignment.status);

  return (
    <div style={{ paddingTop: '30px', paddingBottom: '90px' }}>
      <div className="container">
        {/* Back Link */}
        <div style={{ marginBottom: '20px' }}>
          <Link
            href="/track"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: 600,
              transition: 'color 0.2s'
            }}
          >
            <ArrowLeft size={16} />
            <span>All Consignments</span>
          </Link>
        </div>

        {/* Master Status & Control Header Banner */}
        <div className="glass-panel" style={{
          padding: '32px',
          marginBottom: '32px',
          background: 'linear-gradient(135deg, rgba(15, 25, 45, 0.95) 0%, rgba(10, 18, 34, 0.98) 100%)',
          border: '1px solid rgba(14, 165, 233, 0.3)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '24px'
          }}>
            {/* ID and Status */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                marginBottom: '10px'
              }}>
                <span style={{
                  fontSize: 'clamp(1.4rem, 3vw, 2.2rem)',
                  fontWeight: 900,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em',
                  color: '#ffffff'
                }}>
                  {consignment.trackingId}
                </span>

                <button
                  onClick={handleCopyId}
                  title="Copy Tracking ID"
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 10px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.78rem'
                  }}
                >
                  {copiedId ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
                  <span>{copiedId ? 'Copied' : 'Copy'}</span>
                </button>

                <span
                  className="badge"
                  style={{
                    background: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    fontSize: '0.85rem',
                    padding: '6px 16px'
                  }}
                >
                  <span className="badge-pulse" style={{ background: colors.dot }} />
                  <span>{getStatusLabel(consignment.status)}</span>
                </span>
              </div>

              <div style={{
                fontSize: '0.92rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <span>Created {formatDate(consignment.createdAt)}</span>
                <span>•</span>
                <span>Tier: <strong style={{ color: 'var(--text-primary)' }}>{consignment.serviceTier.replace('_', ' ')}</strong></span>
                <span>•</span>
                <span>Carrier: <strong style={{ color: 'var(--text-primary)' }}>{consignment.carrier.name}</strong></span>
              </div>
            </div>

            {/* Actions: Print Waybill, Share Link, Refresh */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowWaybill(true)}
                className="btn btn-primary btn-sm"
              >
                <Printer size={16} />
                <span>Air Waybill (AWB)</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="btn btn-secondary btn-sm"
              >
                {copiedLink ? <Check size={16} color="var(--accent-emerald)" /> : <Share2 size={16} />}
                <span>{copiedLink ? 'Link Copied!' : 'Share Link'}</span>
              </button>

              <button
                onClick={fetchConsignment}
                className="btn btn-secondary btn-sm"
                title="Refresh Status"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginTop: '28px',
            paddingTop: '24px',
            borderTop: '1px solid var(--border-subtle)'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                ESTIMATED ARRIVAL
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-cyan-light)' }}>
                {formatDate(consignment.estimatedDelivery)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                CURRENT TELEMETRY LOCATION
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                {consignment.currentLocation}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                DECLARED WEIGHT & VALUE
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                {consignment.packageDetails.weightKg} kg / {formatCurrency(consignment.packageDetails.declaredValue?.amount, consignment.packageDetails.declaredValue?.currency)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                SIGNATURE REQUIRED
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: consignment.signatureRequired ? 'var(--accent-amber)' : 'var(--text-secondary)' }}>
                {consignment.signatureRequired ? (consignment.signedBy ? `Signed by: ${consignment.signedBy}` : 'Direct Signature Mandatory') : 'Standard Delivery'}
              </div>
            </div>
          </div>
        </div>

        {/* Route Map Visualizer */}
        <div style={{ marginBottom: '32px' }}>
          <RouteMapVisual consignment={consignment} />
        </div>

        {/* Two Column Layout: Journey Timeline & Consignment Specifications */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '32px',
          alignItems: 'start'
        }}>
          {/* Left Column: Progress Stepper & Checkpoints */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <TrackingTimeline consignment={consignment} />
          </div>

          {/* Right Column: Parties & Consignment Specifications */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Parties Card */}
            <div className="glass-panel" style={{ padding: '26px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
                Consignment Parties
              </h3>

              {/* Shipper */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '16px',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--accent-cyan-light)',
                  textTransform: 'uppercase',
                  marginBottom: '6px'
                }}>
                  SHIPPER / ORIGIN
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                  {consignment.sender.company || consignment.sender.name}
                </div>
                {consignment.sender.company && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Attn: {consignment.sender.name}
                  </div>
                )}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {consignment.sender.address}, {consignment.sender.city}, {consignment.sender.country}
                </div>
              </div>

              {/* Consignee */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--accent-emerald)',
                  textTransform: 'uppercase',
                  marginBottom: '6px'
                }}>
                  CONSIGNEE / DESTINATION
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                  {consignment.receiver.company || consignment.receiver.name}
                </div>
                {consignment.receiver.company && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Attn: {consignment.receiver.name}
                  </div>
                )}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {consignment.receiver.address}, {consignment.receiver.city}, {consignment.receiver.country}
                </div>
              </div>
            </div>

            {/* Package Specifications Card */}
            <div className="glass-panel" style={{ padding: '26px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
                Cargo Specifications
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Description</span>
                  <strong style={{ color: '#fff', textAlign: 'right', maxWidth: '60%' }}>
                    {consignment.packageDetails.description}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Cargo Category</span>
                  <strong style={{ color: '#fff' }}>{consignment.packageDetails.category}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Pieces</span>
                  <strong style={{ color: '#fff' }}>{consignment.packageDetails.pieceCount} Piece(s)</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Gross Weight</span>
                  <strong style={{ color: '#fff' }}>{consignment.packageDetails.weightKg} kg</strong>
                </div>

                {consignment.packageDetails.dimensionsCm && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Dimensions</span>
                    <strong style={{ color: '#fff' }}>
                      {consignment.packageDetails.dimensionsCm.length} × {consignment.packageDetails.dimensionsCm.width} × {consignment.packageDetails.dimensionsCm.height} cm
                    </strong>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Special Handling</span>
                  <strong style={{ color: consignment.packageDetails.isFragile ? 'var(--accent-amber)' : '#fff', textAlign: 'right' }}>
                    {consignment.packageDetails.specialHandling || 'Standard Handling'}
                  </strong>
                </div>
              </div>

              {/* Button to open Air Waybill */}
              <button
                onClick={() => setShowWaybill(true)}
                className="btn btn-outline-cyan"
                style={{ width: '100%', marginTop: '24px' }}
              >
                <FileText size={16} />
                <span>View Full Official Air Waybill</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Air Waybill Document Modal */}
      <AirWaybillModal
        consignment={consignment}
        isOpen={showWaybill}
        onClose={() => setShowWaybill(false)}
      />
    </div>
  );
}
