'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '#about', label: 'About' },
  { href: '#services', label: 'Services' },
  { href: '#industries', label: 'Industries' },
  { href: '/track', label: 'Track' },
  { href: '/book', label: 'Book' },
  { href: '#contact', label: 'Contact' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<(HTMLAnchorElement | null)[]>([]);

  const isOperationsShell = pathname.startsWith('/operations') || pathname.startsWith('/admin');

  // Track scroll position for header background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Animate menu open/close with GSAP
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cleanup: (() => void) | undefined;

    const animate = async () => {
      const gsapModule = await import('gsap');
      const gsap = gsapModule.default || gsapModule;

      if (menuOpen) {
        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Animate links in
        gsap.fromTo(
          linksRef.current.filter(Boolean),
          { yPercent: 100, opacity: 0 },
          {
            yPercent: 0,
            opacity: 0.4,
            duration: 0.6,
            ease: 'power3.out',
            stagger: 0.05,
            delay: 0.15,
          }
        );
      } else {
        document.body.style.overflow = '';
      }

      cleanup = () => {
        document.body.style.overflow = '';
      };
    };

    animate();

    return () => {
      cleanup?.();
    };
  }, [menuOpen]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  if (isOperationsShell) return null;

  return (
    <>
      {/* ── Fixed Header Bar ── */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          height: 'var(--header-height)',
          display: 'flex',
          alignItems: 'center',
          transition: 'background 0.4s ease, backdrop-filter 0.4s ease',
          background: scrolled
            ? 'rgba(10, 10, 10, 0.9)'
            : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* ── Left: Brand Wordmark Matching Mockup ── */}
          <Link
            href="/"
            onClick={closeMenu}
            style={{
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              zIndex: 210,
            }}
          >
            {/* Aerodynamic Dual-Chevron Brand Mark */}
            <div
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <path
                  d="M6 24L14 8H19L11 24H6Z"
                  fill="#FF6B35"
                />
                <path
                  d="M15 24L23 8H28L20 24H15Z"
                  fill="#FF8555"
                />
              </svg>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.28rem',
                fontWeight: 900,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                lineHeight: 1,
                color: '#FFFFFF',
              }}
            >
              NAVITHON
            </div>
          </Link>

          {/* ── Center / Right: Clean Direct Nav Links (SERVICES ⌵, TRACKING, TRADE LANES, ABOUT) ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '32px',
            }}
          >
            <div
              className="hide-mobile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '28px',
              }}
            >
              <Link
                href="#services"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-sans)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  opacity: 0.9,
                  transition: 'opacity 0.2s ease, color 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-orange)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#FFFFFF')}
              >
                SERVICES
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </Link>

              <Link
                href="/track"
                style={{
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-sans)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  opacity: 0.9,
                  transition: 'opacity 0.2s ease, color 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-orange)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#FFFFFF')}
              >
                TRACKING
              </Link>

              <Link
                href="#lanes"
                style={{
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-sans)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  opacity: 0.9,
                  transition: 'opacity 0.2s ease, color 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-orange)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#FFFFFF')}
              >
                TRADE LANES
              </Link>

              <Link
                href="#about"
                style={{
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-sans)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  opacity: 0.9,
                  transition: 'opacity 0.2s ease, color 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-orange)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#FFFFFF')}
              >
                ABOUT
              </Link>
            </div>

            {/* ── Right: Circular 3-Bar Menu Trigger Matching Mockup ── */}
            <button
              onClick={toggleMenu}
              aria-label="Toggle navigation menu"
              style={{
                position: 'relative',
                zIndex: 210,
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: menuOpen ? 'var(--accent-orange)' : 'rgba(255, 255, 255, 0.05)',
                border: menuOpen ? 'none' : '1px solid rgba(255, 255, 255, 0.16)',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: menuOpen ? '0px' : '4px',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
              }}
              onMouseEnter={(e) => {
                if (!menuOpen) {
                  e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.5)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!menuOpen) {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: '18px',
                  height: '2px',
                  background: '#FFFFFF',
                  borderRadius: '1px',
                  transition: 'all 0.3s ease',
                  transform: menuOpen ? 'rotate(45deg) translateY(0px)' : 'none',
                }}
              />
              <span
                style={{
                  display: 'block',
                  width: '18px',
                  height: '2px',
                  background: '#FFFFFF',
                  borderRadius: '1px',
                  transition: 'all 0.3s ease',
                  opacity: menuOpen ? 0 : 1,
                  transform: menuOpen ? 'scaleX(0)' : 'none',
                }}
              />
              <span
                style={{
                  display: 'block',
                  width: '18px',
                  height: '2px',
                  background: '#FFFFFF',
                  borderRadius: '1px',
                  transition: 'all 0.3s ease',
                  transform: menuOpen ? 'rotate(-45deg) translateY(0px)' : 'none',
                  marginTop: menuOpen ? '-2px' : '0px',
                }}
              />
            </button>
          </div>
        </div>
      </header>

      {/* ── Full-Screen Navigation Overlay ── */}
      <div
        ref={overlayRef}
        className={`nav-overlay ${menuOpen ? 'open' : ''}`}
      >
        {/* ── Left: Oversized Navigation Links ── */}
        <div className="nav-overlay-links">
          {navLinks.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              ref={(el) => { linksRef.current[index] = el; }}
              className="nav-overlay-link"
              onClick={closeMenu}
              style={{
                transitionDelay: `${index * 0.03}s`,
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: '16px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    fontWeight: 400,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.05em',
                  }}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                {link.label}
              </span>
            </Link>
          ))}
        </div>

        {/* ── Right: Contact Panel ── */}
        <div className="nav-overlay-contact">
          <div style={{ marginBottom: '40px' }}>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '16px',
              }}
            >
              Get In Touch
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '0.9rem',
              }}
            >
              <a
                href="mailto:contact@navithon.com"
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
                contact@navithon.com
              </a>
              <a
                href="tel:+18005551234"
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
                +1 (800) 555-1234
              </a>
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '16px',
              }}
            >
              Follow
            </div>
            <div
              style={{
                display: 'flex',
                gap: '16px',
                fontSize: '0.85rem',
              }}
            >
              <a
                href="#"
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
                LinkedIn
              </a>
              <a
                href="#"
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
                Instagram
              </a>
            </div>
          </div>

          <div
            style={{
              marginTop: 'auto',
              paddingTop: '40px',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              letterSpacing: '0.06em',
            }}
          >
            © {new Date().getFullYear()} Navithon Logistics International
          </div>
        </div>
      </div>
    </>
  );
}
