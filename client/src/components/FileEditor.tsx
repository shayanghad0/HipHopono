import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { api } from '../lib/api.ts';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface FileEditorProps {
  projectId: string;
  filePath: string;
  onClose: () => void;
}

const SYNTAX_EXTENSIONS: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.json': 'json',
  '.css': 'css',
  '.scss': 'scss',
  '.html': 'xml',
  '.md': 'markdown',
  '.py': 'python',
  '.sh': 'bash',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.sql': 'sql',
  '.graphql': 'graphql',
  '.gql': 'graphql',
};

function getLanguage(filename: string): string | undefined {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  return SYNTAX_EXTENSIONS[ext];
}

export default function FileEditor({ projectId, filePath, onClose }: FileEditorProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modified, setModified] = useState(false);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const filename = filePath.split('/').pop() || filePath;
  const language = useMemo(() => getLanguage(filename), [filename]);

  useEffect(() => {
    loadFile();
  }, [projectId, filePath]);

  // Ctrl+S / Cmd+S save shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [content, projectId, filePath]); // stable reference via useCallback below — re-register when deps change

  const handleSave = useCallback(async () => {
    if (!modified || !content) return;
    setSaving(true);
    try {
      await api.fs.save(projectId, filePath, content);
      setModified(false);
    } catch (err) {
      alert(`Save failed: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }, [modified, content, projectId, filePath]);

  const loadFile = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.fs.file(projectId, filePath);
      setContent(data.content);
      setModified(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setModified(true);
  };

  const lineCount = content.split('\n').length;
  const lineNumbers = useMemo(() => Array.from({ length: lineCount }, (_, i) => i + 1), [lineCount]);

  // Sync scroll between textarea and pre
  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const savedAt = useMemo(() => {
    const m = content.match(/\/\/ Save timestamp: (.+)/);
    return m ? m[1] : null;
  }, [content]);

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      {/* Tab bar */}
      <div className="flex items-center h-8 bg-[#252526] border-b border-[#3c3c3c] px-2">
        <div className="flex items-center gap-2 px-3 py-1 bg-[#1e1e1e] text-text text-xs rounded-t border-t border-x border-[#3c3c3c] max-w-[240px]">
          <span className="truncate">{filename}</span>
          {modified && !saving && <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />}
          {saving && <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 animate-pulse" />}
        </div>
        <button
          onClick={handleSave}
          disabled={!modified || saving}
          title="Save (Ctrl+S / Cmd+S)"
          className={`p-1 hover:bg-[#3c3c3c] rounded text-text-muted hover:text-text transition-colors mr-1 ${modified ? '' : 'opacity-40 cursor-not-allowed'}`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 9V4.5L6 1.5L9 4.5V9H7V5.5H5V9H3Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 9H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </button>
        <button
          onClick={onClose}
          className="p-1 hover:bg-[#3c3c3c] rounded text-text-muted hover:text-text transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Line numbers */}
        <div className="w-12 bg-[#1e1e1e] text-[#858585] text-xs font-mono py-2 pr-2 text-right select-none border-r border-[#3c3c3c] overflow-hidden">
          {lineNumbers.map(n => (
            <div key={n} className="leading-5">{n}</div>
          ))}
        </div>

        {/* Code */}
        <div className="flex-1 relative overflow-hidden">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">
              Loading...
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center text-danger text-sm p-4">
              {error}
            </div>
          ) : (
            <>
              {/* Syntax highlighted background */}
              <pre
                ref={preRef}
                className="absolute inset-0 m-0 p-2 font-mono text-sm leading-5 pointer-events-none whitespace-pre tab-4 overflow-hidden"
                aria-hidden="true"
              >
                {language ? (
                  <SyntaxHighlighter
                    language={language}
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      padding: 0,
                      background: 'transparent',
                      fontSize: '13px',
                      lineHeight: '20px',
                    }}
                    codeTagProps={{}}
                    showLineNumbers={false}
                  >
                    {content}
                  </SyntaxHighlighter>
                ) : (
                  content
                )}
              </pre>
              {/* Editable textarea on top */}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleEdit}
                onScroll={handleScroll}
                spellCheck={false}
                className="absolute inset-0 w-full h-full m-0 p-2 font-mono text-sm leading-5 bg-transparent text-transparent caret-white resize-none outline-none overflow-auto whitespace-pre tab-4"
                style={{ tabSize: 4 }}
              />
            </>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="h-6 bg-[#007acc] flex items-center px-2 text-xs text-white gap-4">
        <span>{filename}</span>
        {saving && <span className="opacity-75">Saving…</span>}
        {modified && !saving && <span className="opacity-75">Unsaved changes</span>}
        {!modified && !saving && <span className="opacity-75">Saved</span>}
        <span className="ml-auto opacity-75">
          Ln {lineCount} · {language || 'Plain Text'}
          {modified && <span> · Press Ctrl+S / Cmd+S to save</span>}
        </span>
      </div>
    </div>
  );
}
