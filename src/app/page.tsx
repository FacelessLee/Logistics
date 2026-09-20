'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Plane,
  Ship,
  Truck,
  Shield,
  ArrowRight,
  Package,
  Warehouse,
  FileCheck2,
  Globe2,
  ChevronRight,
  Quote,
  Cpu,
  HardHat,
  ShoppingBag,
  Compass,
  Anchor,
  Navigation,
  Activity,
  CheckCircle2,
  Sliders,
  Layers,
  Search,
  ExternalLink,
} from 'lucide-react';
import TextReveal, { TextRevealLines } from '@/components/TextReveal';
import CountUp from '@/components/CountUp';
import Marquee from '@/components/Marquee';
import FadeIn from '@/components/FadeIn';
import ParallaxImage from '@/components/ParallaxImage';
import TrackingSearch from '@/components/TrackingSearch';
import HeroTruckScene from '@/components/HeroTruckScene';
import HeroDock from '@/components/HeroDock';
import VehicularButton from '@/components/VehicularButton';

/* ═══════════════════════════════════════════════════
   DATA STRUCTURES
   ═══════════════════════════════════════════════════ */

const services = [
  {
    icon: Plane,
    title: 'Air Freight Architecture',
    subtitle: 'EXP-CARGO // PRIORITY 24-72H',
    description:
      'Express, priority, and scheduled charters across global trade corridors. Direct tarmac ramp allocations and nose-door loading for high-value cargo.',
    image: '/images/hero-aircraft.jpg',
    tag: 'Priority Flight',
    accent: '#FF6B35',
    specs: ['B777F & An-124 Capacity', 'Main Deck Temperature Control', '100% On-Time Target'],
  },
  {
    icon: Ship,
    title: 'Ocean Carrier Networks',
    subtitle: 'FCL & LCL // GLOBAL LANES',
    description:
      'Structured carrier allocations on global container alliances. Direct berth agreements, priority terminal gate moves, and dedicated container slots.',
    image: '/images/ocean-freight.jpg',
    tag: 'FCL / LCL',
    accent: '#2563EB',
    specs: ['Direct Ocean Alliance Allotments', 'Automated Berth Tracking', 'Reefer Telemetry'],
  },
  {
    icon: Truck,
    title: 'Intermodal & Linehaul',
    subtitle: 'METRO & CROSS-BORDER',
    description:
      'Heavy-haul, metro distribution, and interstate linehaul managed for strict delivery windows with live GPS telemetry and dual-driver express rotations.',
    image: '/images/road-transport.jpg',
    tag: 'Last Mile',
    accent: '#0EA5E9',
    specs: ['Real-Time Satellite GPS', 'Heavy GCM B-Double Fleet', 'Tamper-Evident Seals'],
  },
  {
    icon: Warehouse,
    title: 'Automated 3PL & Fulfillment',
    subtitle: 'HIGH-BAY STORAGE & SORTATION',
    description:
      'Robotic AGV fulfillment hubs, climate-controlled warehousing, and real-time inventory ERP integration at strategic transport interchanges.',
    image: '/images/warehousing.jpg',
    tag: 'Robotic 3PL',
    accent: '#F59E0B',
    specs: ['Automated AGV Picking', 'Sub-Zero to Ambient Zones', 'EDI / API Sync'],
  },
  {
    icon: FileCheck2,
    title: 'Licensed Customs Brokerage',
    subtitle: 'IN-HOUSE CLASSIFICATION & PERMITS',
    description:
      'In-house licensed customs brokers handling tariff concessions, quarantine clearances, and complex documentation without third-party delay.',
    image: '/images/customs-brokerage.jpg',
    tag: 'Licensed',
    accent: '#10B981',
    specs: ['Zero Vendor Handoff Delay', 'Free Trade Agreement Audits', 'Direct Port Border Clearance'],
  },
  {
    icon: Package,
    title: 'Specialized Project Cargo',
    subtitle: 'OVERSIZED & OUT-OF-GAUGE',
    description:
      'Engineered multi-axle configurations, police route escorts, and heavy port crane operations for mining, infrastructure, and heavy industrial machinery.',
    image: '/images/project-cargo.jpg',
    tag: 'Heavy Lift',
    accent: '#6366F1',
    specs: ['Route Survey & Permit Engineering', 'Hydraulic Multi-Axle Trailers', 'On-Site Stevedore Command'],
  },
];

const hardwareFleet = [
  {
    id: 'aircraft',
    category: 'AIR FLEET',
    name: 'Boeing 777-200LRF & Antonov Charters',
    specs: {
      'Max Payload': '102,010 kg (224,900 lbs)',
      'Range At Max Load': '9,200 km (4,970 nmi)',
      'Cargo Deck Volume': '653 m³ (23,051 cu ft)',
      'Main Cargo Door': '3.72 m × 3.05 m',
      'Cruise Speed': 'Mach 0.84 (905 km/h)',
    },
    image: '/images/hero-aircraft.jpg',
    description: 'Direct widebody freighter capability with temperature-managed cargo holds for aerospace, pharmaceuticals, and critical mission-ready freight.',
  },
  {
    id: 'vessel',
    category: 'OCEAN FLEET',
    name: 'Triple-E Class Container Mega-Vessels',
    specs: {
      'Container Capacity': '20,568 TEU',
      'Overall Length': '399.2 meters',
      'Beam (Width)': '59.0 meters (24 rows)',
      'Draft (Full Load)': '16.0 meters',
      'Reefer Plugs': '1,500 active telemetry plugs',
    },
    image: '/images/ocean-freight.jpg',
    description: 'Ultra Large Container Vessels operating on dedicated trade lanes between Asia-Pacific, North America, and European transshipment ports.',
  },
  {
    id: 'truck',
    category: 'INTERMODAL LINEHAUL',
    name: 'Volvo FH16 700HP B-Double Heavy Prime Movers',
    specs: {
      'Gross Combination Mass': '70,000 kg (B-Double)',
      'Powertrain': '16.1L 700 HP Turbo-Compound',
      'Telemetry Sync': 'Live 4G/Satellite GPS & CAN-bus',
      'Thermal Control': 'Dual-Zone Thermo King (-25°C to +25°C)',
      'Safety Systems': 'Radar Emergency Brake & Lane Tracing',
    },
    image: '/images/road-transport.jpg',
    description: 'Precision long-haul tractor units delivering non-stop express overland freight with dual-operator rotations and telemetry security logging.',
  },
  {
    id: 'crane',
    category: 'TERMINAL & QUAYSIDE',
    name: 'Kalmar Gloria 45-Tonne Reach Stackers',
    specs: {
      'Lift Capacity': '45,000 kg (First Row)',
      'Stacking Height': '5-High 9\'6" Containers',
      'Spreader Type': 'Top-Lift Telescopic 20\'-40\'',
      'Engine Rating': '265 kW Clean Diesel',
      'Weighing System': 'SOLAS Certified VGM Verified',
    },
    image: '/images/project-cargo.jpg',
    description: 'High-speed container handling hardware operating at our intermodal rail heads and deepwater maritime terminal berths.',
  },
];

const airlines = [
  'Emirates SkyCargo', 'Qantas Freight', 'Cathay Cargo', 'Singapore Airlines Cargo',
  'Qatar Airways Cargo', 'Lufthansa Cargo', 'Korean Air Cargo', 'ANA Cargo',
];

const oceanCarriers = [
  'Maersk Line', 'MSC Mediterranean Shipping', 'COSCO Shipping', 'CMA CGM Group',
  'Hapag-Lloyd', 'Ocean Network Express (ONE)', 'Evergreen Marine', 'Yang Ming',
];

const testimonials = [
  {
    quote:
      'Navithon Logistics transformed our international supply chain. Their single-point accountability eliminated the vendor finger-pointing we suffered for years. Every air shipment from Tokyo to JFK arrives on schedule with spotless customs clearance.',
    author: 'Kenji Takahashi',
    role: 'Managing Director, Precision Optics Global',
    lane: 'Tokyo (HND) ➔ New York (JFK)',
  },
  {
    quote:
      'When our mining plant faced an unscheduled shutdown, Navithon mobilized an Antonov charter with heavy replacement turbines within 18 hours. Their direct stevedoring and customs team saved us millions in downtime.',
    author: 'Marcus Vance',
    role: 'VP Operations, Pacific Continental Mining',
    lane: 'Perth ➔ Singapore ➔ Rotterdam',
  },
  {
    quote:
      'Navithon gives us the high-speed agility of a tech startup paired with the hardware muscle of a legacy maritime freight carrier. Their tracking portal and instant rate predictability have been invaluable for our seasonal fashion rollouts.',
    author: 'Alexandra Hughes',
    role: 'Head of Global Sourcing, Mode Haute Brands',
    lane: 'Shanghai ➔ London ➔ Paris',
  },
];

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [selectedHardware, setSelectedHardware] = useState(0);

  // Rate calculator quick state
  const [calcOrigin, setCalcOrigin] = useState('Shanghai Port (SHA)');
  const [calcDest, setCalcDest] = useState('Port of Rotterdam (RTM)');
  const [calcMode, setCalcMode] = useState('OCEAN_CARGO');
  const [calcContainer, setCalcContainer] = useState('40_HC');

  return (
    <main style={{ background: '#0A0A0A', color: '#FFFFFF', overflowX: 'hidden' }}>
      {/* ════════════════════════════════════════════
          SECTION 1: HERO — CINEMATIC EDITORIAL SHOWCASE
          ════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          paddingTop: 'calc(var(--header-height) + 36px)',
          paddingBottom: '40px',
        }}
      >
        {/* ── 1. Full-Bleed Animated Cinematic Truck & Highway Scene ── */}
        <HeroTruckScene />

        {/* ── 2. Hero Editorial & Typography Content ── */}
        <div
          className="container"
          style={{
            position: 'relative',
            zIndex: 10,
            width: '100%',
            paddingTop: '32px',
          }}
        >
          <div style={{ maxWidth: '780px' }}>
            {/* Eyebrow Label with Orange Dash matching mockup */}
            <FadeIn delay={0.1}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '28px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: 'var(--accent-orange)',
                    textTransform: 'uppercase',
                  }}
                >
                  GLOBAL FREIGHT ARCHITECTURE
                </span>
                <span
                  style={{
                    display: 'inline-block',
                    width: '32px',
                    height: '2px',
                    background: 'var(--accent-orange)',
                    borderRadius: '1px',
                  }}
                />
              </div>
            </FadeIn>

            {/* Monumental Dual-Tone Headline matching mockup */}
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 'clamp(2.9rem, 5.5vw, 5.2rem)',
                lineHeight: 1.0,
                letterSpacing: '-0.035em',
                textTransform: 'uppercase',
                marginBottom: '26px',
              }}
            >
              <span
                style={{
                  display: 'block',
                  color: '#FFFFFF',
                  textShadow: '0 4px 24px rgba(0,0,0,0.8)',
                }}
              >
                GLOBAL FREIGHT.
              </span>
              <span
                style={{
                  display: 'block',
                  color: '#FF6B35',
                  textShadow: '0 4px 28px rgba(255, 107, 53, 0.4)',
                }}
              >
                DIRECTLY OPERATED.
              </span>
            </h1>

            {/* Editorial Subtitle Paragraph */}
            <FadeIn delay={0.3}>
              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'clamp(0.96rem, 1.35vw, 1.12rem)',
                  lineHeight: 1.62,
                  color: 'rgba(255, 255, 255, 0.86)',
                  maxWidth: '560px',
                  marginBottom: '38px',
                  fontWeight: 400,
                  textShadow: '0 2px 10px rgba(0,0,0,0.7)',
                }}
              >
                We own the outcome. Air charters, maritime container movements, and certified in-house customs brokerage unified across international trade lanes under one single accountable team.
              </p>
            </FadeIn>

            {/* Primary & Secondary Action Buttons with Vehicular Zoom-Off Effect */}
            <FadeIn delay={0.45}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  flexWrap: 'wrap',
                  marginBottom: '40px',
                }}
              >
                <VehicularButton
                  variant="primary"
                  text="TALK TO DISPATCH"
                  href="#contact"
                  loadingText="DISPATCH ENGAGED..."
                />

                <VehicularButton
                  variant="secondary"
                  text="CALCULATE A RATE"
                  href="/book"
                  loadingText="CALCULATING FREIGHT..."
                />
              </div>
            </FadeIn>
          </div>
        </div>

        {/* ── 3. Bottom Floating Live Tracking & Services Dock ── */}
        <FadeIn delay={0.6}>
          <HeroDock />
        </FadeIn>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 2: REAL-TIME KEY PERFORMANCE METRICS
          ════════════════════════════════════════════ */}
      <section
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: '#0D0D0D',
          padding: '48px 0',
        }}
      >
        <div className="container">
          <div className="grid-hero-metrics">
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'clamp(2.4rem, 4vw, 3.6rem)',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                }}
              >
                <CountUp end={2500} suffix="+" />
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginTop: '10px',
                }}
              >
                Global Movements / Month
              </div>
            </div>

            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'clamp(2.4rem, 4vw, 3.6rem)',
                  fontWeight: 800,
                  color: 'var(--accent-orange)',
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                }}
              >
                <CountUp end={98.2} suffix="%" decimals={1} />
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginTop: '10px',
                }}
              >
                Delivery & Schedule Integrity
              </div>
            </div>

            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'clamp(2.4rem, 4vw, 3.6rem)',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                }}
              >
                <CountUp end={45} suffix="+" />
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginTop: '10px',
                }}
              >
                Direct Airline & Maritime Gateways
              </div>
            </div>

            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'clamp(2.4rem, 4vw, 3.6rem)',
                  fontWeight: 800,
                  color: 'var(--accent-emerald)',
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                }}
              >
                &lt; 15m
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginTop: '10px',
                }}
              >
                Direct Ops Response Time
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 3: ARCHITECTURE & PHILOSOPHY
          (United Carriers Asymmetric Swiss Grid)
          ════════════════════════════════════════════ */}
      <section
        id="about"
        style={{
          padding: '120px 0',
          position: 'relative',
          background: '#080808',
        }}
      >
        <div className="container">
          <div className="grid-split-2col">
            {/* Left Column: Narrative & Technical Tenets */}
            <div>
              <FadeIn>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--accent-orange)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    marginBottom: '16px',
                  }}
                >
                  PROVEN OPERATIONAL MODEL
                </div>
              </FadeIn>

              <h2
                className="display-lg"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2.2rem, 4.5vw, 4rem)',
                  fontWeight: 800,
                  lineHeight: 0.98,
                  letterSpacing: '-0.025em',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  marginBottom: '28px',
                }}
              >
                BUILT FOR BUSINESSES<br />
                THAT CANNOT AFFORD<br />
                <span style={{ color: 'var(--accent-orange)' }}>DISRUPTION.</span>
              </h2>

              <FadeIn delay={0.2}>
                <p
                  style={{
                    fontSize: '1.05rem',
                    lineHeight: 1.7,
                    color: 'var(--text-secondary)',
                    marginBottom: '40px',
                  }}
                >
                  Conventional freight forwarders act as passive brokers &mdash; slicing a shipment across four sub-contractors, diluting accountability, and disappearing when a delay occurs. At Navithon, every leg is engineered, executed, and owned by our direct operators.
                </p>
              </FadeIn>

              {/* Pillars with Monospace Indexing */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  {
                    code: '01 • ACCOUNTABILITY',
                    title: 'Single Master Bill of Lading',
                    desc: 'One point of contact from factory floor to consignee dock. No vendor finger-pointing, no handoff blindspots.',
                  },
                  {
                    code: '02 • COMPLIANCE',
                    title: 'In-House Certified Customs Brokerage',
                    desc: 'Direct licensed customs agents preparing tariff classifications, quarantine releases, and duty deferments without third-party middle-agents.',
                  },
                  {
                    code: '03 • TELEMETRY',
                    title: 'Event-Driven Milestone Tracking',
                    desc: 'Real-time telemetry and geo-fenced milestone triggers across all ocean berths, air terminals, and linehaul waypoints.',
                  },
                ].map((pillar, idx) => (
                  <FadeIn key={idx} delay={0.3 + idx * 0.1}>
                    <div
                      style={{
                        padding: '20px 24px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderLeft: '2px solid var(--accent-orange)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '0 8px 8px 0',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.68rem',
                          color: 'var(--accent-orange)',
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          marginBottom: '6px',
                        }}
                      >
                        {pillar.code}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: '1.08rem',
                          fontWeight: 700,
                          color: '#FFFFFF',
                          marginBottom: '6px',
                        }}
                      >
                        {pillar.title}
                      </div>
                      <div
                        style={{
                          fontSize: '0.9rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.6,
                        }}
                      >
                        {pillar.desc}
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>

            {/* Right Column: High-Impact Photography Frame */}
            <div style={{ position: 'relative' }}>
              <ParallaxImage speed={0.15}>
                <div
                  className="photo-card"
                  style={{
                    position: 'relative',
                    aspectRatio: '4/5',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src="/images/ocean-freight.jpg"
                    alt="Navithon Maritime Vessel operations"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />

                  {/* Gradient scrim */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(180deg, transparent 40%, rgba(8, 8, 8, 0.95) 100%)',
                    }}
                  />

                  {/* Live Vessel Telemetry Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '20px',
                      left: '20px',
                      right: '20px',
                      background: 'rgba(10, 10, 10, 0.88)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '16px 20px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.7rem',
                        color: 'var(--accent-orange)',
                        marginBottom: '8px',
                      }}
                    >
                      <span>MARITIME FLEET TELEMETRY</span>
                      <span className="badge-pulse" style={{ background: 'var(--accent-emerald)' }} />
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: '#FFFFFF',
                        marginBottom: '4px',
                      }}
                    >
                      MV PACIFIC TITAN &bull; 20,568 TEU
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      SPEED 19.4 KTS &bull; SUEZ CORRIDOR ➔ ROTTERDAM
                    </div>
                  </div>
                </div>
              </ParallaxImage>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 4: CAPABILITIES & SERVICES MATRIX
          (Photographic Bento Grid)
          ════════════════════════════════════════════ */}
      <section
        id="services"
        style={{
          padding: '120px 0',
          background: '#0F0F0F',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div className="container">
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: '24px',
              marginBottom: '56px',
            }}
          >
            <div>
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
                CORE CAPABILITIES
              </div>
              <h2
                className="display-md"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 'clamp(2.0rem, 4vw, 3.5rem)',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  lineHeight: 1.05,
                }}
              >
                FULL-SPECTRUM<br />FREIGHT SERVICES.
              </h2>
            </div>

            <Link
              href="/book"
              className="btn btn-secondary btn-sm"
              style={{ textDecoration: 'none' }}
            >
              <span>CUSTOM SERVICE QUOTE</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Graphical Cards Grid */}
          <div className="grid-cards-3col">
            {services.map((service, idx) => (
              <FadeIn key={idx} delay={idx * 0.07}>
                <div
                  className="photo-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    minHeight: '420px',
                    position: 'relative',
                  }}
                >
                  {/* Photo Banner with Zoom */}
                  <div
                    style={{
                      height: '210px',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={service.image}
                      alt={service.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background:
                          'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(17,17,17,0.95) 100%)',
                      }}
                    />

                    {/* Tag badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '16px',
                        left: '16px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '5px 12px',
                        background: 'rgba(10, 10, 10, 0.85)',
                        backdropFilter: 'blur(8px)',
                        borderRadius: '9999px',
                        color: '#FFFFFF',
                        textTransform: 'uppercase',
                      }}
                    >
                      {service.tag}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div
                    style={{
                      padding: '24px',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.68rem',
                        color: service.accent,
                        letterSpacing: '0.1em',
                        marginBottom: '6px',
                      }}
                    >
                      {service.subtitle}
                    </div>

                    <h3
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.3rem',
                        fontWeight: 800,
                        color: '#FFFFFF',
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                        lineHeight: 1.2,
                      }}
                    >
                      {service.title}
                    </h3>

                    <p
                      style={{
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.6,
                        marginBottom: '20px',
                        flex: 1,
                      }}
                    >
                      {service.description}
                    </p>

                    {/* Specifications List */}
                    <div
                      style={{
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        paddingTop: '16px',
                        marginTop: 'auto',
                      }}
                    >
                      {service.specs.map((spec, sIdx) => (
                        <div
                          key={sIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                            marginBottom: '4px',
                          }}
                        >
                          <span style={{ color: service.accent }}>&bull;</span>
                          <span>{spec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 5: HARDWARE & FLEET BLUEPRINT
          (Modeled on United Carriers Hardware Showcase)
          ════════════════════════════════════════════ */}
      <section
        id="hardware"
        style={{
          padding: '120px 0',
          background: '#080808',
          position: 'relative',
        }}
      >
        <div className="container">
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
            FLEET ASSETS & HARDWARE
          </div>

          <h2
            className="display-md"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 'clamp(2.0rem, 4vw, 3.5rem)',
              textTransform: 'uppercase',
              color: '#FFFFFF',
              marginBottom: '40px',
            }}
          >
            HEAVY-LIFT FLEET SPECIFICATIONS.
          </h2>

          {/* Hardware Selector Pills */}
          <div className="tab-scroll-mobile" style={{ marginBottom: '36px' }}>
            {hardwareFleet.map((hw, idx) => (
              <button
                key={hw.id}
                onClick={() => setSelectedHardware(idx)}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.76rem',
                  padding: '11px 22px',
                  borderRadius: '9999px',
                  background: selectedHardware === idx ? 'var(--accent-orange)' : '#181818',
                  color: selectedHardware === idx ? '#0A0A0A' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  transition: 'all 0.25s ease',
                  minHeight: '44px',
                }}
              >
                {hw.category}
              </button>
            ))}
          </div>

          {/* Active Hardware Blueprint Display */}
          {hardwareFleet[selectedHardware] && (
            <div
              className="grid-split-2col"
              style={{
                background: '#121212',
                borderRadius: '16px',
                padding: 'clamp(20px, 4vw, 40px)',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              {/* Hardware Photo */}
              <div
                style={{
                  position: 'relative',
                  aspectRatio: '16/10',
                  overflow: 'hidden',
                  borderRadius: '10px',
                }}
              >
                <img
                  src={hardwareFleet[selectedHardware].image}
                  alt={hardwareFleet[selectedHardware].name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>

              {/* Hardware Specs Table */}
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    color: 'var(--accent-orange)',
                    letterSpacing: '0.14em',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                  }}
                >
                  EQUIPMENT DATA SHEET &bull; {hardwareFleet[selectedHardware].category}
                </div>

                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.3rem, 2.5vw, 1.6rem)',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    marginBottom: '16px',
                    textTransform: 'uppercase',
                  }}
                >
                  {hardwareFleet[selectedHardware].name}
                </h3>

                <p
                  style={{
                    fontSize: '0.92rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    marginBottom: '24px',
                  }}
                >
                  {hardwareFleet[selectedHardware].description}
                </p>

                {/* Specs list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(hardwareFleet[selectedHardware].specs).map(([key, value]) => (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                        fontSize: '0.82rem',
                        flexWrap: 'wrap',
                        gap: '4px',
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{key}:</span>
                      <span style={{ color: '#FFFFFF', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 6: GLOBAL OPERATIONS CONTROL TOWER
          ════════════════════════════════════════════ */}
      <section
        style={{
          padding: '120px 0',
          position: 'relative',
          overflow: 'hidden',
          background: '#0B0D10',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div className="container">
          <div className="grid-split-equal">
            {/* Telemetry Info */}
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--accent-orange)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginBottom: '14px',
                }}
              >
                24/7 GLOBAL DISPATCH COMMAND
              </div>

              <h2
                className="display-md"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 'clamp(2.0rem, 4vw, 3.5rem)',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  marginBottom: '24px',
                  lineHeight: 1.05,
                }}
              >
                EVERY CONSIGNMENT<br />
                UNDER ACTIVE TELEMETRY.
              </h2>

              <p
                style={{
                  fontSize: '1.05rem',
                  lineHeight: 1.7,
                  color: 'var(--text-secondary)',
                  marginBottom: '36px',
                }}
              >
                Our 24/7 Global Dispatch Tower coordinates non-stop cargo operations across Pacific, Trans-Atlantic, and Eurasian trade lanes &mdash; directly interfacing with airport ramps, container ports, and customs clearance facilities.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '16px',
                  marginBottom: '36px',
                }}
              >
                <div
                  style={{
                    padding: '18px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '10px',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-orange)' }}>
                    14 Active
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '4px' }}>
                    Charter Airway Routes
                  </div>
                </div>

                <div
                  style={{
                    padding: '18px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '10px',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    99.4%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '4px' }}>
                    Milestone Accuracy Rate
                  </div>
                </div>
              </div>

              <Link
                href="/admin"
                className="btn btn-secondary"
                style={{ textDecoration: 'none' }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--accent-orange)' }}>
                  [CONSOLE]
                </span>
                <span>ENTER DISPATCH CONTROL HUB</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* High-Resolution Photo of Control Room */}
            <div style={{ position: 'relative' }}>
              <div
                className="photo-card"
                style={{
                  aspectRatio: '16/10',
                  overflow: 'hidden',
                  borderRadius: '12px',
                }}
              >
                <img
                  src="/images/control-tower.jpg"
                  alt="Navithon Global Operations Control Center"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 7: TRUSTED CARRIER MARQUEE
          ════════════════════════════════════════════ */}
      <section
        style={{
          padding: '60px 0',
          background: '#080808',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            marginBottom: '16px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          DIRECT AIRLINE & OCEAN ALLIANCE CONTRACTS
        </div>

        <div style={{ marginBottom: '16px' }}>
          <Marquee items={airlines} speed={22} />
        </div>
        <Marquee items={oceanCarriers} speed={26} direction="right" />
      </section>

      {/* ════════════════════════════════════════════
          SECTION 8: EXECUTIVE CLIENT TESTIMONIALS
          ════════════════════════════════════════════ */}
      <section
        style={{
          padding: '120px 0',
          background: '#0D0D0D',
        }}
      >
        <div className="container">
          <div style={{ marginBottom: '56px' }}>
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
              CLIENT VALIDATION
            </div>

            <h2
              className="display-md"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 'clamp(2.0rem, 4vw, 3.5rem)',
                textTransform: 'uppercase',
                color: '#FFFFFF',
              }}
            >
              WHAT INDUSTRY LEADERS SAY.
            </h2>
          </div>

          <div className="grid-cards-3col">
            {testimonials.map((t, idx) => (
              <FadeIn key={idx} delay={idx * 0.1}>
                <div
                  style={{
                    background: '#121212',
                    borderRadius: '12px',
                    padding: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    position: 'relative',
                  }}
                >
                  <Quote
                    size={28}
                    style={{
                      color: 'var(--accent-orange)',
                      marginBottom: '20px',
                      opacity: 0.8,
                    }}
                  />

                  <p
                    style={{
                      fontSize: '0.96rem',
                      lineHeight: 1.7,
                      color: 'rgba(255, 255, 255, 0.88)',
                      marginBottom: '28px',
                      flex: 1,
                    }}
                  >
                    &ldquo;{t.quote}&rdquo;
                  </p>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF' }}>{t.author}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{t.role}</div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.68rem',
                        color: 'var(--accent-orange)',
                        marginTop: '6px',
                        letterSpacing: '0.04em',
                      }}
                    >
                      [ {t.lane} ]
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 9: DIRECT DISPATCH CTA BANNER
          ════════════════════════════════════════════ */}
      <section
        id="contact"
        style={{
          padding: '140px 0',
          position: 'relative',
          background: '#080808',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          textAlign: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Subtle orange ambient glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '400px',
            background: 'radial-gradient(ellipse, rgba(255, 107, 53, 0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--accent-orange)',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}
          >
            DISPATCH & BOOKING
          </div>

          <h2
            className="display-lg"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.4rem, 6vw, 5.0rem)',
              fontWeight: 900,
              textTransform: 'uppercase',
              color: '#FFFFFF',
              lineHeight: 0.95,
              marginBottom: '24px',
            }}
          >
            GET YOUR FREIGHT<br />
            <span style={{ color: 'var(--accent-orange)' }}>MOVING TODAY.</span>
          </h2>

          <p
            style={{
              fontSize: '1.1rem',
              color: 'var(--text-secondary)',
              maxWidth: '560px',
              margin: '0 auto 44px',
              lineHeight: 1.6,
            }}
          >
            No call centres. No runaround. Experienced logistics operators ready to review your shipment specifications immediately.
          </p>

          <div
            className="btn-group-responsive"
            style={{
              justifyContent: 'center',
              marginBottom: '44px',
            }}
          >
            <a
              href="mailto:contact@navithon.com"
              className="btn btn-primary btn-lg"
              style={{ textDecoration: 'none' }}
            >
              <span className="btn-flip-text">
                <span>TALK WITH DIRECT DISPATCH</span>
                <span style={{ color: '#0A0A0A', fontWeight: 800 }}>EMAIL DIRECT AGENT</span>
              </span>
              <span className="btn-arr-wrap">
                <ArrowRight size={18} className="btn-arr-1" />
                <ArrowRight size={18} className="btn-arr-2" />
              </span>
            </a>

            <Link
              href="/book"
              className="btn btn-secondary btn-lg"
              style={{ textDecoration: 'none' }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-orange)' }}>
                [02]
              </span>
              <span>START BOOKING SHIPMENT</span>
            </Link>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '28px',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              flexWrap: 'wrap',
            }}
          >
            <a
              href="mailto:contact@navithon.com"
              style={{ color: '#FFFFFF', textDecoration: 'none' }}
            >
              contact@navithon.com
            </a>
            <a
              href="tel:+18005551234"
              style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
            >
              +1 (800) 555-1234
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
