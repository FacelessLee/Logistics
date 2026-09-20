'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  Package,
  PlusCircle,
  RefreshCw,
  Edit3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  X,
  Search,
  RotateCcw,
  ExternalLink,
  MapPin,
  Building2
} from 'lucide-react';
import { Consignment, ShipmentStatus } from '@/lib/types';
import { formatDate, getStatusLabel, getStatusColor } from '@/lib/utils';

export default function AdminOperationsPage() {
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConsignment, setSelectedConsignment] = useState<Consignment | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Checkpoint Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<ShipmentStatus>('IN_TRANSIT');
  const [checkpointTitle, setCheckpointTitle] = useState('');
  const [checkpointLocation, setCheckpointLocation] = useState('');
  const [checkpointFacility, setCheckpointFacility] = useState('');
  const [checkpointDescription, setCheckpointDescription] = useState('');
  const [signedBy, setSignedBy] = useState('');
  const [isSubmittingCheckpoint, setIsSubmittingCheckpoint] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const handleResetData = async () => {
    if (!confirm('Reset all consignments back to default international demo shipments?')) return;
    try {
      setIsLoading(true);
      const res = await fetch('/api/consignments/seed', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setConsignments(json.data);
        setNotification({ type: 'success', message: 'Consignments restored to demonstration seed dataset.' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Failed to reset seed data' });
    } finally {
      setIsLoading(false);
    }
  };

  const openUpdateModal = (c: Consignment) => {
    setSelectedConsignment(c);
    setModalStatus(c.status);
    setCheckpointTitle(`Status update: ${getStatusLabel(c.status)}`);
    setCheckpointLocation(c.currentLocation);
    setCheckpointFacility('');
    setCheckpointDescription(`Telemetry event recorded at ${c.currentLocation}.`);
    setSignedBy(c.signedBy || '');
    setIsModalOpen(true);
  };

  const handleStatusChangeInModal = (newStatus: ShipmentStatus) => {
    setModalStatus(newStatus);
    switch (newStatus) {
      case 'CUSTOMS_CLEARANCE':
        setCheckpointTitle('Import Customs Clearance in Progress');
        setCheckpointDescription('Documentation verified and customs processing approved by port authorities.');
        break;
      case 'OUT_FOR_DELIVERY':
        setCheckpointTitle('Consignment Dispatched for Final Mile Delivery');
        setCheckpointDescription('Loaded onto localized dispatch delivery vehicle. Driver assigned.');
        break;
      case 'DELIVERED':
        setCheckpointTitle('Consignment Successfully Delivered & Signed');
        setCheckpointDescription('Direct delivery completed to consignee premises. Signature verified.');
        break;
      case 'IN_TRANSIT':
        setCheckpointTitle('In Transit to Next Logistics Gateway');
        setCheckpointDescription('Departed current hub. Vehicle en route to transit interchange.');
        break;
      case 'EXCEPTION_ON_HOLD':
        setCheckpointTitle('Consignment Temporarily Held for Inspection');
        setCheckpointDescription('Inspection delay logged. Customer dispatch team notified.');
        break;
      default:
        setCheckpointTitle(`Shipment event: ${getStatusLabel(newStatus)}`);
    }
  };

  const handleSaveCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsignment) return;

    setIsSubmittingCheckpoint(true);
    try {
      const payload = {
        status: modalStatus,
        signedBy: modalStatus === 'DELIVERED' ? (signedBy || 'Consignee Authorized Rep') : undefined,
        checkpoint: {
          status: modalStatus,
          title: checkpointTitle,
          location: checkpointLocation,
          facility: checkpointFacility || undefined,
          description: checkpointDescription
        }
      };

      const res = await fetch(`/api/consignments/${encodeURIComponent(selectedConsignment.trackingId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        setNotification({
          type: 'success',
          message: `Consignment ${selectedConsignment.trackingId} updated to "${getStatusLabel(modalStatus)}"`
        });
        setIsModalOpen(false);
        fetchConsignments();
      } else {
        setNotification({ type: 'error', message: json.error || 'Failed to update consignment' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Failed to update consignment' });
    } finally {
      setIsSubmittingCheckpoint(false);
    }
  };

  // Metrics
  const totalCount = consignments.length;
  const inTransitCount = consignments.filter((c) => c.status === 'IN_TRANSIT' || c.status === 'DEPARTED_FACILITY').length;
  const outForDeliveryCount = consignments.filter((c) => c.status === 'OUT_FOR_DELIVERY').length;
  const deliveredCount = consignments.filter((c) => c.status === 'DELIVERED').length;

  const filteredConsignments = consignments.filter((c) => {
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      c.trackingId.toLowerCase().includes(q) ||
      c.originLocation.toLowerCase().includes(q) ||
      c.destinationLocation.toLowerCase().includes(q) ||
      c.sender.name.toLowerCase().includes(q) ||
      c.receiver.name.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  return (
    <div style={{ paddingTop: '36px', paddingBottom: '90px' }}>
      <div className="container">
        {/* Top Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              color: 'var(--accent-cyan-light)',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: '6px'
            }}>
              <Shield size={14} />
              <span>OPERATIONS & DISPATCH CONSOLE</span>
            </div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Consignment Management Hub
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Control real-time shipment statuses, publish new tracking checkpoints, and manage logistics dispatch.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={handleResetData}
              className="btn btn-secondary btn-sm"
              title="Reset to sample demo data"
            >
              <RotateCcw size={15} />
              <span>Reset Demo Seed Data</span>
            </button>

            <Link href="/book" className="btn btn-primary btn-sm">
              <PlusCircle size={15} />
              <span>Create Consignment</span>
            </Link>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div style={{
            background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${notification.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            color: '#fff',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TOTAL SHIPMENTS</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
              {totalCount}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tracked in system</div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>IN TRANSIT</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-cyan-light)', fontFamily: 'var(--font-mono)' }}>
              {inTransitCount}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan-light)' }}>Active en-route</div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>OUT FOR DELIVERY</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>
              {outForDeliveryCount}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-amber)' }}>Final-mile courier</div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>DELIVERED</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
              {deliveredCount}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)' }}>Signed & Completed</div>
          </div>
        </div>

        {/* Filters & Search Table Container */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Package size={20} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Consignment Manifest
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search tracking ID or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ width: '240px', padding: '8px 12px', fontSize: '0.85rem' }}
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-select"
                style={{ width: '180px', padding: '8px 12px', fontSize: '0.85rem' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ORDER_CREATED">Booking Created</option>
                <option value="RECEIVED_AT_FACILITY">Received at Hub</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="CUSTOMS_CLEARANCE">Customs Clearance</option>
                <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                <option value="DELIVERED">Delivered</option>
              </select>

              <button
                onClick={fetchConsignments}
                className="btn btn-secondary btn-sm"
                title="Refresh"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.88rem',
              color: 'var(--text-secondary)'
            }}>
              <thead>
                <tr style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  textAlign: 'left',
                  color: 'var(--text-muted)',
                  fontSize: '0.78rem',
                  textTransform: 'uppercase'
                }}>
                  <th style={{ padding: '12px 14px' }}>Tracking ID</th>
                  <th style={{ padding: '12px 14px' }}>Current Status</th>
                  <th style={{ padding: '12px 14px' }}>Origin ➔ Destination</th>
                  <th style={{ padding: '12px 14px' }}>Cargo / Weight</th>
                  <th style={{ padding: '12px 14px' }}>Est. Delivery</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredConsignments.map((c) => {
                  const colors = getStatusColor(c.status);

                  return (
                    <tr
                      key={c.trackingId}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '16px 14px' }}>
                        <Link
                          href={`/track/${c.trackingId}`}
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            color: 'var(--accent-cyan-light)',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span>{c.trackingId}</span>
                          <ExternalLink size={13} />
                        </Link>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {c.carrier.name}
                        </div>
                      </td>

                      <td style={{ padding: '16px 14px' }}>
                        <span
                          className="badge"
                          style={{
                            background: colors.bg,
                            color: colors.text,
                            border: `1px solid ${colors.border}`
                          }}
                        >
                          <span className="badge-pulse" style={{ background: colors.dot }} />
                          <span>{getStatusLabel(c.status)}</span>
                        </span>
                      </td>

                      <td style={{ padding: '16px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {c.originLocation}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          ➔ {c.destinationLocation}
                        </div>
                      </td>

                      <td style={{ padding: '16px 14px' }}>
                        <div style={{ color: 'var(--text-primary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.packageDetails.description}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {c.packageDetails.weightKg} kg • {c.packageDetails.pieceCount} pcs
                        </div>
                      </td>

                      <td style={{ padding: '16px 14px', fontSize: '0.82rem' }}>
                        {formatDate(c.estimatedDelivery).split(',')[0]}
                      </td>

                      <td style={{ padding: '16px 14px', textAlign: 'right' }}>
                        <button
                          onClick={() => openUpdateModal(c)}
                          className="btn btn-outline-cyan btn-sm"
                        >
                          <Edit3 size={14} />
                          <span>Update Status</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* UPDATE STATUS & CHECKPOINT MODAL */}
      {isModalOpen && selectedConsignment && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 110,
          background: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '580px',
            padding: '32px',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-active)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px'
            }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                  Update Consignment Status
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--accent-cyan-light)', fontFamily: 'var(--font-mono)' }}>
                  {selectedConsignment.trackingId}
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCheckpoint} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="form-group">
                <label className="form-label">New Milestone Status</label>
                <select
                  className="form-select"
                  value={modalStatus}
                  onChange={(e) => handleStatusChangeInModal(e.target.value as ShipmentStatus)}
                >
                  <option value="ORDER_CREATED">Order Created / Booked</option>
                  <option value="RECEIVED_AT_FACILITY">Received at Terminal / Hub</option>
                  <option value="DEPARTED_FACILITY">Departed Terminal</option>
                  <option value="IN_TRANSIT">In Transit (Active Leg)</option>
                  <option value="CUSTOMS_CLEARANCE">Customs Clearance Processing</option>
                  <option value="OUT_FOR_DELIVERY">Out for Delivery (Final Mile)</option>
                  <option value="DELIVERED">Delivered (Completed)</option>
                  <option value="EXCEPTION_ON_HOLD">On Hold / Exception</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Checkpoint Title</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={checkpointTitle}
                  onChange={(e) => setCheckpointTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Current Scan Location (City / Airport)</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={checkpointLocation}
                  onChange={(e) => setCheckpointLocation(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Facility / Gate (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Navithon Logistics Terminal 4, Gate 12"
                  value={checkpointFacility}
                  onChange={(e) => setCheckpointFacility(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Activity Description</label>
                <textarea
                  required
                  className="form-textarea"
                  rows={3}
                  value={checkpointDescription}
                  onChange={(e) => setCheckpointDescription(e.target.value)}
                />
              </div>

              {modalStatus === 'DELIVERED' && (
                <div className="form-group">
                  <label className="form-label">Delivered Signature / Signee Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Dr. Sarah Jenkins (Badge #4801)"
                    value={signedBy}
                    onChange={(e) => setSignedBy(e.target.value)}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingCheckpoint}
                  className="btn btn-primary"
                >
                  {isSubmittingCheckpoint ? 'Saving Checkpoint...' : 'Publish Checkpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
