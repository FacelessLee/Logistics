'use client';

import React from 'react';
import { Plane, Ship, Truck, MapPin, Navigation, Compass, Globe } from 'lucide-react';
import { Consignment } from '@/lib/types';
import { getStatusStepIndex } from '@/lib/utils';

interface RouteMapVisualProps {
  consignment: Consignment;
}

export default function RouteMapVisual({ consignment }: RouteMapVisualProps) {
  const step = getStatusStepIndex(consignment.status);
  const isDelivered = consignment.status === 'DELIVERED';

  // Compute vehicle progression percentage between 10% and 90%
  const progressPercent = isDelivered ? 92 : Math.max(12, Math.min(88, (step / 6) * 100));

  const getModeIcon = () => {
    switch (consignment.transportMode) {
      case 'OCEAN_CARGO':
        return <Ship size={20} color="#38bdf8" />;
      case 'ROAD_EXPRESS':
        return <Truck size={20} color="#38bdf8" />;
      default:
        return <Plane size={20} color="#38bdf8" />;
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', overflow: 'hidden' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Compass size={18} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Telemetry & Route Visualizer
          </h3>
        </div>

        <div style={{
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--accent-cyan-light)',
          background: 'rgba(14, 165, 233, 0.1)',
          padding: '4px 10px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(14, 165, 233, 0.25)'
        }}>
          <span className="badge-pulse" style={{ background: 'var(--accent-cyan)' }} />
          <span>Active GPS Telemetry Beacon</span>
        </div>
      </div>

      {/* SVG Interactive Map Graphic */}
      <div style={{
        background: 'linear-gradient(180deg, #071122 0%, #0c1b35 100%)',
        borderRadius: 'var(--radius-md)',
        padding: '30px 24px',
        position: 'relative',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.6)'
      }}>
        {/* Subtle Background Grid */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.8,
          pointerEvents: 'none'
        }} />

        {/* Flight / Transit SVG Arc */}
        <div style={{ position: 'relative', zIndex: 2, height: '120px', display: 'flex', alignItems: 'center' }}>
          <svg width="100%" height="100%" viewBox="0 0 700 120" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {/* Base Path */}
            <path
              d="M 50 85 Q 350 15 650 85"
              fill="none"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="3"
              strokeDasharray="6 6"
            />

            {/* Active Trajectory Path */}
            <path
              d="M 50 85 Q 350 15 650 85"
              fill="none"
              stroke="url(#routeGradient)"
              strokeWidth="4"
              strokeDasharray="700"
              strokeDashoffset={`${700 - (progressPercent / 100) * 700}`}
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />

            {/* Origin Dot */}
            <circle cx="50" cy="85" r="7" fill="#0ea5e9" />
            <circle cx="50" cy="85" r="14" fill="none" stroke="#0ea5e9" strokeOpacity="0.4" strokeWidth="2" />

            {/* Destination Dot */}
            <circle cx="650" cy="85" r="7" fill="#10b981" />
            <circle cx="650" cy="85" r="14" fill="none" stroke="#10b981" strokeOpacity="0.4" strokeWidth="2" />
          </svg>

          {/* Vehicle Indicator positioned dynamically along path */}
          <div style={{
            position: 'absolute',
            left: `${progressPercent}%`,
            top: '40px',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transition: 'left 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: '#09152b',
              border: '2px solid var(--accent-cyan-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(14, 165, 233, 0.8)'
            }}>
              {getModeIcon()}
            </div>
            <div style={{
              marginTop: '6px',
              background: 'rgba(6, 11, 20, 0.95)',
              border: '1px solid var(--border-active)',
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.72rem',
              color: '#ffffff',
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'nowrap'
            }}>
              {consignment.carrier.flightOrVesselNo || 'Transit Unit'}
            </div>
          </div>
        </div>

        {/* Origin & Destination Labels */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '10px',
          position: 'relative',
          zIndex: 3
        }}>
          {/* Origin Card */}
          <div style={{ maxWidth: '40%' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan-light)', textTransform: 'uppercase', fontWeight: 700 }}>
              ORIGIN TERMINAL
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
              {consignment.originLocation}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Shipper: {consignment.sender.company || consignment.sender.name}
            </div>
          </div>

          {/* Current Live Location Center */}
          <div style={{ textAlign: 'center', maxWidth: '30%' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              CURRENT SCAN LOCATION
            </div>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--accent-cyan-light)',
              background: 'rgba(14, 165, 233, 0.12)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              display: 'inline-block',
              marginTop: '4px'
            }}>
              {consignment.currentLocation}
            </div>
          </div>

          {/* Destination Card */}
          <div style={{ textAlign: 'right', maxWidth: '40%' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', textTransform: 'uppercase', fontWeight: 700 }}>
              DESTINATION CONCLAVE
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
              {consignment.destinationLocation}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Consignee: {consignment.receiver.company || consignment.receiver.name}
            </div>
          </div>
        </div>
      </div>

      {/* Corridor Metrics Footer */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        marginTop: '16px'
      }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SERVICE MODE</div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {consignment.transportMode.replace('_', ' ')}
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SERVICE TIER</div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-cyan-light)' }}>
            {consignment.serviceTier.replace('_', ' ')}
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ASSIGNED CARRIER</div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {consignment.carrier.name}
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>TOTAL PIECES & WEIGHT</div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {consignment.packageDetails.pieceCount} Pcs / {consignment.packageDetails.weightKg} kg
          </div>
        </div>
      </div>
    </div>
  );
}
