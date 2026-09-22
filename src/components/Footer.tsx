'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import FadeIn from '@/components/FadeIn';

export default function Footer() {
  const pathname = usePathname();

  if (pathname.startsWith('/operations') || pathname.startsWith('/admin')) return null;

  return (
    <footer
      className="site-footer"
      style={{
        background: '#080808',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        color: 'var(--text-secondary)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background architectural watermark */}
      <div
        style={{
          position: 'absolute',
          bottom: '-5%',
          right: '-5%',
          fontSize: 'clamp(8rem, 20vw, 22rem)',
          fontWeight: 900,
          fontFamily: 'var(--font-display)',
          color: 'rgba(255, 255, 255, 0.015)',
          lineHeight: 0.8,
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 0,
        }}
      >
        NVT
      </div>

      <div className="container" style={{ paddingTop: '100px', paddingBottom: '60px', position: 'relative', zIndex: 1 }}>
        {/* ── Top: Large Wordmark & Mission Statement ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '40px',
            marginBottom: '64px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '48px',
          }}
        >
          <FadeIn>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.2rem, 7vw, 5.8rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
                color: 'var(--text-primary)',
                lineHeight: 0.92,
                wordBreak: 'break-word',
              }}
            >
              NAVITHON<br />
              <span style={{ color: 'var(--accent-orange)' }}>LOGISTICS</span>
            </div>
          </FadeIn>

          <div style={{ maxWidth: '420px' }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: 'var(--accent-orange)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              GLOBAL FREIGHT ARCHITECTURE
            </div>
            <p
              style={{
                fontSize: '0.95rem',
                lineHeight: 1.7,
                color: 'var(--text-secondary)',
              }}
            >
              One operator. Every leg of the journey. Freight forwarding, air cargo charters, ocean container logistics, and licensed customs brokerage unified under one single accountable standard.
            </p>

            <div
              style={{
                marginTop: '20px',
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.68rem',
                  padding: '5px 12px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '9999px',
                  color: 'var(--text-muted)',
                }}
              >
                IATA CARGO AGENT #02-1-8492
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.68rem',
                  padding: '5px 12px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '9999px',
                  color: 'var(--text-muted)',
                }}
              >
                FMC REG. #029481
              </span>
            </div>
          </div>
        </div>

        {/* ── Grid Columns ── */}
        <div className="grid-footer-4col">
          {/* Col 1: Navigation */}
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--accent-orange)',
                marginBottom: '20px',
              }}
            >
              01 • Navigation
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '0.92rem',
              }}
            >
              {[
                { href: '/', label: 'Home' },
                { href: '#about', label: 'Company Overview' },
                { href: '#services', label: 'Services Matrix' },
                { href: '#hardware', label: 'Fleet & Hardware' },
                { href: '#industries', label: 'Sector Solutions' },
                { href: '#contact', label: 'Direct Dispatch' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.color = '#FFFFFF';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.color = 'var(--text-secondary)';
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Col 2: Services */}
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--accent-orange)',
                marginBottom: '20px',
              }}
            >
              02 • Capabilities
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '0.92rem',
              }}
            >
              {[
                'Air Cargo & Charters',
                'Ocean Freight (FCL / LCL)',
                'Intermodal Road & Rail',
                'In-House Customs Brokerage',
                'High-Bay Automated 3PL',
                'Heavy Project Cargo',
              ].map((service) => (
                <span
                  key={service}
                  style={{
                    color: 'var(--text-secondary)',
                    cursor: 'default',
                  }}
                >
                  {service}
                </span>
              ))}
            </div>
          </div>

          {/* Col 3: Real-Time Systems */}
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--accent-orange)',
                marginBottom: '20px',
              }}
            >
              03 • Digital Portals
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '0.92rem',
              }}
            >
              {[
                { href: '/track', label: 'Real-Time Telemetry Tracking' },
                { href: '/book', label: 'Instant Freight Rate Calculator' },
                { href: '#contact', label: 'Direct Dispatch Desk Inquiry' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.color = 'var(--accent-orange)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.color = 'var(--text-secondary)';
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Col 4: Dispatch Contacts & Hubs */}
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--accent-orange)',
                marginBottom: '20px',
              }}
            >
              04 • Global Gateways
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '0.92rem',
              }}
            >
              <a
                href="mailto:contact@navithon.com"
                style={{
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  letterSpacing: '0.04em',
                }}
              >
                contact@navithon.com
              </a>
              <a
                href="tel:+18005551234"
                style={{
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                }}
              >
                +1 (800) 555-1234
              </a>

              <div style={{ marginTop: '16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Operating Hubs:</div>
                <div style={{ marginTop: '4px', lineHeight: 1.6 }}>
                  Melbourne • Singapore • Rotterdam • New York • Dubai
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="container">
        <div className="footer-bottom-bar">
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
            &copy; {new Date().getFullYear()} NAVITHON LOGISTICS INTERNATIONAL INC. ALL RIGHTS RESERVED.
          </div>
          <div
            className="footer-bottom-links"
            style={{
              display: 'flex',
              gap: '24px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.74rem',
              color: 'var(--text-muted)',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
            <span style={{ cursor: 'pointer' }}>Standard Trading Conditions</span>
            <span style={{ cursor: 'pointer' }}>Customs Compliance</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
