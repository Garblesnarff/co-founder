import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env.js';
import * as schema from './schema/index.js';

// Patch Error.captureStackTrace to handle cyclic structures in Bun
// pg-pool calls this and Bun's implementation can fail with cyclic error objects
const originalCaptureStackTrace = Error.captureStackTrace;
if (originalCaptureStackTrace) {
  Error.captureStackTrace = function(targetObject: object, constructorOpt?: Function) {
    try {
      originalCaptureStackTrace.call(Error, targetObject, constructorOpt);
    } catch {
      // If it fails (cyclic structure), just set a basic stack
      (targetObject as Error).stack = new Error().stack;
    }
  };
}

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  // Increase idle timeout to reduce connection churn
  idleTimeoutMillis: 30000,
  // Add connection timeout
  connectionTimeoutMillis: 10000,
});

// Handle pool errors to prevent cyclic reference issues in pg-pool error handling
pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error on idle client:', err.message);
});

export const db = drizzle(pool, { schema });
