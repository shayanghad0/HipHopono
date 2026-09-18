import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { env } from '../env.js';

export class PathSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathSecurityError';
  }
}

function isInside(childPath: string, parentPath: string): boolean {
  const relative = path.relative(parentPath, childPath);
  if (!relative) return true; // same path
  // Outside if it escapes with .. or is an absolute path on another drive
  if (relative === '..' || relative.startsWith(`..${path.sep}`)) return false;
  if (path.isAbsolute(relative)) return false;
  return true;
}

function isInsideInsensitive(childPath: string, parentPath: string): boolean {
  if (process.platform === 'win32') {
    return isInside(childPath.toLowerCase(), parentPath.toLowerCase());
  }
  return isInside(childPath, parentPath);
}

export async function safePath(inputPath: string, projectRoot?: string): Promise<string> {
  // Resolve relative paths against projectRoot if provided
  const resolved = path.isAbsolute(inputPath)
    ? path.resolve(inputPath)
    : path.resolve(projectRoot || process.cwd(), inputPath);

  const normalized = path.normalize(resolved);
  if (normalized.includes('\0')) {
    throw new PathSecurityError('Path contains null bytes');
  }

  // NOTE: path.resolve() already collapses ".." segments, so checking
  // includes('..') would false-positive on legit names like "my..folder".
  // Traversal is enforced below via isInside() checks.

  let allowed = false;

  // Always allow paths within the project root
  if (projectRoot) {
    const projResolved = path.resolve(projectRoot);
    if (isInsideInsensitive(normalized, projResolved)) {
      allowed = true;
    }
  }

  // Always allow paths within user's home directory
  if (!allowed) {
    const homeDir = os.homedir();
    if (normalized.startsWith(homeDir)) {
      allowed = true;
    }
  }

  // Also check configured allowed roots
  if (!allowed) {
    for (const root of env.ALLOWED_ROOTS) {
      if (!root) continue;
      const rootResolved = path.resolve(root);
      if (isInsideInsensitive(normalized, rootResolved)) {
        allowed = true;
        break;
      }
    }
  }

  if (!allowed) {
    throw new PathSecurityError(`Path is outside allowed roots: ${normalized}`);
  }

  if (projectRoot) {
    const projResolved = path.resolve(projectRoot);
    if (!isInsideInsensitive(normalized, projResolved)) {
      throw new PathSecurityError('Path is outside project root');
    }
  }

  try {
    const stat = await fs.lstat(normalized);
    if (stat.isSymbolicLink()) {
      const real = await fs.realpath(normalized);
      const realNormalized = path.normalize(real);

      // Always allow symlinks pointing within project root
      if (projectRoot) {
        const projResolved = path.resolve(projectRoot);
        if (isInsideInsensitive(realNormalized, projResolved)) {
          return realNormalized;
        }
      }

      // Always allow symlinks pointing within user's home directory
      const homeDir = os.homedir();
      if (realNormalized.startsWith(homeDir)) {
        return realNormalized;
      }

      for (const root of env.ALLOWED_ROOTS) {
        if (!root) continue;
        const rootResolved = path.resolve(root);
        if (isInsideInsensitive(realNormalized, rootResolved)) {
          return realNormalized;
        }
      }
      throw new PathSecurityError('Symlink points outside allowed roots');
    }
  } catch (err) {
    if (err instanceof PathSecurityError) throw err;
  }

  return normalized;
}

export async function listDirectory(dirPath: string, projectRoot?: string): Promise<string[]> {
  const safe = await safePath(dirPath, projectRoot);
  const entries = await fs.readdir(safe, { withFileTypes: true });
  return entries
    .filter(e => !e.name.startsWith('.'))
    .map(e => e.name);
}

export async function readFileSafe(filePath: string, projectRoot?: string): Promise<string> {
  const safe = await safePath(filePath, projectRoot);
  const content = await fs.readFile(safe, 'utf-8');
  return content;
}

export async function writeFileSafe(filePath: string, content: string, projectRoot?: string): Promise<void> {
  const safe = await safePath(filePath, projectRoot);
  await fs.mkdir(path.dirname(safe), { recursive: true });
  await fs.writeFile(safe, content, 'utf-8');
}

export async function deletePathSafe(targetPath: string, projectRoot?: string): Promise<void> {
  const safe = await safePath(targetPath, projectRoot);
  await fs.rm(safe, { recursive: true, force: true });
}

export async function renamePathSafe(oldPath: string, newPath: string, projectRoot?: string): Promise<void> {
  const safeOld = await safePath(oldPath, projectRoot);
  const safeNew = await safePath(newPath, projectRoot);
  await fs.rename(safeOld, safeNew);
}

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}
