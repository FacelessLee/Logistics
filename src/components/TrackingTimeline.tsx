'use client';

import React from 'react';
import {
  CheckCircle2,
  Clock,
  MapPin,
  Truck,
  Plane,
  Ship,
  ShieldCheck,
  AlertTriangle,
  Building2,
  Calendar
} from 'lucide-react';
import { Consignment, Checkpoint, ShipmentStatus } from '@/lib/types';
import { formatDate, getStatusStepIndex, MILESTONE_STEPS, getStatusColor } from '@/lib/utils';

interface TrackingTimelineProps {
  consignment: Consignment;
}

export default function TrackingTimeline({ consignment }: TrackingTimelineProps) {
  const currentStep = getStatusStepIndex(consignment.status);
  const isDelivered = consignment.status === 'DELIVERED';
  const isException = consignment.status === 'EXCEPTION_ON_HOLD';

  // Sort checkpoints descending (newest first for tracking logs)
  const sortedCheckpoints = [...consignment.checkpoints].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const getStatusIcon = (status: ShipmentStatus) => {
    switch (status) {
      case 'DELIVERED':
        return <CheckCircle2 size={20} color="#10b981" />;
      case 'OUT_FOR_DELIVERY':
        return <Truck size={20} color="#0284c7" />;
      case 'IN_TRANSIT':
      case 'DEPARTED_FACILITY':
        return <Plane size={20} color="#3b82f6" />;
      case 'CUSTOMS_CLEARANCE':
        return <ShieldCheck size={20} color="#f59e0b" />;
      case 'EXCEPTION_ON_HOLD':
        return <AlertTriangle size={20} color="#ef4444" />;
      default:
        return <Clock size={20} color="#94a3b8" />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Visual Stepper Card */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Consignment Progress Journey
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Real-time milestone progression from origin dispatch to final consignee delivery
            </p>
          </div>

          <div style={{
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)'
          }}>
            Step {Math.min(currentStep + 1, MILESTONE_STEPS.length)} of {MILESTONE_STEPS.length}
          </div>
        </div>

        {/* Stepper Grid / Bar */}
        <div style={{ position: 'relative', margin: '20px 0 10px' }}>
          {/* Progress Bar Background Line */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '30px',
            right: '30px',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.08)',
            zIndex: 1,
            borderRadius: '4px'
          }} />

          {/* Active Progress Fill Line */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '30px',
            width: `${Math.min(100, (currentStep / (MILESTONE_STEPS.length - 1)) * 92)}%`,
            height: '4px',
            background: isDelivered
              ? 'linear-gradient(90deg, #0ea5e9, #10b981)'
              : 'linear-gradient(90deg, #0ea5e9, #38bdf8)',
            boxShadow: '0 0 12px rgba(14, 165, 233, 0.6)',
            zIndex: 2,
            borderRadius: '4px',
            transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
          }} />

          {/* Step Nodes */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 3
          }}>
            {MILESTONE_STEPS.map((step, idx) => {
              const isPast = idx < currentStep;
              const isCurrent = idx === currentStep;
              const isUpcoming = idx > currentStep;

              return (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    maxWidth: '85px'
                  }}
                >
                  {/* Node Circle */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isCurrent
                      ? 'var(--accent-cyan)'
                      : isPast
                      ? '#0f314d'
                      : 'var(--bg-surface-elevated)',
                    border: isCurrent
                      ? '3px solid #ffffff'
                      : isPast
                      ? '2px solid var(--accent-cyan)'
                      : '2px solid var(--border-subtle)',
                    color: isCurrent || isPast ? '#ffffff' : 'var(--text-muted)',
                    boxShadow: isCurrent ? '0 0 20px rgba(14, 165, 233, 0.8)' : 'none',
                    transition: 'all 0.3s ease',
                    marginBottom: '10px'
                  }}>
                    {isPast ? (
                      <CheckCircle2 size={18} color="#38bdf8" />
                    ) : isCurrent ? (
                      <span className="badge-pulse" style={{ background: '#ffffff', width: '10px', height: '10px' }} />
                    ) : (
                      <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{idx + 1}</span>
                    )}
                  </div>

                  {/* Label */}
                  <span style={{
                    fontSize: '0.76rem',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent
                      ? 'var(--accent-cyan-light)'
                      : isPast
                      ? 'var(--text-primary)'
                      : 'var(--text-muted)',
                    lineHeight: 1.2
                  }}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Granular Activity Checkpoint History */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '16px'
        }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Shipment Activity & Tracking Log
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Official telemetry and security scans logged along the route
            </p>
          </div>
          <span style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)'
          }}>
            {sortedCheckpoints.length} Logged Events
          </span>
        </div>

        {/* Checkpoint list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
          {/* Vertical Connecting Line */}
          <div style={{
            position: 'absolute',
            top: '24px',
            bottom: '24px',
            left: '19px',
            width: '2px',
            background: 'rgba(255, 255, 255, 0.08)',
            zIndex: 1
          }} />

          {sortedCheckpoints.map((cp, idx) => {
            const isLatest = idx === 0;
            const colors = getStatusColor(cp.status);

            return (
              <div
                key={cp.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '20px',
                  position: 'relative',
                  zIndex: 2
                }}
              >
                {/* Node Icon */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: isLatest ? colors.bg : 'var(--bg-surface-elevated)',
                  border: `1px solid ${isLatest ? colors.border : 'var(--border-subtle)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: isLatest ? '0 0 16px rgba(14, 165, 233, 0.25)' : 'none'
                }}>
                  {getStatusIcon(cp.status)}
                </div>

                {/* Event Details Card */}
                <div style={{
                  flex: 1,
                  background: isLatest ? 'rgba(14, 165, 233, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${isLatest ? 'rgba(14, 165, 233, 0.2)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 20px',
                  transition: 'all var(--transition-fast)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '6px'
                  }}>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '0.98rem',
                      color: isLatest ? 'var(--accent-cyan-light)' : 'var(--text-primary)'
                    }}>
                      {cp.title}
                    </span>

                    <span style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <Calendar size={13} />
                      {formatDate(cp.timestamp)}
                    </span>
                  </div>

                  <p style={{
                    fontSize: '0.88rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    marginBottom: '12px'
                  }}>
                    {cp.description}
                  </p>

                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '14px',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <MapPin size={14} color="var(--accent-cyan)" />
                      <span style={{ color: 'var(--text-primary)' }}>{cp.location}</span>
                    </div>

                    {cp.facility && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Building2 size={14} color="var(--accent-blue)" />
                        <span>{cp.facility}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
