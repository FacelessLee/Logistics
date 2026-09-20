'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, Sparkles, Box, ShieldCheck } from 'lucide-react';

interface TrackingSearchProps {
  initialValue?: string;
  autoFocus?: boolean;
  size?: 'normal' | 'large';
  onSearch?: (trackingId: string) => void;
}

export default function TrackingSearch({
  initialValue = '',
  autoFocus = false,
  size = 'large',
  onSearch
}: TrackingSearchProps) {
  const router = useRouter();
  const [trackingInput, setTrackingInput] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const sampleIds = [
    { id: 'TRK-2026-89420', label: 'Air Medical (In Transit)', tag: 'Tokyo ➔ NYC' },
    { id: 'EXP-7729-LON-NYC', label: 'Express Courier (Out for Delivery)', tag: 'London ➔ NYC' },
    { id: 'SEA-4011-SHA-ROT', label: 'Ocean Container (Customs)', tag: 'Shanghai ➔ Rotterdam' },
    { id: 'NVT-9104-BER-PAR', label: 'Cold Chain (Delivered)', tag: 'Berlin ➔ Paris' },
  ];

  const handleTrackSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = trackingInput.trim().toUpperCase();

    if (!cleanId) {
      setErrorMessage('Please enter a valid tracking number or consignment ID.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    if (onSearch) {
      onSearch(cleanId);
      setIsLoading(false);
    } else {
      router.push(`/track/${encodeURIComponent(cleanId)}`);
    }
  };

  const handleQuickSampleClick = (id: string) => {
    setTrackingInput(id);
    setErrorMessage('');
    setIsLoading(true);
    if (onSearch) {
      onSearch(id);
      setIsLoading(false);
    } else {
      router.push(`/track/${encodeURIComponent(id)}`);
    }
  };

  const isLarge = size === 'large';

  return (
    <div style={{ width: '100%' }}>
      <form
        onSubmit={handleTrackSubmit}
        className="tracking-search-form"
        style={{
          background: isLarge ? '#121212' : '#161616',
          padding: isLarge ? '8px 8px 8px 18px' : '6px 6px 6px 14px',
          borderRadius: '9999px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          alignItems: 'center',
          transition: 'all var(--transition-normal)',
          position: 'relative'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          color: 'var(--accent-orange)',
          paddingRight: '6px'
        }}>
          <Search size={isLarge ? 20 : 16} />
        </div>

        <input
          type="text"
          value={trackingInput}
          onChange={(e) => {
            setTrackingInput(e.target.value.toUpperCase());
            if (errorMessage) setErrorMessage('');
          }}
          placeholder="Enter Consignment ID (e.g. TRK-2026-89420)"
          autoFocus={autoFocus}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: isLarge ? '1.0rem' : '0.9rem',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
            padding: '8px 0',
            width: '100%'
          }}
        />

        <button
          type="submit"
          disabled={isLoading}
          className={`btn btn-primary ${isLarge ? 'btn-lg' : 'btn-sm'}`}
          style={{
            minWidth: isLarge ? '170px' : '100px',
            fontSize: isLarge ? '0.86rem' : '0.78rem',
            padding: isLarge ? '12px 24px' : '8px 16px',
            borderRadius: '9999px',
          }}
        >
          {isLoading ? (
            <span>Locating...</span>
          ) : (
            <>
              <span>Track Consignment</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {errorMessage && (
        <div style={{
          marginTop: '10px',
          color: 'var(--accent-rose)',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span>•</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Quick Test Samples */}
      {isLarge && (
        <div style={{ marginTop: '20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            marginBottom: '10px'
          }}>
            <Sparkles size={14} color="var(--accent-cyan)" />
            <span>Quick test with live simulated international consignments:</span>
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
          }}>
            {sampleIds.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleQuickSampleClick(item.id)}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 'var(--radius-full)',
                  padding: '6px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(14, 165, 233, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(14, 165, 233, 0.4)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-cyan-light)' }}>
                  {item.id}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>|</span>
                <span>{item.tag}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
