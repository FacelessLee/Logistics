'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Activity, Gauge, Zap } from 'lucide-react';

interface HeroTruckSceneProps {
  onBoostChange?: (active: boolean) => void;
}

export default function HeroTruckScene({ onBoostChange }: HeroTruckSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isBoosted, setIsBoosted] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Speed streak particle animation on the wet asphalt
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 800);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Streaks on the asphalt road
    // Located in bottom 45% of the scene
    interface Streak {
      x: number;
      y: number;
      length: number;
      speed: number;
      opacity: number;
      color: string;
      thickness: number;
    }

    const colors = [
      'rgba(255, 107, 53, ', // Brand Orange
      'rgba(255, 140, 0, ',  // Dark Orange
      'rgba(255, 180, 50, ', // Warm Amber
      'rgba(255, 230, 150, ', // Headlight White/Gold
    ];

    const streaks: Streak[] = [];
    const streakCount = 38;

    for (let i = 0; i < streakCount; i++) {
      streaks.push({
        x: Math.random() * width,
        y: height * 0.58 + Math.random() * (height * 0.38),
        length: 80 + Math.random() * 260,
        speed: 4 + Math.random() * 8,
        opacity: 0.15 + Math.random() * 0.55,
        color: colors[Math.floor(Math.random() * colors.length)],
        thickness: 1 + Math.random() * 2.5,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const speedMultiplier = isBoosted ? 2.8 : 1.0;

      for (let i = 0; i < streaks.length; i++) {
        const s = streaks[i];

        // Move streak from right to left (truck moving forward relative to road)
        s.x -= s.speed * speedMultiplier;

        // Reset if off left screen
        if (s.x + s.length < 0) {
          s.x = width + Math.random() * 100;
          s.y = height * 0.58 + Math.random() * (height * 0.38);
          s.length = 80 + Math.random() * 280;
          s.speed = 4 + Math.random() * 9;
        }

        // Perspective taper: lines closer to bottom are faster and wider
        const verticalProgress = (s.y - height * 0.58) / (height * 0.42);
        const dynamicThickness = s.thickness * (0.8 + verticalProgress * 0.8);

        // Draw light streak gradient
        const grad = ctx.createLinearGradient(s.x, s.y, s.x + s.length, s.y);
        grad.addColorStop(0, `${s.color}0)`);
        grad.addColorStop(0.3, `${s.color}${s.opacity * 0.5})`);
        grad.addColorStop(0.85, `${s.color}${s.opacity})`);
        grad.addColorStop(1, `${s.color}${s.opacity * 0.9})`);

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + s.length, s.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = dynamicThickness;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Glow pass for prominent streaks
        if (s.thickness > 2) {
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x + s.length, s.y);
          ctx.strokeStyle = `${s.color}${s.opacity * 0.3})`;
          ctx.lineWidth = dynamicThickness * 3;
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isBoosted]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const toggleBoost = () => {
    const next = !isBoosted;
    setIsBoosted(next);
    onBoostChange?.(next);
  };

  return (
    <div
      className="hero-truck-scene"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setMousePos({ x: 0, y: 0 });
      }}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'auto',
        userSelect: 'none',
      }}
    >
      {/* ── 1. Base Photographic Plate (Cinematic Volvo FH Hauler) ── */}
      <div
        className="truck-idle-rig"
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${isBoosted ? 1.03 : 1.01}) translate3d(${mousePos.x * 12}px, ${
            mousePos.y * 8
          }px, 0)`,
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <Image
          src="/images/hero-truck-bg.jpg"
          alt="Navithon Global Freight Prime Mover Fleet"
          fill
          priority
          sizes="100vw"
          quality={95}
          style={{
            objectFit: 'cover',
            objectPosition: 'right 30%',
            filter: isBoosted
              ? 'brightness(1.08) contrast(1.18) saturate(1.15)'
              : 'brightness(0.96) contrast(1.12) saturate(1.05)',
            transition: 'filter 0.5s ease',
          }}
        />

        {/* ── 2. Cinematic Atmospheric Gradient Overlays ── */}
        {/* Dark Left Vignette for pure text legibility */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, #0A0A0A 0%, rgba(10, 10, 10, 0.94) 34%, rgba(10, 10, 10, 0.65) 55%, rgba(10, 10, 10, 0.1) 80%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top Header Shade & Bottom Road Darkening */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(10, 10, 10, 0.85) 0%, transparent 22%, transparent 70%, rgba(10, 10, 10, 0.95) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* ── 3. High-Altitude Jetliner Strobe Beacon ── */}
        {/* Placed accurately at the jetliner in the sunset sky (top right) */}
        <div
          className="airplane-strobe-pulse"
          style={{
            position: 'absolute',
            top: '20.5%',
            right: '8.5%',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#FFFFFF',
            boxShadow: '0 0 12px 3px #FFFFFF, 0 0 24px 6px #FF4500',
            animation: 'beaconStrobe 1.2s cubic-bezier(0.1, 0.9, 0.2, 1) infinite',
            pointerEvents: 'none',
          }}
        />

        {/* Red Port Navigation Wingtip Light */}
        <div
          style={{
            position: 'absolute',
            top: '23.8%',
            right: '11.8%',
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: '#FF3333',
            boxShadow: '0 0 8px 2px #FF0000',
            animation: 'beaconBlink 0.8s ease-in-out infinite alternate',
            pointerEvents: 'none',
          }}
        />

        {/* ── 4. Sky Network Trade Arcs & Glowing Nodes ── */}
        <svg
          viewBox="0 0 1200 600"
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '55%',
            pointerEvents: 'none',
            opacity: 0.85,
          }}
        >
          <defs>
            <linearGradient id="arcGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.05" />
              <stop offset="50%" stopColor="#FF8555" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FFA07A" stopOpacity="0.1" />
            </linearGradient>
            <filter id="blurGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Arcs connecting trade nodes */}
          <path
            d="M 320 280 Q 560 60 820 180"
            fill="none"
            stroke="url(#arcGlow)"
            strokeWidth="1.6"
            strokeDasharray="6 4"
            className="arc-pulse-flow-1"
          />
          <path
            d="M 520 220 Q 750 40 1020 160"
            fill="none"
            stroke="url(#arcGlow)"
            strokeWidth="2"
            filter="url(#blurGlow)"
            className="arc-pulse-flow-2"
          />
          <path
            d="M 680 190 Q 880 70 1140 240"
            fill="none"
            stroke="rgba(255, 107, 53, 0.45)"
            strokeWidth="1.2"
            strokeDasharray="4 6"
          />

          {/* Trade Hub Pulse Dots */}
          <circle cx="560" cy="120" r="3.5" fill="#FF8555" className="hub-dot-pulse">
            <animate attributeName="r" values="2.5;5;2.5" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;1;0.6" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle cx="780" cy="110" r="4" fill="#FFA07A" className="hub-dot-pulse">
            <animate attributeName="r" values="3;6;3" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="920" cy="150" r="3" fill="#FF6B35" className="hub-dot-pulse" />
        </svg>

        {/* ── 5. Volvo FH Truck Engine Idle & Suspension Physics ── */}
        {/* Layered Volumetric Headlight Beams & Projector Flares */}
        <div
          className="truck-suspension-idle"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
          }}
        >
          {/* Left Headlight Beam (Cast toward wet road) */}
          <div
            className="headlight-beam-left"
            style={{
              position: 'absolute',
              top: '55%',
              right: '46%',
              width: '180px',
              height: '90px',
              background:
                'radial-gradient(ellipse at 85% 20%, rgba(255, 245, 220, 0.75) 0%, rgba(255, 140, 50, 0.35) 45%, transparent 75%)',
              clipPath: 'polygon(75% 15%, 100% 30%, 30% 100%, 0% 70%)',
              filter: 'blur(5px)',
              transform: isBoosted ? 'scale(1.2)' : 'scale(1)',
              opacity: isBoosted ? 0.95 : 0.75,
              transition: 'all 0.3s ease',
              animation: 'headlightFlicker 4s ease-in-out infinite alternate',
            }}
          />

          {/* Right Headlight Beam (Direct projector lens flare) */}
          <div
            className="headlight-beam-right"
            style={{
              position: 'absolute',
              top: '55.5%',
              right: '35.5%',
              width: '200px',
              height: '110px',
              background:
                'radial-gradient(ellipse at 85% 20%, rgba(255, 255, 240, 0.85) 0%, rgba(255, 150, 60, 0.4) 40%, transparent 75%)',
              clipPath: 'polygon(70% 15%, 100% 30%, 40% 100%, 10% 80%)',
              filter: 'blur(6px)',
              transform: isBoosted ? 'scale(1.25)' : 'scale(1)',
              opacity: isBoosted ? 0.95 : 0.8,
              transition: 'all 0.3s ease',
              animation: 'headlightFlicker 3.5s ease-in-out infinite alternate-reverse',
            }}
          />

          {/* Left Projector Glare Starburst */}
          <div
            style={{
              position: 'absolute',
              top: '56.5%',
              right: '47.8%',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: '#FFFFFF',
              boxShadow:
                '0 0 25px 6px rgba(255, 255, 255, 0.95), 0 0 50px 15px rgba(255, 140, 50, 0.7)',
              filter: 'blur(0.5px)',
              transform: 'translate(50%, -50%)',
              animation: 'headlightPulse 2.5s ease-in-out infinite',
            }}
          />

          {/* Right Projector Glare Starburst */}
          <div
            style={{
              position: 'absolute',
              top: '57%',
              right: '36.5%',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#FFFFFF',
              boxShadow:
                '0 0 28px 8px rgba(255, 255, 255, 0.95), 0 0 55px 18px rgba(255, 140, 50, 0.7)',
              filter: 'blur(0.5px)',
              transform: 'translate(50%, -50%)',
              animation: 'headlightPulse 2.8s ease-in-out infinite alternate',
            }}
          />

          {/* Wet Asphalt Reflection Pool (Glowing on road) */}
          <div
            style={{
              position: 'absolute',
              top: '68%',
              right: '34%',
              width: '260px',
              height: '60px',
              borderRadius: '50%',
              background:
                'radial-gradient(ellipse, rgba(255, 160, 50, 0.55) 0%, rgba(255, 107, 53, 0.25) 45%, transparent 75%)',
              filter: 'blur(12px)',
              transform: isBoosted ? 'scale(1.2)' : 'scale(1)',
              animation: 'reflectionShimmer 2.2s ease-in-out infinite alternate',
            }}
          />

          {/* Amber Cab Roof Visor Marker LEDs (Authentic commercial clearance lights) */}
          <div
            style={{
              position: 'absolute',
              top: '29.5%',
              right: '41.5%',
              display: 'flex',
              gap: '11px',
            }}
          >
            {[0, 1, 2, 3].map((idx) => (
              <span
                key={idx}
                style={{
                  width: '4px',
                  height: '3px',
                  borderRadius: '1px',
                  background: '#FFA000',
                  boxShadow: '0 0 8px 2px #FF8C00, 0 0 16px 4px rgba(255, 107, 53, 0.6)',
                  opacity: 0.85,
                  animation: `amberMarkerBreathe ${1.8 + idx * 0.2}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>

          {/* Cab Side Mirror Amber Clearance LED */}
          <div
            style={{
              position: 'absolute',
              top: '36.8%',
              right: '33.2%',
              width: '3px',
              height: '6px',
              borderRadius: '1px',
              background: '#FFA000',
              boxShadow: '0 0 9px 2px #FF8C00',
            }}
          />
        </div>

        {/* ── 6. Canvas High-Speed Orange Velocity Trails ── */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 3,
          }}
        />
      </div>

      {/* ── 7. Interactive Engine Telemetry HUD Pill (Discreet, High-Tech Luxury) ── */}
      <div
        className="hide-mobile"
        style={{
          position: 'absolute',
          top: 'calc(var(--header-height) + 24px)',
          right: '48px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(15, 15, 15, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '9999px',
          padding: '6px 16px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.68rem',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: isBoosted
            ? '0 0 25px rgba(255, 107, 53, 0.4), 0 4px 20px rgba(0,0,0,0.6)'
            : '0 4px 15px rgba(0, 0, 0, 0.4)',
        }}
        onClick={toggleBoost}
        title="Toggle prime mover throttle boost"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            className="badge-pulse"
            style={{
              background: isBoosted ? '#00FF66' : 'var(--accent-orange)',
              width: '6px',
              height: '6px',
            }}
          />
          <span style={{ color: '#FFFFFF', fontWeight: 700 }}>VOLVO FH16 700HP</span>
        </div>
        <span style={{ opacity: 0.3 }}>|</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Gauge size={12} style={{ color: isBoosted ? '#00FF66' : 'var(--accent-orange)' }} />
          <span>{isBoosted ? '112 KM/H // LINEHAUL BOOST' : 'IDLE 650 RPM // STANDBY'}</span>
        </div>
        <span style={{ opacity: 0.3 }}>|</span>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: isBoosted ? '#00FF66' : 'var(--accent-orange)',
            fontWeight: 800,
          }}
        >
          <Zap size={11} />
          {isBoosted ? 'BOOST ON' : 'THROTTLE'}
        </div>
      </div>
    </div>
  );
}
