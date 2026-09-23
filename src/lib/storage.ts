import { Consignment, Checkpoint, ShipmentStatus } from './types';
import { INITIAL_CONSIGNMENTS } from '../data/initialConsignments';
import { getDatabase, isMongoConfigured } from './mongodb';

async function syncToMongo(consignment: Consignment) {
  if (!isMongoConfigured()) return;
  try {
    const db = await getDatabase();
    await db.collection('consignments').updateOne(
      { trackingId: consignment.trackingId },
      { $set: consignment },
      { upsert: true }
    );
  } catch (err) {
    console.error('[Storage] MongoDB sync error:', err);
  }
}

// Global singleton across serverless invocations / dev reload
declare global {
  // eslint-disable-next-line no-var
  var __CONSIGNMENTS_STORE__: Consignment[] | undefined;
}

function getStore(): Consignment[] {
  if (!globalThis.__CONSIGNMENTS_STORE__) {
    // Clone initial consignments
    globalThis.__CONSIGNMENTS_STORE__ = JSON.parse(JSON.stringify(INITIAL_CONSIGNMENTS));

    // Asynchronously hydrate from MongoDB if available
    if (isMongoConfigured()) {
      getDatabase()
        .then(async (db) => {
          try {
            const count = await db.collection('consignments').countDocuments();
            if (count === 0) {
              await db.collection('consignments').insertMany(INITIAL_CONSIGNMENTS);
            } else {
              const docs = await db.collection<Consignment>('consignments').find().toArray();
              if (docs && docs.length > 0 && globalThis.__CONSIGNMENTS_STORE__) {
                docs.forEach((doc) => {
                  const idx = globalThis.__CONSIGNMENTS_STORE__!.findIndex(
                    (c) => c.trackingId.toUpperCase() === doc.trackingId.toUpperCase()
                  );
                  if (idx === -1) {
                    globalThis.__CONSIGNMENTS_STORE__!.unshift(doc);
                  } else {
                    globalThis.__CONSIGNMENTS_STORE__![idx] = doc;
                  }
                });
              }
            }
          } catch (err) {
            console.error('[Storage] MongoDB hydration error:', err);
          }
        })
        .catch(() => {});
    }
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
  let candidateId = newConsignment.trackingId.trim().toUpperCase();
  const existing = store.find((c) => c.trackingId.toUpperCase() === candidateId);
  if (existing) {
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    candidateId = `${candidateId}-${randomSuffix}`;
    newConsignment.trackingId = candidateId;
  }
  store.unshift(newConsignment);
  syncToMongo(newConsignment);
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
  syncToMongo(store[index]);
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

  syncToMongo(consignment);
  return consignment;
}

export function resetToSeedData(): Consignment[] {
  globalThis.__CONSIGNMENTS_STORE__ = JSON.parse(JSON.stringify(INITIAL_CONSIGNMENTS));
  return globalThis.__CONSIGNMENTS_STORE__!;
}
