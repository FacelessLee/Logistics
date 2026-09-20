import { Consignment, Checkpoint, ShipmentStatus } from './types';
import { INITIAL_CONSIGNMENTS } from '../data/initialConsignments';

// Global singleton across serverless invocations / dev reload
declare global {
  // eslint-disable-next-line no-var
  var __CONSIGNMENTS_STORE__: Consignment[] | undefined;
}

function getStore(): Consignment[] {
  if (!globalThis.__CONSIGNMENTS_STORE__) {
    // Clone initial consignments
    globalThis.__CONSIGNMENTS_STORE__ = JSON.parse(JSON.stringify(INITIAL_CONSIGNMENTS));
  }
  return globalThis.__CONSIGNMENTS_STORE__!;
}

export function getAllConsignments(): Consignment[] {
  return getStore();
}

export function getConsignmentById(id: string): Consignment | undefined {
  const store = getStore();
  const normalized = id.trim().toUpperCase();
  return store.find((c) => c.trackingId.toUpperCase() === normalized);
}

export function addConsignment(newConsignment: Consignment): Consignment {
  const store = getStore();
  const existing = store.find((c) => c.trackingId.toUpperCase() === newConsignment.trackingId.toUpperCase());
  if (existing) {
    throw new Error(`Consignment with ID ${newConsignment.trackingId} already exists`);
  }
  store.unshift(newConsignment);
  return newConsignment;
}

export function updateConsignment(
  trackingId: string,
  updates: Partial<Consignment>
): Consignment | undefined {
  const store = getStore();
  const normalized = trackingId.trim().toUpperCase();
  const index = store.findIndex((c) => c.trackingId.toUpperCase() === normalized);
  if (index === -1) return undefined;

  store[index] = {
    ...store[index],
    ...updates
  };
  return store[index];
}

export function addCheckpointToConsignment(
  trackingId: string,
  checkpointData: {
    status: ShipmentStatus;
    title: string;
    location: string;
    description: string;
    facility?: string;
  }
): Consignment | undefined {
  const store = getStore();
  const normalized = trackingId.trim().toUpperCase();
  const consignment = store.find((c) => c.trackingId.toUpperCase() === normalized);
  if (!consignment) return undefined;

  const newCheckpoint: Checkpoint = {
    id: `cp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    status: checkpointData.status,
    title: checkpointData.title,
    location: checkpointData.location,
    description: checkpointData.description,
    facility: checkpointData.facility
  };

  consignment.checkpoints.push(newCheckpoint);
  consignment.status = checkpointData.status;
  consignment.currentLocation = checkpointData.location;

  if (checkpointData.status === 'DELIVERED') {
    consignment.actualDelivery = new Date().toISOString();
  }

  return consignment;
}

export function resetToSeedData(): Consignment[] {
  globalThis.__CONSIGNMENTS_STORE__ = JSON.parse(JSON.stringify(INITIAL_CONSIGNMENTS));
  return globalThis.__CONSIGNMENTS_STORE__!;
}
