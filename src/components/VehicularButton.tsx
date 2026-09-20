'use client';

import React, { useState, useRef } from 'react';
import { ArrowRight, Truck } from 'lucide-react';

interface VehicularButtonProps {
  children?: React.ReactNode;
  text?: string;
  subtext?: string;
  variant?: 'primary' | 'secondary' | 'track' | 'outline';
  onClick?: (e?: React.MouseEvent) => void | Promise<void>;
  href?: string;
  className?: string;
  style?: React.CSSProperties;
  loadingText?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

export default function VehicularButton({
  children,
  text,
  variant = 'primary',
  onClick,
  href,
  className = '',
  style = {},
  loadingText,
  type = 'button',
  disabled = false,
}: VehicularButtonProps) {
  const [isZooming, setIsZooming] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'rev' | 'zoom' | 'completed'>('idle');
  const [clickCoord, setClickCoord] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);

  const displayLoadingText =
    loadingText ||
    (text?.toLowerCase().includes('dispatch')
      ? 'DISPATCHING CARGO...'
      : text?.toLowerCase().includes('rate') || text?.toLowerCase().includes('calculate')
      ? 'CALCULATING FREIGHT...'
      : text?.toLowerCase().includes('track')
      ? 'ACQUIRING TELEMETRY...'
      : 'DISPATCHING...');

  const handleClick = (e: React.MouseEvent) => {
    if (disabled || isZooming) return;

    // Get click coords for ripple / ignition flash
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setClickCoord({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }

    setIsZooming(true);
    setPhase('rev');

    // Rev phase -> Zoom phase
    setTimeout(() => {
      setPhase('zoom');
    }, 120);

    // Zoom phase completes -> trigger action
    setTimeout(() => {
      setPhase('completed');
      if (onClick) {
        onClick(e);
      } else if (href) {
        if (href.startsWith('#')) {
          const target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
          }
        } else {
          window.location.href = href;
        }
      }

      // Reset after transition finishes
      setTimeout(() => {
        setIsZooming(false);
        setPhase('idle');
      }, 700);
    }, 650);
  };

  const isPrimary = variant === 'primary' || variant === 'track';
  const isSecondary = variant === 'secondary';

  const baseStyles: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: variant === 'track' ? '12px 26px' : '15px 32px',
    borderRadius: '9999px',
    fontFamily: 'var(--font-sans)',
    fontSize: variant === 'track' ? '0.82rem' : '0.88rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    cursor: disabled || isZooming ? 'default' : 'pointer',
    overflow: 'hidden',
    userSelect: 'none',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    border: 'none',
    outline: 'none',
    ...(isPrimary
      ? {
          background: 'linear-gradient(135deg, #FF6B35 0%, #FF511A 50%, #E64A19 100%)',
          color: '#FFFFFF',
          boxShadow: isZooming
            ? '0 0 45px rgba(255, 107, 53, 0.75), inset 0 1px 0 rgba(255,255,255,0.4)'
            : '0 4px 20px rgba(255, 107, 53, 0.35), 0 0 0 1px rgba(255, 107, 53, 0.2)',
        }
      : {
          background: 'rgba(15, 15, 15, 0.85)',
          color: '#FFFFFF',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: isZooming
            ? '0 0 35px rgba(255, 107, 53, 0.4), inset 0 0 15px rgba(255, 107, 53, 0.2)'
            : '0 4px 15px rgba(0, 0, 0, 0.4)',
        }),
    transform:
      phase === 'rev'
        ? 'scale(0.96) translateY(1px)'
        : phase === 'zoom'
        ? 'scale(1.02)'
        : 'scale(1)',
    ...style,
  };

  const content = (
    <>
      {/* ── Background Highway Asphalt Texture / Glow on Click ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: isPrimary
            ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(255,107,53,0.15), transparent)',
          transform: isZooming ? 'translateX(100%)' : 'translateX(-100%)',
          transition: 'transform 0.6s ease',
          pointerEvents: 'none',
        }}
      />

      {/* ── Ignition Flash at Click Location ── */}
      {isZooming && (
        <span
          style={{
            position: 'absolute',
            left: clickCoord.x,
            top: clickCoord.y,
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #FFFFFF 0%, #FF8555 60%, transparent 100%)',
            transform: 'translate(-50%, -50%) scale(12)',
            opacity: phase === 'rev' ? 0.9 : 0,
            transition: 'transform 0.4s ease-out, opacity 0.4s ease-out',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ── Vehicular Zoom-Off Track (Active during click) ── */}
      {isZooming && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          {/* Highway Asphalt Road Markings (Rushing backward) */}
          <div
            className="vehicular-road-strip"
            style={{
              position: 'absolute',
              bottom: '5px',
              left: 0,
              right: 0,
              height: '3px',
              backgroundImage:
                'repeating-linear-gradient(90deg, #FFFFFF 0px, #FFFFFF 12px, transparent 12px, transparent 24px)',
              opacity: 0.6,
              animation: 'roadRush 0.2s linear infinite',
            }}
          />

          {/* Glowing Exhaust Neon Trail behind vehicle */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              height: '4px',
              background: 'linear-gradient(90deg, transparent, #FF8555 40%, #FFFFFF 100%)',
              boxShadow: '0 0 16px #FF6B35, 0 0 8px #FFA07A',
              transform: 'translateY(-50%)',
              width: phase === 'rev' ? '20%' : phase === 'zoom' ? '120%' : '0%',
              transition:
                phase === 'zoom'
                  ? 'width 0.45s cubic-bezier(0.7, 0, 0.84, 0)'
                  : 'width 0.1s ease',
              opacity: phase === 'completed' ? 0 : 0.9,
            }}
          />

          {/* Micro Exhaust Sparks */}
          <div
            style={{
              position: 'absolute',
              left: phase === 'zoom' ? '90%' : '15%',
              top: '50%',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#FFF',
              boxShadow: '0 0 12px #FFD700, 0 0 24px #FF4500',
              transform: 'translateY(-50%)',
              opacity: phase === 'zoom' ? 1 : 0,
              transition: 'left 0.45s cubic-bezier(0.7, 0, 0.84, 0)',
            }}
          />

          {/* The Zooming Semi-Hauler Vehicle */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: phase === 'rev' ? '6%' : phase === 'zoom' ? '110%' : '-20%',
              transform: 'translateY(-50%)',
              transition:
                phase === 'zoom'
                  ? 'left 0.48s cubic-bezier(0.75, 0, 0.85, 0.2)'
                  : 'left 0.12s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              color: '#FFFFFF',
              filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.9))',
            }}
          >
            {/* Custom high-tech hauler silhouette */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#FFFFFF',
                color: '#0A0A0A',
                padding: '3px 6px',
                borderRadius: '4px',
                fontWeight: 900,
                fontSize: '0.62rem',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.08em',
                boxShadow: '0 0 14px rgba(255, 255, 255, 0.8)',
              }}
            >
              <Truck size={14} style={{ marginRight: '4px', color: '#FF6B35' }} />
              NVT-EXP
            </div>
            {/* Supersonic Headlight Beam blasting forward */}
            <div
              style={{
                width: '35px',
                height: '16px',
                background:
                  'linear-gradient(90deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 100%)',
                clipPath: 'polygon(0 35%, 100% 0, 100% 100%, 0 65%)',
                filter: 'blur(1px)',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Main Button Text & Icons (Smooth Crossfade with Loading Text) ── */}
      <span
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          opacity: isZooming ? 0.25 : 1,
          transform: isZooming ? 'translateX(10px) scale(0.95)' : 'translateX(0) scale(1)',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {children || text}
        <span
          className="btn-vehicular-arrow"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <ArrowRight size={variant === 'track' ? 15 : 17} />
        </span>
      </span>

      {/* ── Floating Loading Telemetry Label when Zooming ── */}
      {isZooming && (
        <span
          style={{
            position: 'absolute',
            zIndex: 3,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.74rem',
            letterSpacing: '0.12em',
            color: '#FFFFFF',
            fontWeight: 800,
            textShadow: '0 2px 10px rgba(0,0,0,0.8)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#00FF66',
              boxShadow: '0 0 8px #00FF66',
              animation: 'pulse 0.5s infinite alternate',
            }}
          />
          {displayLoadingText}
        </span>
      )}
    </>
  );

  return (
    <button
      ref={buttonRef as React.RefObject<HTMLButtonElement>}
      type={type}
      className={`vehicular-btn ${className}`}
      style={baseStyles}
      onClick={handleClick}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (!isZooming) {
          if (isPrimary) {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
            e.currentTarget.style.boxShadow =
              '0 8px 30px rgba(255, 107, 53, 0.55), 0 0 0 1px rgba(255, 107, 53, 0.4)';
          } else {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
            e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.5)';
            e.currentTarget.style.boxShadow =
              '0 8px 25px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 107, 53, 0.2)';
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!isZooming) {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          if (isPrimary) {
            e.currentTarget.style.boxShadow =
              '0 4px 20px rgba(255, 107, 53, 0.35), 0 0 0 1px rgba(255, 107, 53, 0.2)';
          } else {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.4)';
          }
        }
      }}
    >
      {content}
    </button>
  );
}
