'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';

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

  const isLarge = size === 'large';

  return (
    <div style={{ width: '100%' }}>
      <form
        onSubmit={handleTrackSubmit}
        className="tracking-search-form"
        style={{
          display: 'flex',
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
          placeholder="Enter Consignment or Waybill ID (e.g. TRK-...)"
          autoFocus={autoFocus}
          style={{
            flex: 1,
            minWidth: 0,
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

    </div>
  );
}
