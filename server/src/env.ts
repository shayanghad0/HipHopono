import { config } from 'dotenv';
import { z } from 'zod';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

config();
// Also try loading .env from repo root (when running from server/ dir)
config({ path: path.resolve(process.cwd(), '../.env') });
try {
  const here = path.dirname(fileURLToPath(import.meta.url));
  config({ path: path.resolve(here, '../../.env') });
} catch {
  // ignore — process.cwd() fallback above already covers most cases
}

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  SESSION_SECRET: z.string().default('hiphopono-dev-secret-change-in-production'),
  WEbCODE_ALLOWED_ROOTS: z.string().default(os.homedir()),
  DATA_DIR: z.string().default('./database'),
  ALLOW_RESET: z.enum(['true', 'false']).default('true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  // Split on both ':' (posix) and ';' (windows). A naive split(':')
  // breaks Windows paths like C:\Users\foo (drive-letter colon).
  // So we split on ';' first, then split ':' pieces only when they
  // don't look like a Windows drive letter.
  ALLOWED_ROOTS: parseAllowedRoots(parsed.data.WEbCODE_ALLOWED_ROOTS),
  DATA_DIR_ABS: path.resolve(parsed.data.DATA_DIR),
};

function parseAllowedRoots(raw: string): string[] {
  if (!raw.trim()) return [os.homedir()];
  const DRIVE = '__DRIVE__';
  // Split on ';' always, and on ':' except when it's a Windows drive colon
  // (e.g. C:\... or C:/...). Drive = single letter at start of a segment
  // followed by slash/backslash or end.
  const parts = raw.split(';').flatMap(part => {
    if (!part.includes(':')) return [part];
    const protectedPart = part.replace(/(^|[;:])([A-Za-z]):(?=[\\/]|$)/g, `$1$2${DRIVE}`);
    return protectedPart.split(':').map(s => s.replaceAll(DRIVE, ':'));
  });
  const cleaned = parts.map(p => p.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : [os.homedir()];
}
