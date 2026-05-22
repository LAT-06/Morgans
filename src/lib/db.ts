import { neon } from '@neondatabase/serverless';
import { getEnv } from './env';

type SqlClient = ReturnType<typeof neon>;

let client: SqlClient | null = null;

export function hasDatabase() {
  return Boolean(getEnv('DATABASE_URL'));
}

export function getSql() {
  const databaseUrl = getEnv('DATABASE_URL');

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured');
  }

  client ??= neon(databaseUrl);
  return client;
}
