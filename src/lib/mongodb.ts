import { MongoClient, Db } from 'mongodb';

function normalizeMongoUri(rawUri: string): string {
  // If the password part contains unencoded '@' before the cluster hostname, encode it
  // Example: mongodb+srv://user:pass@word@cluster -> mongodb+srv://user:pass%40word@cluster
  try {
    const srvPrefix = rawUri.startsWith('mongodb+srv://') ? 'mongodb+srv://' : rawUri.startsWith('mongodb://') ? 'mongodb://' : '';
    if (!srvPrefix) return rawUri;

    const rest = rawUri.slice(srvPrefix.length);
    const lastAtIdx = rest.lastIndexOf('@');
    if (lastAtIdx === -1) return rawUri;

    const userPass = rest.slice(0, lastAtIdx);
    const hostAndParams = rest.slice(lastAtIdx + 1);

    const firstColonIdx = userPass.indexOf(':');
    if (firstColonIdx === -1) return rawUri;

    const username = userPass.slice(0, firstColonIdx);
    let password = userPass.slice(firstColonIdx + 1);

    // If password contains literal '@' and isn't already encoded
    if (password.includes('@')) {
      password = encodeURIComponent(decodeURIComponent(password));
    }

    return `${srvPrefix}${username}:${password}@${hostAndParams}`;
  } catch {
    return rawUri;
  }
}

const options = {
  serverSelectionTimeoutMS: 3000,
  connectTimeoutMS: 3000,
};

let clientPromise: Promise<MongoClient> | null = null;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function isMongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim().length > 0);
}

export function getMongoClientPromise(): Promise<MongoClient> {
  const currentUri = process.env.MONGODB_URI;
  if (!currentUri) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  const sanitizedUri = normalizeMongoUri(currentUri.trim());

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(sanitizedUri, options);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  } else {
    if (!clientPromise) {
      const client = new MongoClient(sanitizedUri, options);
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

export async function getDatabase(): Promise<Db> {
  const connectedClient = await getMongoClientPromise();
  return connectedClient.db('navithon_logistics');
}

export async function safeGetDatabase(): Promise<Db | null> {
  if (!isMongoConfigured()) return null;
  try {
    return await getDatabase();
  } catch {
    return null;
  }
}

export default getMongoClientPromise;

