/**
 * Simple unified diff implementation
 */

export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: Array<{ type: 'common' | 'removed' | 'added'; content: string }>;
}

export interface FileDiff {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
  oldContent: string;
  newContent: string;
}

function computeDiff(oldLines: string[], newLines: string[]): DiffHunk[] {
  const m = oldLines.length;
  const n = newLines.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find the actual diff
  const diff: Array<{ type: 'common' | 'removed' | 'added'; content: string }> = [];
  let i = m;
  let j = n;
  const raw: Array<{ type: 'common' | 'removed' | 'added'; content: string }> = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      raw.push({ type: 'common', content: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.push({ type: 'added', content: newLines[j - 1] });
      j--;
    } else {
      raw.push({ type: 'removed', content: oldLines[i - 1] });
      i--;
    }
  }

  raw.reverse();

  // Group into hunks (max 500 lines per hunk, merge adjacent changes)
  const hunks: DiffHunk[] = [];
  let currentHunk: Array<{ type: 'common' | 'removed' | 'added'; content: string }> = [];
  let oldStart = 1;
  let newStart = 1;
  let oldIdx = 0;
  let newIdx = 0;

  for (const item of raw) {
    if (currentHunk.length === 0) {
      // Starting a new hunk
      currentHunk.push({ type: item.type, content: item.content });
      if (item.type === 'common') {
        oldStart = oldIdx + 2; // 1-indexed, +1 for current
        newStart = newIdx + 2;
      } else if (item.type === 'removed') {
        oldStart = oldIdx + 1;
        newStart = newIdx + 1;
      } else {
        oldStart = oldIdx + 1;
        newStart = newIdx + 1;
      }
      continue;
    }

    if (
      (item.type === 'common' && currentHunk[currentHunk.length - 1]?.type === 'common') ||
      (item.type === 'common' && currentHunk.length >= 3)
    ) {
      // Extend context
      currentHunk.push({ type: item.type, content: item.content });
      if (item.type === 'common') {
        oldIdx++;
        newIdx++;
      }
      continue;
    }

    // Need to create a new hunk
    if (currentHunk.some(h => h.type !== 'common')) {
      hunks.push(buildHunk(currentHunk, oldStart, newStart));
    }
    currentHunk = [{ type: item.type, content: item.content }];
    if (item.type === 'common') {
      oldIdx++;
      newIdx++;
      oldStart = oldIdx + 1;
      newStart = newIdx + 1;
    } else if (item.type === 'removed') {
      oldStart = oldIdx + 1;
      newStart = newIdx + 1;
    } else {
      oldStart = oldIdx + 1;
      newStart = newIdx + 1;
    }
  }

  if (currentHunk.length > 0 && currentHunk.some(h => h.type !== 'common')) {
    hunks.push(buildHunk(currentHunk, oldStart, newStart));
  }

  // If no hunks with changes, but there's content, show whole thing as context
  if (hunks.length === 0 && (m > 0 || n > 0)) {
    // No changes, return empty
    return [];
  }

  // Limit hunk sizes for readability - merge small gaps
  return simplifyHunks(hunks, raw, oldLines, newLines);
}

function buildHunk(
  lines: Array<{ type: 'common' | 'removed' | 'added'; content: string }>,
  oldStart: number,
  newStart: number
): DiffHunk {
  let oldCount = 0;
  let newCount = 0;
  for (const l of lines) {
    if (l.type !== 'added') oldCount++;
    if (l.type !== 'removed') newCount++;
  }
  return { oldStart, oldCount, newStart, newCount, lines };
}

function simplifyHunks(
  hunks: DiffHunk[],
  raw: Array<{ type: 'common' | 'removed' | 'added'; content: string }>,
  oldLines: string[],
  newLines: string[]
): DiffHunk[] {
  // If we have small isolated changes, try to keep them together
  // For simplicity, just return computed hunks
  if (hunks.length <= 50) return hunks;
  
  // For very large diffs, limit to first few hunks
  return hunks.slice(0, 20);
}

export function computeFileDiff(oldContent: string, newContent: string): FileDiff | null {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  // Handle empty file case
  if (oldContent === '' && newContent !== '') {
    return {
      oldPath: '',
      newPath: '',
      hunks: [{
        oldStart: 0,
        oldCount: 0,
        newStart: 1,
        newCount: newLines.length,
        lines: newLines.map(l => ({ type: 'added' as const, content: l })),
      }],
      oldContent,
      newContent,
    };
  }

  if (oldContent !== '' && newContent === '') {
    return {
      oldPath: '',
      newPath: '',
      hunks: [{
        oldStart: 1,
        oldCount: oldLines.length,
        newStart: 0,
        newCount: 0,
        lines: oldLines.map(l => ({ type: 'removed' as const, content: l })),
      }],
      oldContent,
      newContent,
    };
  }

  if (oldContent === newContent) {
    return null; // No changes
  }

  const diffHunks = computeDiff(oldLines, newLines);
  if (diffHunks.length === 0) return null;

  return {
    oldPath: '',
    newPath: '',
    hunks: diffHunks,
    oldContent,
    newContent,
  };
}
