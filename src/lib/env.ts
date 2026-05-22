export const isProduction = process.env.NODE_ENV === 'production';

export function getEnv(name: string) {
  const viteEnv = import.meta.env as Record<string, string | undefined>;
  return process.env[name]?.trim() || viteEnv[name]?.trim() || '';
}

export function requireEnv(name: string) {
  const value = getEnv(name);

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

export function getAdminEmail() {
  return getEnv('ADMIN_EMAIL').toLowerCase();
}
