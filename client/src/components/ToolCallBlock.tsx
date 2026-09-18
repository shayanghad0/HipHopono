import { useState } from 'react';
import CodeDiffView from './CodeDiffView.tsx';

interface FileDiff {
  oldPath: string;
  newPath: string;
  hunks: Array<{
    oldStart: number;
    oldCount: number;
    newStart: number;
    newCount: number;
    lines: Array<{ type: 'common' | 'removed' | 'added'; content: string }>;
  }>;
  oldContent: string;
  newContent: string;
}

interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status?: string;
  output?: string;
  diff?: FileDiff | null;
  filePath?: string;
}

interface ToolCallBlockProps {
  toolCall: ToolCall;
}

export default function ToolCallBlock({ toolCall }: ToolCallBlockProps) {
  const [expanded, setExpanded] = useState(false);

  const getStatusIcon = () => {
    switch (toolCall.status) {
      case 'running':
        return <span className="text-warning animate-pulse">⟳</span>;
      case 'done':
        return <span className="text-success">✓</span>;
      case 'error':
        return <span className="text-danger">✗</span>;
      default:
        return <span className="text-text-muted">○</span>;
    }
  };

  const formatArgs = (args: Record<string, unknown>): string => {
    const entries = Object.entries(args);
    if (entries.length === 0) return '';
    return entries
      .map(([key, value]) => {
        const val = typeof value === 'string' ? value : JSON.stringify(value);
        return `${key}: ${val.length > 50 ? val.slice(0, 50) + '...' : val}`;
      })
      .join(', ');
  };

  const isFileModification = toolCall.name === 'write_file' || toolCall.name === 'create_file';
  const hasDiff = Boolean(isFileModification && toolCall.diff?.hunks && toolCall.diff.hunks.length > 0);
  // For new files, diff has added lines; also treat empty oldContent as needing display
  const shouldShowDiff = Boolean(isFileModification && (hasDiff || (toolCall.diff && toolCall.status === 'done')));

  return (
    <div className="border border-border rounded bg-bg-secondary overflow-hidden">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-bg-tertiary"
        onClick={() => setExpanded(!expanded)}
      >
        {getStatusIcon()}
        <span className="text-text text-sm font-mono">{toolCall.name}</span>
        <span className="text-text-muted text-xs truncate flex-1">
          {formatArgs(toolCall.args)}
        </span>
        <span className="text-text-muted text-xs">
          {expanded ? '▼' : '▶'}
        </span>
      </div>

      {/* Side-by-side diff: removed=red left, added=green right */}
      {shouldShowDiff && toolCall.diff ? (
        <div className="border-t border-border p-3 bg-bg">
          <CodeDiffView diff={toolCall.diff} filePath={toolCall.filePath || (toolCall.args.path as unknown as string)} />
        </div>
      ) : null}

      {/* Fallback for file modification without structured diff: show content inline with simple highlight */}
      {isFileModification && !toolCall.diff && toolCall.status === 'done' && typeof toolCall.args.content === 'string' ? (
        <div className="border-t border-border p-3 bg-bg">
          <CodeDiffView
            diff={null}
            filePath={toolCall.filePath || (toolCall.args.path as unknown as string)}
            oldContent=""
            newContent={toolCall.args.content as string}
          />
        </div>
      ) : null}

      {expanded && (
        <div className="border-t border-border px-3 py-2">
          <pre className="text-xs text-text-muted font-mono overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(toolCall.args, null, 2)}
          </pre>
          {toolCall.output && (
            <div className="mt-2 pt-2 border-t border-border">
              <div className="text-xs text-text-muted mb-1">Output:</div>
              <pre className="text-xs text-text font-mono overflow-x-auto whitespace-pre-wrap">{toolCall.output}</pre>
            </div>
          )}
          {toolCall.diff && (
            <div className="mt-2 pt-2 border-t border-border">
              <div className="text-xs text-text-muted mb-1">Diff JSON:</div>
              <pre className="text-xs text-text-muted font-mono overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
                {JSON.stringify(toolCall.diff, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
