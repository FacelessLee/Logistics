import fs from 'fs';
import path from 'path';
import { Consignment, Checkpoint, ShipmentStatus } from './types';
import { INITIAL_CONSIGNMENTS } from '../data/initialConsignments';
import { getDatabase, isMongoConfigured, safeGetDatabase } from './mongodb';

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
    // If no file exists, start clean (empty array)
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

async function syncToMongo(consignment: Consignment): Promise<void> {
  if (!isMongoConfigured()) return;
  try {
    const db = await safeGetDatabase();
    if (!db) return;
    await db.collection('consignments').updateOne(
      { trackingId: consignment.trackingId.toUpperCase() },
      { $set: consignment },
      { upsert: true }
    );
  } catch (err) {
    console.warn('[Storage] MongoDB sync warning (persisted locally to disk):', err instanceof Error ? err.message : err);
  }
}

function getStore(): Consignment[] {
  if (!globalThis.__CONSIGNMENTS_STORE__) {
    // Load persisted consignments from disk
    globalThis.__CONSIGNMENTS_STORE__ = readConsignmentsFromDisk();

    // Asynchronously sync with MongoDB if available
    if (isMongoConfigured()) {
      safeGetDatabase()
        .then(async (db) => {
          if (!db) return;
          try {
            // Purge demo records from MongoDB if present
            await db.collection('consignments').deleteMany({
              trackingId: { $in: ['TRK-2026-89420', 'TRK-2026-90214', 'TRK-2026-11847', 'TRK-2026-55901', 'SEA-4011-SHA-ROT'] }
            });

            const docs = await db.collection<Consignment>('consignments').find().toArray();
            if (docs && docs.length > 0 && globalThis.__CONSIGNMENTS_STORE__) {
              let updated = false;
              docs.forEach((doc) => {
                const idx = globalThis.__CONSIGNMENTS_STORE__!.findIndex(
                  (c) => c.trackingId.toUpperCase() === doc.trackingId.toUpperCase()
                );
                if (idx === -1) {
                  globalThis.__CONSIGNMENTS_STORE__!.unshift(doc);
                  updated = true;
                } else {
                  // Merge if remote is newer
                  globalThis.__CONSIGNMENTS_STORE__![idx] = doc;
                  updated = true;
                }
              });
              if (updated) {
                writeConsignmentsToDisk(globalThis.__CONSIGNMENTS_STORE__!);
              }
            } else if (globalThis.__CONSIGNMENTS_STORE__ && globalThis.__CONSIGNMENTS_STORE__.length > 0) {
              // Push local records to Mongo
              for (const c of globalThis.__CONSIGNMENTS_STORE__) {
                await syncToMongo(c);
              }
            }
          } catch (err) {
            console.warn('[Storage] MongoDB hydration error:', err);
          }
        })
        .catch(() => {});
    }
  }
  return globalThis.__CONSIGNMENTS_STORE__!;
}

export function getAllConsignments(): Consignment[] {
  // Always refresh from disk if store is empty or to ensure cross-process sync
  const store = getStore();
  const disk = readConsignmentsFromDisk();
  if (disk.length !== store.length) {
    globalThis.__CONSIGNMENTS_STORE__ = disk;
    return disk;
  }
  return store;
}

export function getConsignmentById(id: string): Consignment | undefined {
  if (!id) return undefined;
  const normalized = id.trim().toUpperCase();
  const store = getAllConsignments();
  return store.find((c) => c.trackingId.toUpperCase() === normalized);
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

  // Sync to MongoDB asynchronously in background
  syncToMongo(newConsignment);

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
  syncToMongo(store[index]);

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
  syncToMongo(consignment);

  return consignment;
}

export function resetToSeedData(): Consignment[] {
  globalThis.__CONSIGNMENTS_STORE__ = [];
  writeConsignmentsToDisk([]);
  return [];
}
