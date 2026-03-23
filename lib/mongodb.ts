import { MongoClient } from "mongodb";
import { runtimeEnv } from "./runtime-env";

declare global {
  // eslint-disable-next-line no-var -- cache HMR
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getUri(): string {
  const uri = runtimeEnv("MONGODB_URI");
  if (!uri) throw new Error("MONGODB_URI no configurada");
  return uri;
}

const clientOptions = {
  /** Falla antes que el default 30s; útil para ver errores de red/Atlas más claros */
  serverSelectionTimeoutMS: 15_000,
  connectTimeoutMS: 15_000,
} as const;

export function getMongoClient(): Promise<MongoClient> {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(getUri(), clientOptions);
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
}

export async function getDb() {
  const client = await getMongoClient();
  const name = runtimeEnv("MONGODB_DB_NAME") || "sis_archivos";
  return client.db(name);
}
