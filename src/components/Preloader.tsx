'use client';

import { useEffect, useState } from 'react';

const servicesList = [
  'Air Freight Division',
  'Ocean Freight Systems',
  'Customs & Compliance',
  'Global 3PL Hubs',
  'Intermodal Network',
  'Real-Time Telemetry',
];

export default function Preloader() {
  const [progress, setProgress] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [currentService, setCurrentService] = useState(servicesList[0]);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 14 + 6;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setProgress(100);
        setTimeout(() => {
          setHidden(true);
        }, 500);
      } else {
        const rounded = Math.round(current);
        setProgress(rounded);
        const idx = Math.floor((rounded / 100) * servicesList.length);
        setCurrentService(servicesList[Math.min(idx, servicesList.length - 1)]);
      }
    }, 70);

    return () => clearInterval(interval);
  }, []);

  if (hidden) return null;

  return (
    <div
      className={`preloader ${progress >= 100 ? 'hidden' : ''}`}
      style={{
        background: '#080808',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '440px', width: '90%' }}>
        {/* Brand Wordmark */}
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#FFFFFF',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          <span
            style={{
              width: '10px',
              height: '10px',
              background: 'var(--accent-orange)',
              transform: 'rotate(45deg)',
              display: 'inline-block',
            }}
          />
          NAVITHON
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            letterSpacing: '0.25em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            marginBottom: '36px',
          }}
        >
          LOGISTICS &bull; FREIGHT ARCHITECTURE
        </div>

        {/* Progress bar container */}
        <div
          style={{
            width: '100%',
            height: '2px',
            background: 'rgba(255, 255, 255, 0.08)',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #FF6B35, #FFA26B)',
              boxShadow: '0 0 12px rgba(255, 107, 53, 0.8)',
              transition: 'width 80ms ease-out',
            }}
          />
        </div>

        {/* Bottom Telemetry Meta */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          <span style={{ color: 'var(--accent-orange)' }}>// {currentService}</span>
          <span>{String(progress).padStart(3, '0')}%</span>
        </div>
      </div>
    </div>
  );
}
