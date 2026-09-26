import fs from 'fs';
import path from 'path';
import { Consignment, Checkpoint, ShipmentStatus } from './types';
import { INITIAL_CONSIGNMENTS } from '../data/initialConsignments';
import { supabase, isSupabaseConfigured } from './supabase';

const DATA_DIR = path.join(process.cwd(), '.data');
const CONSIGNMENTS_FILE = path.join(DATA_DIR, 'consignments.json');

// Global singleton across serverless invocations / dev reload
declare global {
  // eslint-disable-next-line no-var
  var __CONSIGNMENTS_STORE__: Consignment[] | undefined;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readConsignmentsFromDisk(): Consignment[] {
  ensureDataDir();
  if (!fs.existsSync(CONSIGNMENTS_FILE)) {
    const initial = Array.isArray(INITIAL_CONSIGNMENTS) ? INITIAL_CONSIGNMENTS : [];
    writeConsignmentsToDisk(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(CONSIGNMENTS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('[Storage] Error reading consignments.json from disk:', err);
    return [];
  }
}

function writeConsignmentsToDisk(consignments: Consignment[]): void {
  ensureDataDir();
  const tempPath = `${CONSIGNMENTS_FILE}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(consignments, null, 2), 'utf-8');
    fs.renameSync(tempPath, CONSIGNMENTS_FILE);
  } catch (err) {
    console.error('[Storage] Error writing consignments.json to disk:', err);
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {}
  }
}

export async function syncConsignmentToSupabase(consignment: Consignment): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('consignments').upsert(
      {
        tracking_id: consignment.trackingId.toUpperCase(),
        status: consignment.status,
        origin_location: consignment.originLocation,
        destination_location: consignment.destinationLocation,
        current_location: consignment.currentLocation,
        created_at: consignment.createdAt,
        updated_at: new Date().toISOString(),
        data: consignment,
      },
      { onConflict: 'tracking_id' }
    );
    if (error) {
      console.warn('[Storage] Supabase consignment sync warning:', error.message);
    }
  } catch (err) {
    console.warn('[Storage] Supabase consignment sync exception:', err instanceof Error ? err.message : err);
  }
}

export async function syncWithSupabase(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { data: remoteRecords, error } = await supabase
      .from('consignments')
      .select('tracking_id, data, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Storage] Supabase hydration warning:', error.message);
      return;
    }

    const store = getStore();

    if (remoteRecords && remoteRecords.length > 0) {
      let updated = false;
      for (const row of remoteRecords) {
        if (!row.data) continue;
        const item = row.data as Consignment;
        const normId = item.trackingId.toUpperCase();
        const existingIdx = store.findIndex((c) => c.trackingId.toUpperCase() === normId);
        if (existingIdx === -1) {
          store.unshift(item);
          updated = true;
        } else {
          // Remote overrides local
          store[existingIdx] = item;
          updated = true;
        }
      }
      if (updated) {
        writeConsignmentsToDisk(store);
      }
    } else if (store.length > 0) {
      // Local has records but remote is empty: push local records to Supabase
      for (const c of store) {
        await syncConsignmentToSupabase(c);
      }
    }
  } catch (err) {
    console.warn('[Storage] Supabase hydration error:', err);
  }
}

function getStore(): Consignment[] {
  if (!globalThis.__CONSIGNMENTS_STORE__) {
    globalThis.__CONSIGNMENTS_STORE__ = readConsignmentsFromDisk();
    if (isSupabaseConfigured()) {
      syncWithSupabase().catch(() => {});
    }
  }
  return globalThis.__CONSIGNMENTS_STORE__!;
}

export function getAllConsignments(): Consignment[] {
  const store = getStore();
  const disk = readConsignmentsFromDisk();
  if (disk.length !== store.length) {
    globalThis.__CONSIGNMENTS_STORE__ = disk;
    return disk;
  }
  return store;
}

export async function getAllConsignmentsAsync(): Promise<Consignment[]> {
  await syncWithSupabase().catch(() => {});
  return getAllConsignments();
}

export function getConsignmentById(id: string): Consignment | undefined {
  if (!id) return undefined;
  const normalized = id.trim().toUpperCase();
  const store = getAllConsignments();
  return store.find((c) => c.trackingId.toUpperCase() === normalized);
}

export async function getConsignmentByIdAsync(id: string): Promise<Consignment | undefined> {
  if (!id) return undefined;
  const normalized = id.trim().toUpperCase();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('consignments')
        .select('data')
        .eq('tracking_id', normalized)
        .maybeSingle();

      if (!error && data?.data) {
        const remote = data.data as Consignment;
        const store = getAllConsignments();
        const idx = store.findIndex((c) => c.trackingId.toUpperCase() === normalized);
        if (idx === -1) {
          store.unshift(remote);
        } else {
          store[idx] = remote;
        }
        writeConsignmentsToDisk(store);
        return remote;
      }
    } catch {
      // Fallback to local
    }
  }

  return getConsignmentById(id);
}

/**
 * Idempotent Consignment Creation:
 * If a consignment with the same trackingId already exists, it returns the existing record
 * without duplicating or modifying it.
 */
export function addConsignment(newConsignment: Consignment): Consignment {
  const store = getAllConsignments();
  const candidateId = newConsignment.trackingId.trim().toUpperCase();
  newConsignment.trackingId = candidateId;

  // Check for existing consignment with this exact tracking ID (Idempotency)
  const existing = store.find((c) => c.trackingId.toUpperCase() === candidateId);
  if (existing) {
    console.log(`[Storage] Idempotent hit: Consignment ${candidateId} already exists. Returning existing.`);
    return existing;
  }

  // Prepend new consignment
  store.unshift(newConsignment);
  globalThis.__CONSIGNMENTS_STORE__ = store;

  // Immediately persist to disk atomically
  writeConsignmentsToDisk(store);

  // Sync to Supabase in background
  syncConsignmentToSupabase(newConsignment).catch(() => {});

  return newConsignment;
}

export function updateConsignment(
  trackingId: string,
  updates: Partial<Consignment>
): Consignment | undefined {
  const store = getAllConsignments();
  const normalized = trackingId.trim().toUpperCase();
  const index = store.findIndex((c) => c.trackingId.toUpperCase() === normalized);
  if (index === -1) return undefined;

  store[index] = {
    ...store[index],
    ...updates,
    trackingId: normalized // ensure tracking ID cannot be accidentally modified
  };

  globalThis.__CONSIGNMENTS_STORE__ = store;
  writeConsignmentsToDisk(store);
  syncConsignmentToSupabase(store[index]).catch(() => {});

  return store[index];
}

/**
 * Idempotent Checkpoint Addition:
 * Prevents duplicate checkpoints if the exact same checkpoint (matching status, title, and location)
 * is submitted repeatedly.
 */
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
  const store = getAllConsignments();
  const normalized = trackingId.trim().toUpperCase();
  const consignment = store.find((c) => c.trackingId.toUpperCase() === normalized);
  if (!consignment) return undefined;

  // Check for duplicate checkpoint (Idempotency check)
  const isDuplicate = consignment.checkpoints.some(
    (cp) =>
      cp.status === checkpointData.status &&
      cp.title.trim().toLowerCase() === checkpointData.title.trim().toLowerCase() &&
      cp.location.trim().toLowerCase() === checkpointData.location.trim().toLowerCase()
  );

  if (isDuplicate) {
    console.log(`[Storage] Idempotent hit: Checkpoint "${checkpointData.title}" already recorded for ${normalized}.`);
    return consignment;
  }

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

  globalThis.__CONSIGNMENTS_STORE__ = store;
  writeConsignmentsToDisk(store);
  syncConsignmentToSupabase(consignment).catch(() => {});

  return consignment;
}

export function resetToSeedData(): Consignment[] {
  globalThis.__CONSIGNMENTS_STORE__ = [];
  writeConsignmentsToDisk([]);

  if (isSupabaseConfigured()) {
    Promise.resolve(
      supabase.from('consignments').delete().neq('tracking_id', '__never_match__')
    ).catch(() => {});
  }

  return [];
}
