'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Package, MapPin, Clock, ArrowRight, Filter, RefreshCw, CheckCircle2, Truck, Plane } from 'lucide-react';
import TrackingSearch from '@/components/TrackingSearch';
import { Consignment, ShipmentStatus } from '@/lib/types';
import { formatDate, getStatusLabel, getStatusColor } from '@/lib/utils';

export default function TrackPage() {
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchConsignments = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/consignments');
      const json = await res.json();
      if (json.success) {
        setConsignments(json.data);
      }
    } catch (err) {
      console.error('Failed to load consignments', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConsignments();
  }, []);

  const filteredList = consignments.filter((item) => {
    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      item.trackingId.toLowerCase().includes(q) ||
      item.sender.name.toLowerCase().includes(q) ||
      item.receiver.name.toLowerCase().includes(q) ||
      item.originLocation.toLowerCase().includes(q) ||
      item.destinationLocation.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div style={{ paddingTop: '40px', paddingBottom: '80px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ maxWidth: '780px', margin: '0 auto 40px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '12px' }}>
            Consignment Tracking Center
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '30px' }}>
            Enter your Waybill or Consignment ID to receive real-time telemetry, location scans, and estimated delivery dates.
          </p>

          <TrackingSearch size="large" />
        </div>

        {/* Directory of Active Consignments */}
        <div style={{ marginTop: '50px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Active Consignments Directory
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Browse or locate any registered international shipment
              </p>
            </div>

            {/* Filter Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Filter by city, party, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ width: '220px', padding: '8px 14px', fontSize: '0.85rem' }}
              />

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="form-select"
                style={{ width: '180px', padding: '8px 14px', fontSize: '0.85rem' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                <option value="CUSTOMS_CLEARANCE">Customs Clearance</option>
                <option value="RECEIVED_AT_FACILITY">Received at Hub</option>
                <option value="DELIVERED">Delivered</option>
              </select>

              <button
                onClick={fetchConsignments}
                className="btn btn-secondary btn-sm"
                title="Refresh consignments"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Consignments List Cards */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              Loading consignment records...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '50px 20px' }}>
              <Package size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                No Consignments Found
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                No active shipments matched your search criteria.
              </p>
              <Link href="/book" className="btn btn-primary btn-sm">
                Create New Consignment
              </Link>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '20px'
            }}>
              {filteredList.map((item) => {
                const colors = getStatusColor(item.status);

                return (
                  <div
                    key={item.trackingId}
                    className="glass-panel glass-panel-hover"
                    style={{
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      {/* Top Bar: ID and Status Badge */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '16px'
                      }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '1.05rem',
                          fontWeight: 700,
                          color: 'var(--accent-cyan-light)',
                          letterSpacing: '0.04em'
                        }}>
                          {item.trackingId}
                        </span>

                        <span
                          className="badge"
                          style={{
                            background: colors.bg,
                            color: colors.text,
                            border: `1px solid ${colors.border}`
                          }}
                        >
                          <span className="badge-pulse" style={{ background: colors.dot }} />
                          <span>{getStatusLabel(item.status)}</span>
                        </span>
                      </div>

                      {/* Origin & Destination */}
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px 14px',
                        marginBottom: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', marginBottom: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)' }} />
                          <span style={{ color: 'var(--text-muted)' }}>From:</span>
                          <strong style={{ color: 'var(--text-primary)' }}>{item.originLocation}</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)' }} />
                          <span style={{ color: 'var(--text-muted)' }}>To:</span>
                          <strong style={{ color: 'var(--text-primary)' }}>{item.destinationLocation}</strong>
                        </div>
                      </div>

                      {/* Package Description */}
                      <p style={{
                        fontSize: '0.88rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '16px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {item.packageDetails.description}
                      </p>
                    </div>

                    {/* Footer Info & Track Button */}
                    <div style={{
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Est. {formatDate(item.estimatedDelivery).split(',')[0]}
                      </div>

                      <Link
                        href={`/track/${item.trackingId}`}
                        className="btn btn-outline-cyan btn-sm"
                      >
                        <span>Live Tracking</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
