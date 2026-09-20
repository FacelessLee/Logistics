'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Calculator, ArrowRight, Plane, Ship, Truck, Clock, DollarSign, Sparkles } from 'lucide-react';

export default function FreightCalculator() {
  const [origin, setOrigin] = useState('Tokyo, Japan');
  const [destination, setDestination] = useState('New York, USA');
  const [weightKg, setWeightKg] = useState<number>(25);
  const [mode, setMode] = useState<'AIR' | 'OCEAN' | 'ROAD'>('AIR');

  const calculateQuote = () => {
    const baseRates = {
      AIR: { perKg: 8.5, baseFee: 65, days: '2 - 4 Days' },
      OCEAN: { perKg: 1.8, baseFee: 180, days: '18 - 28 Days' },
      ROAD: { perKg: 3.2, baseFee: 45, days: '4 - 7 Days' }
    };

    const current = baseRates[mode];
    const total = Math.round(current.baseFee + weightKg * current.perKg);
    const insurance = Math.round(total * 0.05);

    return {
      freightCost: total,
      insuranceCost: insurance,
      totalEstimate: total + insurance,
      transitTime: current.days
    };
  };

  const quote = calculateQuote();

  return (
    <div className="glass-panel" id="quote-calculator" style={{ padding: '36px 32px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(14, 165, 233, 0.15)',
            border: '1px solid rgba(14, 165, 233, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-cyan-light)'
          }}>
            <Calculator size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Instant Freight & Shipping Calculator
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Calculate instant competitive tariff rates for international cargo dispatch
            </p>
          </div>
        </div>

        <span style={{
          fontSize: '0.78rem',
          color: 'var(--accent-emerald)',
          background: 'var(--accent-emerald-glow)',
          padding: '4px 12px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid rgba(16, 185, 129, 0.3)'
        }}>
          Live Tariff Index 2026
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '28px'
      }}>
        {/* Origin */}
        <div className="form-group">
          <label className="form-label">Origin Location</label>
          <select
            className="form-select"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          >
            <option value="Tokyo, Japan">Tokyo Haneda (HND), Japan</option>
            <option value="London, UK">London Heathrow (LHR), UK</option>
            <option value="Shanghai, China">Shanghai Pudong (PVG), China</option>
            <option value="Frankfurt, Germany">Frankfurt Cargo Hub (FRA), Germany</option>
            <option value="Dubai, UAE">Dubai World Central (DWC), UAE</option>
            <option value="Singapore">Singapore Changi (SIN)</option>
          </select>
        </div>

        {/* Destination */}
        <div className="form-group">
          <label className="form-label">Destination Location</label>
          <select
            className="form-select"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          >
            <option value="New York, USA">New York JFK (JFK), USA</option>
            <option value="Rotterdam, Netherlands">Port of Rotterdam (RTM), Netherlands</option>
            <option value="Paris, France">Paris Charles de Gaulle (CDG), France</option>
            <option value="Los Angeles, USA">Los Angeles (LAX), USA</option>
            <option value="Sydney, Australia">Sydney Kingsford (SYD), Australia</option>
          </select>
        </div>

        {/* Weight */}
        <div className="form-group">
          <label className="form-label">Consignment Weight (KG)</label>
          <input
            type="number"
            min="1"
            max="10000"
            className="form-input"
            value={weightKg}
            onChange={(e) => setWeightKg(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>

        {/* Transport Mode */}
        <div className="form-group">
          <label className="form-label">Carriage Mode</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setMode('AIR')}
              style={{
                background: mode === 'AIR' ? 'var(--accent-cyan)' : 'var(--bg-surface-elevated)',
                color: mode === 'AIR' ? '#ffffff' : 'var(--text-secondary)',
                border: mode === 'AIR' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 600
              }}
            >
              <Plane size={16} />
              <span>Air</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('OCEAN')}
              style={{
                background: mode === 'OCEAN' ? 'var(--accent-cyan)' : 'var(--bg-surface-elevated)',
                color: mode === 'OCEAN' ? '#ffffff' : 'var(--text-secondary)',
                border: mode === 'OCEAN' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 600
              }}
            >
              <Ship size={16} />
              <span>Ocean</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('ROAD')}
              style={{
                background: mode === 'ROAD' ? 'var(--accent-cyan)' : 'var(--bg-surface-elevated)',
                color: mode === 'ROAD' ? '#ffffff' : 'var(--text-secondary)',
                border: mode === 'ROAD' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 600
              }}
            >
              <Truck size={16} />
              <span>Road</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quote Calculation Result Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(37, 99, 235, 0.08) 100%)',
        border: '1px solid rgba(14, 165, 233, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Estimated Total
            </div>
            <div style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'baseline',
              gap: '4px'
            }}>
              <span>${quote.totalEstimate}</span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>USD</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan-light)' }}>
              Includes cargo handling & basic insurance
            </div>
          </div>

          <div style={{ height: '40px', width: '1px', background: 'var(--border-subtle)' }} />

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Estimated Transit
            </div>
            <div style={{
              fontSize: '1.2rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Clock size={16} color="var(--accent-cyan)" />
              <span>{quote.transitTime}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>
              Door-to-door expedited customs
            </div>
          </div>
        </div>

        <Link
          href={`/book?mode=${mode}&weight=${weightKg}`}
          className="btn btn-primary"
          style={{ padding: '12px 24px' }}
        >
          <span>Book This Consignment</span>
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
