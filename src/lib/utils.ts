import { ShipmentStatus } from './types';

export function generateTrackingId(prefix = 'TRK'): string {
  const year = new Date().getFullYear();
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomPart = '';
  for (let i = 0; i < 5; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${year}-${randomPart}`;
}

export function formatDate(isoString?: string): string {
  if (!isoString) return 'Pending Confirmation';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatShortDate(isoString?: string): string {
  if (!isoString) return 'TBD';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatCurrency(amount?: number, currency = 'USD'): string {
  if (amount === undefined || amount === null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0
  }).format(amount);
}

export function getStatusLabel(status: ShipmentStatus): string {
  switch (status) {
    case 'ORDER_CREATED':
      return 'Booking Created';
    case 'RECEIVED_AT_FACILITY':
      return 'Received at Origin Terminal';
    case 'DEPARTED_FACILITY':
      return 'Departed Origin Terminal';
    case 'IN_TRANSIT':
      return 'In Transit';
    case 'CUSTOMS_CLEARANCE':
      return 'Customs Processing';
    case 'OUT_FOR_DELIVERY':
      return 'Out for Delivery';
    case 'DELIVERED':
      return 'Delivered';
    case 'EXCEPTION_ON_HOLD':
      return 'On Hold / Exception';
    default:
      return status;
  }
}

export function getStatusStepIndex(status: ShipmentStatus): number {
  switch (status) {
    case 'ORDER_CREATED':
      return 0;
    case 'RECEIVED_AT_FACILITY':
      return 1;
    case 'DEPARTED_FACILITY':
      return 2;
    case 'IN_TRANSIT':
      return 3;
    case 'CUSTOMS_CLEARANCE':
      return 4;
    case 'OUT_FOR_DELIVERY':
      return 5;
    case 'DELIVERED':
      return 6;
    case 'EXCEPTION_ON_HOLD':
      return 3; // Paused mid-transit
    default:
      return 0;
  }
}

export const MILESTONE_STEPS = [
  { id: 'created', label: 'Booked', status: 'ORDER_CREATED' },
  { id: 'origin', label: 'Received at Hub', status: 'RECEIVED_AT_FACILITY' },
  { id: 'departed', label: 'Departed', status: 'DEPARTED_FACILITY' },
  { id: 'transit', label: 'In Transit', status: 'IN_TRANSIT' },
  { id: 'customs', label: 'Customs', status: 'CUSTOMS_CLEARANCE' },
  { id: 'out_delivery', label: 'Out for Delivery', status: 'OUT_FOR_DELIVERY' },
  { id: 'delivered', label: 'Delivered', status: 'DELIVERED' }
] as const;

export function getStatusColor(status: ShipmentStatus): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (status) {
    case 'DELIVERED':
      return {
        bg: 'rgba(16, 185, 129, 0.12)',
        text: '#10b981',
        border: 'rgba(16, 185, 129, 0.3)',
        dot: '#10b981'
      };
    case 'OUT_FOR_DELIVERY':
      return {
        bg: 'rgba(14, 165, 233, 0.15)',
        text: '#0284c7',
        border: 'rgba(14, 165, 233, 0.35)',
        dot: '#0284c7'
      };
    case 'IN_TRANSIT':
    case 'DEPARTED_FACILITY':
      return {
        bg: 'rgba(59, 130, 246, 0.12)',
        text: '#3b82f6',
        border: 'rgba(59, 130, 246, 0.3)',
        dot: '#3b82f6'
      };
    case 'CUSTOMS_CLEARANCE':
      return {
        bg: 'rgba(245, 158, 11, 0.15)',
        text: '#d97706',
        border: 'rgba(245, 158, 11, 0.35)',
        dot: '#f59e0b'
      };
    case 'EXCEPTION_ON_HOLD':
      return {
        bg: 'rgba(239, 68, 68, 0.15)',
        text: '#ef4444',
        border: 'rgba(239, 68, 68, 0.35)',
        dot: '#ef4444'
      };
    default:
      return {
        bg: 'rgba(100, 116, 139, 0.15)',
        text: '#64748b',
        border: 'rgba(100, 116, 139, 0.3)',
        dot: '#94a3b8'
      };
  }
}
