interface DiffLine {
  type: 'common' | 'removed' | 'added';
  content: string;
}

interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

interface FileDiff {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
  oldContent: string;
  newContent: string;
}

interface CodeDiffViewProps {
  diff: FileDiff | null;
  filePath?: string;
  oldContent?: string;
  newContent?: string;
}

function buildSideBySideRows(hunks: DiffHunk[]) {
  type Row = {
    leftNum: number | null;
    leftContent: string | null;
    leftType: 'common' | 'removed' | 'empty';
    rightNum: number | null;
    rightContent: string | null;
    rightType: 'common' | 'added' | 'empty';
  };

  const rows: Row[] = [];

  for (const hunk of hunks) {
    let oldLine = hunk.oldStart;
    let newLine = hunk.newStart;

    // group: pair removed/added sequences
    let i = 0;
    while (i < hunk.lines.length) {
      const line = hunk.lines[i];

      if (line.type === 'common') {
        rows.push({
          leftNum: oldLine,
          leftContent: line.content,
          leftType: 'common',
          rightNum: newLine,
          rightContent: line.content,
          rightType: 'common',
        });
        oldLine++;
        newLine++;
        i++;
      } else if (line.type === 'removed') {
        // collect contiguous removed
        const removed: DiffLine[] = [];
        while (i < hunk.lines.length && hunk.lines[i].type === 'removed') {
          removed.push(hunk.lines[i]);
          i++;
        }
        // collect contiguous added (if any) to pair
        const added: DiffLine[] = [];
        while (i < hunk.lines.length && hunk.lines[i].type === 'added') {
          added.push(hunk.lines[i]);
          i++;
        }

        const maxLen = Math.max(removed.length, added.length);
        for (let k = 0; k < maxLen; k++) {
          const r = removed[k];
          const a = added[k];
          rows.push({
            leftNum: r ? oldLine++ : null,
            leftContent: r ? r.content : null,
            leftType: r ? 'removed' : 'empty',
            rightNum: a ? newLine++ : null,
            rightContent: a ? a.content : null,
            rightType: a ? 'added' : 'empty',
          });
        }
      } else if (line.type === 'added') {
        // isolated added block without preceding removed
        const added: DiffLine[] = [];
        while (i < hunk.lines.length && hunk.lines[i].type === 'added') {
          added.push(hunk.lines[i]);
          i++;
        }
        for (const a of added) {
          rows.push({
            leftNum: null,
            leftContent: null,
            leftType: 'empty',
            rightNum: newLine++,
            rightContent: a.content,
            rightType: 'added',
          });
        }
      }
    }
  }

  return rows;
}

function inferLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    py: 'python',
    json: 'json',
    css: 'css',
    html: 'html',
    md: 'markdown',
    yml: 'yaml',
    yaml: 'yaml',
  };
  return map[ext] || ext || 'code';
}

export default function CodeDiffView({ diff, filePath, oldContent, newContent }: CodeDiffViewProps) {
  // Derive diff from raw content if no structured diff but content provided
  let effectiveDiff: FileDiff | null = diff;

  // If diff is null but we have contents, treat as no change
  if (!effectiveDiff && oldContent !== undefined && newContent !== undefined && oldContent !== newContent) {
    // fallback simple
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    effectiveDiff = {
      oldPath: filePath || '',
      newPath: filePath || '',
      oldContent,
      newContent,
      hunks: [
        {
          oldStart: 1,
          oldCount: oldLines.length,
          newStart: 1,
          newCount: newLines.length,
          lines: [
            ...oldLines.map((c) => ({ type: 'removed' as const, content: c })),
            ...newLines.map((c) => ({ type: 'added' as const, content: c })),
          ],
        },
      ],
    };
  }

  if (!effectiveDiff || !effectiveDiff.hunks || effectiveDiff.hunks.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg-secondary p-4 text-sm text-text-muted">
        No changes detected.
      </div>
    );
  }

  const rows = buildSideBySideRows(effectiveDiff.hunks);
  const displayPath = filePath || effectiveDiff.newPath || effectiveDiff.oldPath || 'file';
  const language = inferLanguage(displayPath);

  const addedCount = rows.filter((r) => r.rightType === 'added').length;
  const removedCount = rows.filter((r) => r.leftType === 'removed').length;

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-bg-secondary">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-bg-tertiary border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-text-bright truncate">{displayPath}</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-bg-secondary border border-border text-text-muted font-mono">
            {language}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono shrink-0">
          {removedCount > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-[#3d1a1a] text-[#ff7b72] border border-[#ff7b72]/30">
              -{removedCount}
            </span>
          )}
          {addedCount > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-[#1a3d1a] text-[#7ee787] border border-[#7ee787]/30">
              +{addedCount}
            </span>
          )}
        </div>
      </div>

      {/* Column labels */}
      <div className="grid grid-cols-2 text-[11px] font-mono font-semibold tracking-wide">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a1212] text-[#ff7b72] border-b border-r border-border">
          <span className="h-2 w-2 rounded-full bg-[#ff7b72]" />
          BEFORE — removed in red
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#112a12] text-[#7ee787] border-b border-border">
          <span className="h-2 w-2 rounded-full bg-[#7ee787]" />
          AFTER — added in green
        </div>
      </div>

      {/* Side-by-side code windows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 max-h-[420px] overflow-auto divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* LEFT WINDOW — removed in red */}
        <div className="overflow-x-auto bg-[#1a0f0f] min-w-0">
          <div className="min-w-max">
            {rows.map((row, idx) => (
              <div
                key={`left-${idx}`}
                className={`flex text-xs font-mono leading-5 whitespace-pre ${
                  row.leftType === 'removed'
                    ? 'bg-[#490202]/70 text-[#ff7b72]'
                    : row.leftType === 'empty'
                      ? 'bg-[#1a0f0f] text-transparent'
                      : 'bg-transparent text-[#c9d1d9]'
                }`}
              >
                <span className="w-10 shrink-0 text-right pr-2 select-none border-r border-white/5 bg-black/20 text-[#8b949e]">
                  {row.leftNum ?? ''}
                </span>
                <span className="px-2 shrink-0 select-none w-4 text-center text-[#8b949e]">
                  {row.leftType === 'removed' ? '-' : row.leftType === 'common' ? ' ' : ''}
                </span>
                <span className="pr-4 flex-1">
                  {row.leftContent ?? ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT WINDOW — added in green */}
        <div className="overflow-x-auto bg-[#0f1a0f] min-w-0">
          <div className="min-w-max">
            {rows.map((row, idx) => (
              <div
                key={`right-${idx}`}
                className={`flex text-xs font-mono leading-5 whitespace-pre ${
                  row.rightType === 'added'
                    ? 'bg-[#033a16]/70 text-[#7ee787]'
                    : row.rightType === 'empty'
                      ? 'bg-[#0f1a0f] text-transparent'
                      : 'bg-transparent text-[#c9d1d9]'
                }`}
              >
                <span className="w-10 shrink-0 text-right pr-2 select-none border-r border-white/5 bg-black/20 text-[#8b949e]">
                  {row.rightNum ?? ''}
                </span>
                <span className="px-2 shrink-0 select-none w-4 text-center text-[#8b949e]">
                  {row.rightType === 'added' ? '+' : row.rightType === 'common' ? ' ' : ''}
                </span>
                <span className="pr-4 flex-1">
                  {row.rightContent ?? ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 bg-bg-tertiary border-t border-border flex items-center gap-3 text-[11px] font-mono text-text-muted">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-[#490202] border border-[#ff7b72]/40 inline-block" /> removed
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-[#033a16] border border-[#7ee787]/40 inline-block" /> added
        </span>
        <span className="ml-auto text-text-muted/70">
          {rows.length} lines • side-by-side
        </span>
      </div>
    </div>
  );
}
