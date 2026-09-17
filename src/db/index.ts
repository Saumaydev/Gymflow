import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

/** Supabase requires TLS; the Supavisor pooler also terminates TLS with its own CA chain. */
function needsSsl(url: string): boolean {
  if (/sslmode=(require|prefer|verify-ca|verify-full)/i.test(url)) return true;
  if (/sslmode=disable/i.test(url)) return false;
  try {
    const { hostname } = new URL(url);
    return hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "::1";
  } catch {
    return true;
  }
}

/**
 * Supabase pooler (Supavisor) runs in transaction mode on port 6543 and cannot keep
 * server-side prepared statements alive between calls, so we disable statement caching
 * there. Direct connections (5432) keep the faster cached path.
 */
function isPooler(url: string): boolean {
  return /pooler\.supabase\.com/i.test(url) || /:6543\b/.test(url);
}

const config: PoolConfig = {
  connectionString: databaseUrl,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
  application_name: "gymflow",
  statement_timeout: Number(process.env.PG_STATEMENT_TIMEOUT_MS ?? 15_000),
};

if (needsSsl(databaseUrl)) {
  config.ssl = { rejectUnauthorized: false };
}

const globalForDb = globalThis as typeof globalThis & {
  __gymflowPool?: Pool;
  __gymflowPoolerMode?: boolean;
};

export const poolerMode = isPooler(databaseUrl);
globalForDb.__gymflowPoolerMode = poolerMode;

export const pool =
  globalForDb.__gymflowPool ?? new Pool(config);

if (process.env.NODE_ENV !== "production") {
  globalForDb.__gymflowPool = pool;
}

export const db = drizzle(pool, { logger: process.env.PG_DEBUG === "true" });
