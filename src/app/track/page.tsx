'use client';

import React from 'react';
import TrackingSearch from '@/components/TrackingSearch';

export default function TrackPage() {
  return (
    <main style={{ paddingTop: 'calc(var(--header-height) + 48px)', paddingBottom: 'clamp(56px, 8vw, 96px)' }}>
      <div className="container">
        <div style={{ maxWidth: '780px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '12px' }}>
            Track Your Consignment
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '30px' }}>
            Enter your Waybill or Consignment ID to receive real-time telemetry, location scans, and estimated delivery dates.
          </p>

          <TrackingSearch size="large" />
        </div>
      </div>
    </main>
  );
}
