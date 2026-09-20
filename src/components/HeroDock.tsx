'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plane, Ship, Shield, Search, Compass, ArrowRight } from 'lucide-react';
import VehicularButton from './VehicularButton';

interface HeroDockProps {
  onSelectService?: (serviceKey: string) => void;
}

export default function HeroDock({ onSelectService }: HeroDockProps) {
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [activeHoverCard, setActiveHoverCard] = useState<string | null>(null);

  const handleTrack = () => {
    const clean = trackingNumber.trim() || 'TRK-2026-89420';
    router.push(`/track/${encodeURIComponent(clean)}`);
  };

  const handleServiceClick = (serviceKey: string, anchor: string) => {
    if (onSelectService) {
      onSelectService(serviceKey);
    }
    const element = document.querySelector(anchor);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      className="hero-dock-wrap"
      style={{
        position: 'relative',
        zIndex: 20,
        width: '100%',
        maxWidth: '1380px',
        margin: '0 auto',
        padding: '0 20px',
      }}
    >
      <div
        className="hero-dock-container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(420px, 1.35fr) minmax(320px, 1.65fr)',
          gap: '16px',
          background: 'rgba(12, 12, 14, 0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '18px',
          padding: '16px 20px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* ── Left Side: Live Shipment Tracking Module ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '12px',
            paddingRight: '16px',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          }}
          className="dock-tracking-section"
        >
          {/* Header Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(255, 107, 53, 0.1)',
                border: '1.5px solid rgba(255, 107, 53, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-orange)',
                flexShrink: 0,
              }}
            >
              <Compass size={20} className="spin-slow" />
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  lineHeight: 1.2,
                }}
              >
                LIVE SHIPMENT TRACKING
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.74rem',
                  color: 'rgba(255, 255, 255, 0.55)',
                  marginTop: '2px',
                }}
              >
                Track your cargo in real time
              </div>
            </div>
          </div>

          {/* Search Input Box with Tracking Action */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleTrack();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(20, 20, 24, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '9999px',
              padding: '4px 5px 4px 14px',
              transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
              width: '100%',
            }}
            className="dock-search-form"
          >
            <Search size={16} style={{ color: 'rgba(255, 255, 255, 0.4)', marginRight: '10px', flexShrink: 0 }} />
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number, B/L, or container number"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#FFFFFF',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.82rem',
                width: '100%',
              }}
            />
            <VehicularButton
              type="submit"
              variant="track"
              text="TRACK"
              loadingText="LOCKING SATELLITE..."
              onClick={() => handleTrack()}
              style={{
                flexShrink: 0,
                padding: '9px 20px',
                fontSize: '0.76rem',
                letterSpacing: '0.08em',
              }}
            />
          </form>

          {/* Quick Clickable Consignments */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              color: 'rgba(255, 255, 255, 0.4)',
              flexWrap: 'wrap',
            }}
          >
            <span>TRY:</span>
            {['TRK-2026-89420', 'SEA-4011-SHA-ROT'].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setTrackingNumber(sample)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  color: 'var(--accent-orange)',
                  padding: '2px 6px',
                  fontSize: '0.65rem',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 107, 53, 0.15)';
                  e.currentTarget.style.borderColor = 'var(--accent-orange)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {/* ── Right Side: 3 Quick Modal Services ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
          }}
          className="dock-services-grid"
        >
          {/* Service Card 1: Air Freight */}
          <div
            className="dock-card"
            onClick={() => handleServiceClick('air', '#services')}
            onMouseEnter={() => setActiveHoverCard('air')}
            onMouseLeave={() => setActiveHoverCard(null)}
            style={{
              background:
                activeHoverCard === 'air'
                  ? 'rgba(255, 107, 53, 0.08)'
                  : 'rgba(20, 20, 24, 0.65)',
              border:
                activeHoverCard === 'air'
                  ? '1px solid rgba(255, 107, 53, 0.4)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transform: activeHoverCard === 'air' ? 'translateY(-3px)' : 'none',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--accent-orange)',
                  marginBottom: '6px',
                }}
              >
                <Plane size={18} />
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#FFFFFF',
                  }}
                >
                  AIR FREIGHT
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.74rem',
                  color: 'rgba(255, 255, 255, 0.65)',
                  lineHeight: 1.35,
                }}
              >
                Fast, reliable, global.
              </div>
            </div>

            <div
              style={{
                marginTop: '10px',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.85)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>12+ major airports</span>
              <ArrowRight size={13} style={{ color: 'var(--accent-orange)' }} />
            </div>
          </div>

          {/* Service Card 2: Ocean Freight */}
          <div
            className="dock-card"
            onClick={() => handleServiceClick('ocean', '#services')}
            onMouseEnter={() => setActiveHoverCard('ocean')}
            onMouseLeave={() => setActiveHoverCard(null)}
            style={{
              background:
                activeHoverCard === 'ocean'
                  ? 'rgba(255, 107, 53, 0.08)'
                  : 'rgba(20, 20, 24, 0.65)',
              border:
                activeHoverCard === 'ocean'
                  ? '1px solid rgba(255, 107, 53, 0.4)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transform: activeHoverCard === 'ocean' ? 'translateY(-3px)' : 'none',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--accent-orange)',
                  marginBottom: '6px',
                }}
              >
                <Ship size={18} />
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#FFFFFF',
                  }}
                >
                  OCEAN FREIGHT
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.74rem',
                  color: 'rgba(255, 255, 255, 0.65)',
                  lineHeight: 1.35,
                }}
              >
                Cost-effective. Scalable.
              </div>
            </div>

            <div
              style={{
                marginTop: '10px',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.85)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>200+ ports worldwide</span>
              <ArrowRight size={13} style={{ color: 'var(--accent-orange)' }} />
            </div>
          </div>

          {/* Service Card 3: Customs */}
          <div
            className="dock-card"
            onClick={() => handleServiceClick('customs', '#services')}
            onMouseEnter={() => setActiveHoverCard('customs')}
            onMouseLeave={() => setActiveHoverCard(null)}
            style={{
              background:
                activeHoverCard === 'customs'
                  ? 'rgba(255, 107, 53, 0.08)'
                  : 'rgba(20, 20, 24, 0.65)',
              border:
                activeHoverCard === 'customs'
                  ? '1px solid rgba(255, 107, 53, 0.4)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transform: activeHoverCard === 'customs' ? 'translateY(-3px)' : 'none',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--accent-orange)',
                  marginBottom: '6px',
                }}
              >
                <Shield size={18} />
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#FFFFFF',
                  }}
                >
                  CUSTOMS
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.74rem',
                  color: 'rgba(255, 255, 255, 0.65)',
                  lineHeight: 1.35,
                }}
              >
                Compliant. Hassle-free.
              </div>
            </div>

            <div
              style={{
                marginTop: '10px',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.85)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>Certified in-house brokerage</span>
              <ArrowRight size={13} style={{ color: 'var(--accent-orange)' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
