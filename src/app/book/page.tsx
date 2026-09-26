'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  PlusCircle,
  Sparkles,
  Plane,
  Ship,
  Truck,
  Shield,
  ArrowRight,
  CheckCircle2,
  Copy,
  Printer,
  Calendar,
  AlertCircle,
  Mail,
  Download,
  Send
} from 'lucide-react';
import { generateTrackingId } from '@/lib/utils';
import { TransportMode, ServiceTier, Consignment } from '@/lib/types';
import AirWaybillModal from '@/components/AirWaybillModal';

function BookingFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialMode = (searchParams.get('mode') === 'OCEAN' ? 'OCEAN_CARGO' :
                       searchParams.get('mode') === 'ROAD' ? 'ROAD_EXPRESS' : 'AIR_FREIGHT') as TransportMode;
  const initialWeight = Number(searchParams.get('weight')) || 12.5;

  const [transportMode, setTransportMode] = useState<TransportMode>(initialMode);
  const [serviceTier, setServiceTier] = useState<ServiceTier>('EXPRESS_PRIORITY');

  // Pre-generate a custom ID that the user can regenerate or customize!
  const [trackingId, setTrackingId] = useState<string>(() => generateTrackingId('TRK'));

  // Sender Details
  const [senderName, setSenderName] = useState('');
  const [senderCompany, setSenderCompany] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderCity, setSenderCity] = useState('');
  const [senderCountry, setSenderCountry] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderEmail, setSenderEmail] = useState('');

  // Receiver Details
  const [receiverName, setReceiverName] = useState('');
  const [receiverCompany, setReceiverCompany] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [receiverCity, setReceiverCity] = useState('');
  const [receiverCountry, setReceiverCountry] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');

  // Package Details
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General Cargo');
  const [pieceCount, setPieceCount] = useState(1);
  const [weightKg, setWeightKg] = useState(initialWeight);
  const [declaredValue, setDeclaredValue] = useState(1500);
  const [currency, setCurrency] = useState('USD');
  const [isFragile, setIsFragile] = useState(false);
  const [temperatureControlled, setTemperatureControlled] = useState(false);
  const [specialHandling, setSpecialHandling] = useState('Standard cargo handling procedure');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdConsignment, setCreatedConsignment] = useState<Consignment | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showWaybill, setShowWaybill] = useState(false);
  const [copied, setCopied] = useState(false);

  const [emailDispatchStatus, setEmailDispatchStatus] = useState<{
    dispatched: boolean;
    recipients: string[];
    error?: string;
  } | null>(null);
  const [resendEmailAddress, setResendEmailAddress] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleRegenerateId = () => {
    const prefix = transportMode === 'OCEAN_CARGO' ? 'SEA' :
                   transportMode === 'ROAD_EXPRESS' ? 'ROD' :
                   serviceTier === 'EXPRESS_PRIORITY' ? 'EXP' : 'TRK';
    setTrackingId(generateTrackingId(prefix));
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        trackingId,
        transportMode,
        serviceTier,
        sender: {
          name: senderName,
          company: senderCompany,
          address: senderAddress,
          city: senderCity,
          country: senderCountry,
          phone: senderPhone,
          email: senderEmail
        },
        receiver: {
          name: receiverName,
          company: receiverCompany,
          address: receiverAddress,
          city: receiverCity,
          country: receiverCountry,
          phone: receiverPhone,
          email: receiverEmail
        },
        packageDetails: {
          description,
          category,
          pieceCount,
          weightKg,
          declaredValue: {
            amount: declaredValue,
            currency
          },
          isFragile,
          temperatureControlled,
          specialHandling
        }
      };

      const res = await fetch('/api/consignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success && json.data) {
        setCreatedConsignment(json.data);
        setEmailDispatchStatus(json.email || null);
      } else {
        setErrorMessage(json.error || 'Failed to generate consignment');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting booking';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualResend = async (targetAddr?: string) => {
    const addr = (targetAddr || resendEmailAddress).trim();
    if (!addr || !createdConsignment) return;
    setIsResending(true);
    setResendNotice(null);
    try {
      const res = await fetch(`/api/consignments/${createdConsignment.trackingId}/email-report?email=${encodeURIComponent(addr)}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setResendNotice({ type: 'success', text: `Official Waybill PDF successfully dispatched to ${addr}!` });
      } else {
        setResendNotice({ type: 'error', text: data.error || 'Failed to dispatch email' });
      }
    } catch {
      setResendNotice({ type: 'error', text: 'Network request failed' });
    } finally {
      setIsResending(false);
    }
  };

  const handleCopyId = () => {
    if (createdConsignment?.trackingId) {
      navigator.clipboard.writeText(createdConsignment.trackingId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // SUCCESS SCREEN
  if (createdConsignment) {
    return (
      <div style={{ paddingTop: '50px', paddingBottom: '90px' }}>
        <div className="container" style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div className="glass-panel" style={{
            padding: '40px',
            textAlign: 'center',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(10, 18, 34, 0.95) 100%)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.2)',
              color: 'var(--accent-emerald)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              border: '2px solid var(--accent-emerald)'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              Consignment Registered Successfully!
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '30px' }}>
              Your consignment is now live in the global tracking network and immediately searchable with telemetry.
            </p>

            {/* Generated Tracking ID Banner */}
            <div style={{
              background: 'rgba(6, 11, 20, 0.9)',
              border: '2px dashed var(--accent-cyan)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              marginBottom: '32px'
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                ASSIGNED TRACKING NUMBER
              </div>
              <div style={{
                fontSize: '2rem',
                fontWeight: 900,
                color: 'var(--accent-cyan-light)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.05em',
                marginBottom: '12px'
              }}>
                {createdConsignment.trackingId}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button
                  onClick={handleCopyId}
                  className="btn btn-secondary btn-sm"
                >
                  <Copy size={14} />
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Tracking ID'}</span>
                </button>
              </div>
            </div>

            {/* Consignment Quick Details */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              textAlign: 'left',
              fontSize: '0.88rem',
              marginBottom: '32px',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Origin:</span>
                <strong style={{ color: '#fff' }}>{createdConsignment.originLocation}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Destination:</span>
                <strong style={{ color: '#fff' }}>{createdConsignment.destinationLocation}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Pieces & Weight:</span>
                <strong style={{ color: '#fff' }}>{createdConsignment.packageDetails.pieceCount} Pcs / {createdConsignment.packageDetails.weightKg} kg</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <strong style={{ color: 'var(--accent-cyan-light)' }}>Booking Created & Assigned</strong>
              </div>
            </div>

            {/* Email Dispatch Notice */}
            <div style={{
              background: emailDispatchStatus?.error ? 'rgba(239, 68, 68, 0.12)' : 'rgba(2, 132, 199, 0.12)',
              border: emailDispatchStatus?.error ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(2, 132, 199, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              textAlign: 'left',
              marginBottom: '28px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: emailDispatchStatus?.error ? 'rgba(239, 68, 68, 0.25)' : 'rgba(2, 132, 199, 0.25)',
                  color: emailDispatchStatus?.error ? 'var(--accent-rose)' : 'var(--accent-cyan-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  <Mail size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '1rem' }}>
                      Official Waybill (PDF) & Confirmation Email
                    </div>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: emailDispatchStatus?.error ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      color: emailDispatchStatus?.error ? '#fca5a5' : '#34d399',
                      border: emailDispatchStatus?.error ? '1px solid #ef4444' : '1px solid #10b981'
                    }}>
                      {emailDispatchStatus?.error ? 'Dispatch Warning' : 'Resend Dispatched ✓'}
                    </span>
                  </div>

                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '6px', lineHeight: 1.5 }}>
                    Individual notifications with route telemetry and attached official Air Waybill (PDF) were issued to:
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f1f5f9', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--accent-cyan-light)', fontWeight: 700 }}>• Shipper:</span>
                        <span>{createdConsignment.sender.email}</span>
                        <span style={{ fontSize: '0.72rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>Dispatched</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f1f5f9', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--accent-cyan-light)', fontWeight: 700 }}>• Consignee:</span>
                        <span>{createdConsignment.receiver.email}</span>
                        <span style={{ fontSize: '0.72rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>Dispatched</span>
                      </div>
                    </div>
                  </div>

                  {emailDispatchStatus?.error && (
                    <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '6px', color: '#fca5a5', fontSize: '0.82rem' }}>
                      <strong>Resend Notice:</strong> {emailDispatchStatus.error}
                    </div>
                  )}

                  {/* Manual Quick Send to Any Address */}
                  <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, marginBottom: '8px' }}>
                      Want a copy sent to another mailbox or need to re-verify delivery?
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <input
                        type="email"
                        placeholder="Enter email (e.g. personal mailbox)"
                        value={resendEmailAddress}
                        onChange={(e) => setResendEmailAddress(e.target.value)}
                        className="form-input"
                        style={{ flex: 1, minWidth: '220px', padding: '8px 12px', fontSize: '0.85rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleManualResend()}
                        disabled={isResending || !resendEmailAddress.trim()}
                        className="btn btn-secondary btn-sm"
                        style={{ whiteSpace: 'nowrap', padding: '8px 16px' }}
                      >
                        <Send size={14} />
                        <span>{isResending ? 'Sending...' : 'Send Waybill Copy'}</span>
                      </button>
                    </div>

                    {resendNotice && (
                      <div style={{
                        marginTop: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: resendNotice.type === 'success' ? '#34d399' : '#fca5a5'
                      }}>
                        {resendNotice.text}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '12px', fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.5 }}>
                    💡 <strong>Delivery Note:</strong> Emails are sent from <strong>dispatch@navithonlogistics.com</strong>. If the email doesn&apos;t appear in your Primary Inbox within 1–2 minutes, please inspect your <strong>Spam / Junk / Promotions</strong> folder.
                  </div>
                </div>
              </div>
            </div>

            {/* Action CTAs */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <Link
                href={`/track/${createdConsignment.trackingId}`}
                className="btn btn-primary"
                style={{ padding: '14px 28px' }}
              >
                <span>Track This Consignment Now</span>
                <ArrowRight size={18} />
              </Link>

              <a
                href={`/api/consignments/${createdConsignment.trackingId}/waybill-pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ padding: '14px 24px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Download size={18} />
                <span>Download Waybill (PDF)</span>
              </a>

              <button
                onClick={() => setShowWaybill(true)}
                className="btn btn-secondary"
                style={{ padding: '14px 20px' }}
              >
                <Printer size={18} />
                <span>View / Print Waybill</span>
              </button>
            </div>
          </div>
        </div>

        <AirWaybillModal
          consignment={createdConsignment}
          isOpen={showWaybill}
          onClose={() => setShowWaybill(false)}
        />
      </div>
    );
  }

  // BOOKING FORM
  return (
    <div style={{ paddingTop: '40px', paddingBottom: '90px' }}>
      <div className="container" style={{ maxWidth: '960px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.82rem',
            color: 'var(--accent-cyan-light)',
            fontWeight: 700,
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}>
            <Sparkles size={14} />
            <span>DISPATCH REGISTRATION PORTAL</span>
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Book Shipment & Generate Tracking ID
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '6px' }}>
            Fill in the consignment particulars to register an electronic booking and receive an immediate trackable ID with printable Air Waybill.
          </p>
        </div>

        {errorMessage && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#ffffff',
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <AlertCircle size={20} color="var(--accent-rose)" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmitBooking} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Section 1: Assigned Tracking ID & Mode */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  1. Tracking Identifier & Carriage Service
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  The unique ID generated for this consignment
                </p>
              </div>

              <button
                type="button"
                onClick={handleRegenerateId}
                className="btn btn-secondary btn-sm"
              >
                <span>Generate New Code</span>
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '20px'
            }}>
              <div className="form-group">
                <label className="form-label">Tracking Number (Auto-Generated)</label>
                <input
                  type="text"
                  className="form-input"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
                  style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan-light)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Transport Mode</label>
                <select
                  className="form-select"
                  value={transportMode}
                  onChange={(e) => setTransportMode(e.target.value as TransportMode)}
                >
                  <option value="AIR_FREIGHT">Air Freight Priority (Flight)</option>
                  <option value="OCEAN_CARGO">Ocean Container Freight (Vessel)</option>
                  <option value="ROAD_EXPRESS">Overland Road Express (Truck)</option>
                  <option value="RAIL_FREIGHT">Intermodal Rail Cargo</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Service Priority Tier</label>
                <select
                  className="form-select"
                  value={serviceTier}
                  onChange={(e) => setServiceTier(e.target.value as ServiceTier)}
                >
                  <option value="EXPRESS_PRIORITY">Express Priority (Highest Uplift)</option>
                  <option value="STANDARD_CARGO">Standard Cargo Forwarding</option>
                  <option value="ECONOMY_FREIGHT">Economy Freight</option>
                  <option value="SECURE_DIPLOMATIC">Secure Diplomatic / Armored</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Shipper (Sender) Particulars */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
              2. Shipper (Sender) Information
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '18px'
            }}>
              <div className="form-group">
                <label className="form-label">Contact Person Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  className="form-input"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Company / Organization</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp"
                  className="form-input"
                  value={senderCompany}
                  onChange={(e) => setSenderCompany(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Street Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100 Main Street"
                  className="form-input"
                  value={senderAddress}
                  onChange={(e) => setSenderAddress(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Origin City *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. London"
                  className="form-input"
                  value={senderCity}
                  onChange={(e) => setSenderCity(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Origin Country *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. United Kingdom"
                  className="form-input"
                  value={senderCountry}
                  onChange={(e) => setSenderCountry(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +44 20 7946 0881"
                  className="form-input"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Shipper Email Address (Receives Confirmation & Waybill) *</label>
                <input
                  type="email"
                  required
                  placeholder="shipper@example.com"
                  className="form-input"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Consignee (Receiver) Particulars */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
              3. Consignee (Receiver) Information
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '18px'
            }}>
              <div className="form-group">
                <label className="form-label">Recipient Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Smith"
                  className="form-input"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Company / Entity</label>
                <input
                  type="text"
                  placeholder="e.g. Logistics Partners Ltd"
                  className="form-input"
                  value={receiverCompany}
                  onChange={(e) => setReceiverCompany(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Destination Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 450 Lexington Ave"
                  className="form-input"
                  value={receiverAddress}
                  onChange={(e) => setReceiverAddress(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Destination City *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. New York"
                  className="form-input"
                  value={receiverCity}
                  onChange={(e) => setReceiverCity(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Destination Country *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. United States"
                  className="form-input"
                  value={receiverCountry}
                  onChange={(e) => setReceiverCountry(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +1 212 555 0184"
                  className="form-input"
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Consignee Email Address (Receives Delivery Notice & Waybill) *</label>
                <input
                  type="email"
                  required
                  placeholder="consignee@example.com"
                  className="form-input"
                  value={receiverEmail}
                  onChange={(e) => setReceiverEmail(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Package Specifications */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
              4. Consignment Specs & Customs Details
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '18px',
              marginBottom: '20px'
            }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Description of Goods *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed description of merchandise or equipment"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cargo Category</label>
                <select
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Electronics">Electronics & Hardware</option>
                  <option value="Medical Electronics">Medical & Laboratory Goods</option>
                  <option value="Pharmaceutical">Pharmaceutical / Cold Chain</option>
                  <option value="High Value Luxury">High Value Luxury / Valuables</option>
                  <option value="Industrial Machinery">Industrial Machinery</option>
                  <option value="General Cargo">General Merchandise</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Piece Count</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={pieceCount}
                  onChange={(e) => setPieceCount(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Gross Weight (KG)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  className="form-input"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Math.max(0.1, Number(e.target.value) || 1))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Declared Customs Value</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={declaredValue}
                    onChange={(e) => setDeclaredValue(Number(e.target.value) || 0)}
                    style={{ flex: 1 }}
                  />
                  <select
                    className="form-select"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    style={{ width: '90px' }}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Checkbox Options */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-subtle)'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={isFragile}
                  onChange={(e) => setIsFragile(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-cyan)' }}
                />
                <span>Fragile Handling Required</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={temperatureControlled}
                  onChange={(e) => setTemperatureControlled(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-cyan)' }}
                />
                <span>Temperature-Controlled Chain</span>
              </label>
            </div>
          </div>

          {/* Submit Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
            <Link href="/" className="btn btn-secondary btn-lg">
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary btn-lg"
              style={{ minWidth: '220px' }}
            >
              {isSubmitting ? (
                <span>Generating Consignment...</span>
              ) : (
                <>
                  <PlusCircle size={20} />
                  <span>Generate Tracking ID</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading booking console...
      </div>
    }>
      <BookingFormContent />
    </Suspense>
  );
}
