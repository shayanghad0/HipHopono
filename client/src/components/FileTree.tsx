import { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import {
  Folder,
  FolderOpen,
  FolderGit2,
  FolderClosed,
  FolderCog,
  FolderDot,
  FolderCode,
  ChevronRight,
  ChevronDown,
  File,
  FileCode2,
  FileJson,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileTerminal,
  FileCog,
  FileSpreadsheet,
  Braces,
  Palette,
  Package,
  Settings,
  Hash,
  Box,
  Database,
  Image,
  Terminal,
  Code2,
} from 'lucide-react';

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
}

interface FileTreeProps {
  projectId: string;
  rootPath: string;
}

function getFileIcon(fileName: string): { Icon: typeof File; color: string } {
  const lower = fileName.toLowerCase();
  const ext = lower.includes('.') ? (lower.split('.').pop() as string) : '';

  if (lower === 'dockerfile' || lower.startsWith('dockerfile.')) return { Icon: Box, color: 'text-blue-400' };
  if (lower === 'docker-compose.yml' || lower === 'docker-compose.yaml' || lower === 'compose.yml' || lower === 'compose.yaml') return { Icon: Box, color: 'text-blue-400' };
  if (lower === 'package.json') return { Icon: Package, color: 'text-amber-400' };
  if (lower === 'package-lock.json' || lower === 'pnpm-lock.yaml' || lower === 'yarn.lock' || lower === 'bun.lockb') return { Icon: Package, color: 'text-amber-600' };
  if (lower === 'tsconfig.json' || lower.startsWith('tsconfig.')) return { Icon: FileJson, color: 'text-blue-400' };
  if (lower.startsWith('vite.config.') || lower.startsWith('vitest.config.')) return { Icon: Palette, color: 'text-purple-400' };
  if (lower.startsWith('tailwind.config.')) return { Icon: Palette, color: 'text-cyan-400' };
  if (lower.startsWith('postcss.config.')) return { Icon: Palette, color: 'text-orange-400' };
  if (lower === '.gitignore' || lower === '.gitattributes' || lower === '.gitmodules') return { Icon: Settings, color: 'text-orange-500' };
  if (lower === '.env' || lower.startsWith('.env.')) return { Icon: Settings, color: 'text-green-400' };
  if (lower === '.eslintrc' || lower.startsWith('.eslintrc.') || lower === '.eslintignore') return { Icon: Settings, color: 'text-violet-500' };
  if (lower === '.prettierrc' || lower.startsWith('.prettierrc.') || lower === 'prettier.config.js' || lower === '.prettierignore') return { Icon: Settings, color: 'text-pink-400' };
  if (lower === 'readme.md' || lower === 'readme') return { Icon: FileText, color: 'text-sky-300' };
  if (lower === 'license' || lower === 'license.md') return { Icon: FileText, color: 'text-text-muted' };
  if (lower === 'makefile' || lower === 'gnumakefile' || lower === 'justfile') return { Icon: Terminal, color: 'text-red-400' };

  switch (ext) {
    case 'ts':
    case 'mts':
    case 'cts':
      return { Icon: FileCode2, color: 'text-blue-400' };
    case 'tsx':
      return { Icon: FileCode2, color: 'text-sky-400' };
    case 'js':
    case 'mjs':
    case 'cjs':
      return { Icon: FileCode2, color: 'text-yellow-400' };
    case 'jsx':
      return { Icon: FileCode2, color: 'text-yellow-300' };
    case 'json':
    case 'jsonc':
      return { Icon: FileJson, color: 'text-amber-400' };
    case 'py':
    case 'pyi':
      return { Icon: FileCode2, color: 'text-blue-500' };
    case 'java':
      return { Icon: FileCode2, color: 'text-red-500' };
    case 'go':
      return { Icon: FileCode2, color: 'text-cyan-400' };
    case 'rs':
      return { Icon: FileCode2, color: 'text-orange-700' };
    case 'rb':
      return { Icon: FileCode2, color: 'text-red-600' };
    case 'php':
      return { Icon: FileCode2, color: 'text-indigo-400' };
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'c':
    case 'h':
    case 'hpp':
      return { Icon: FileCode2, color: 'text-sky-600' };
    case 'cs':
      return { Icon: FileCode2, color: 'text-purple-500' };
    case 'swift':
      return { Icon: FileCode2, color: 'text-orange-500' };
    case 'kt':
    case 'kts':
      return { Icon: FileCode2, color: 'text-purple-600' };
    case 'css':
      return { Icon: Palette, color: 'text-pink-400' };
    case 'scss':
    case 'sass':
    case 'less':
      return { Icon: Palette, color: 'text-pink-500' };
    case 'html':
    case 'htm':
      return { Icon: Code2, color: 'text-orange-500' };
    case 'xml':
      return { Icon: Code2, color: 'text-green-500' };
    case 'svg':
      return { Icon: Image, color: 'text-pink-400' };
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'ico':
    case 'bmp':
    case 'avif':
      return { Icon: FileImage, color: 'text-purple-400' };
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'webm':
    case 'mkv':
      return { Icon: FileVideo, color: 'text-red-400' };
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'flac':
    case 'aac':
      return { Icon: FileAudio, color: 'text-emerald-400' };
    case 'zip':
    case 'tar':
    case 'gz':
    case 'rar':
    case '7z':
    case 'bz2':
      return { Icon: FileArchive, color: 'text-zinc-400' };
    case 'md':
    case 'mdx':
    case 'markdown':
      return { Icon: FileText, color: 'text-slate-300' };
    case 'yml':
    case 'yaml':
    case 'toml':
      return { Icon: FileCog, color: 'text-red-400' };
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'fish':
      return { Icon: FileTerminal, color: 'text-green-400' };
    case 'bat':
    case 'ps1':
    case 'cmd':
      return { Icon: Terminal, color: 'text-blue-300' };
    case 'sql':
      return { Icon: Database, color: 'text-orange-400' };
    case 'prisma':
      return { Icon: Database, color: 'text-indigo-400' };
    case 'graphql':
    case 'gql':
      return { Icon: Braces, color: 'text-pink-500' };
    case 'vue':
      return { Icon: FileCode2, color: 'text-emerald-500' };
    case 'svelte':
      return { Icon: FileCode2, color: 'text-orange-600' };
    case 'astro':
      return { Icon: FileCode2, color: 'text-purple-400' };
    case 'csv':
    case 'tsv':
    case 'xls':
    case 'xlsx':
      return { Icon: FileSpreadsheet, color: 'text-green-500' };
    case 'pdf':
      return { Icon: FileText, color: 'text-red-500' };
    case 'lock':
      return { Icon: Hash, color: 'text-text-muted' };
    case 'log':
      return { Icon: FileText, color: 'text-text-muted' };
    default:
      if (lower.startsWith('.')) return { Icon: Hash, color: 'text-text-muted' };
      return { Icon: File, color: 'text-text-muted' };
  }
}

function getFolderIcon(name: string, expanded: boolean): { Icon: typeof Folder; color: string } {
  const lower = name.toLowerCase();
  if (lower === '.git') return { Icon: FolderGit2, color: 'text-[#f05133]' };
  if (lower === 'node_modules') return { Icon: expanded ? FolderOpen : FolderClosed, color: 'text-amber-600/80' };
  if (['dist', 'build', 'out', '.next', '.output', '.turbo', 'coverage'].includes(lower)) return { Icon: expanded ? FolderOpen : FolderClosed, color: 'text-text-muted' };
  if (['.vscode', '.idea', '.opencode', '.claude', '.cursor', '.codex', '.zed', '.ai', '.agent', '.prompts', '.skills', '.skill', '.rules'].includes(lower)) return { Icon: FolderCog, color: 'text-violet-400' };
  if (['src', 'client', 'server', 'components', 'pages', 'lib', 'utils', 'hooks', 'context', 'services', 'routes', 'middleware', 'types', 'styles'].includes(lower)) return { Icon: expanded ? FolderOpen : FolderCode, color: 'text-blue-400' };
  if (lower.startsWith('.')) return { Icon: FolderDot, color: 'text-text-muted' };
  return { Icon: expanded ? FolderOpen : Folder, color: 'text-accent' };
}

function TreeItem({
  node,
  projectId,
  level,
  onSelect,
}: {
  node: TreeNode;
  projectId: string;
  level: number;
  onSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(level < 1);
  const isDir = node.type === 'directory';

  const folderInfo = isDir ? getFolderIcon(node.name, expanded) : null;
  const fileInfo = !isDir ? getFileIcon(node.name) : null;

  return (
    <div>
      <div
        className="group flex items-center gap-1 py-[3px] pr-2 hover:bg-bg-tertiary/80 cursor-pointer text-[13px] leading-5 transition-colors select-none"
        style={{ paddingLeft: `${level * 14 + 6}px` }}
        onClick={() => {
          if (isDir) {
            setExpanded(!expanded);
          } else {
            onSelect(node.path);
          }
        }}
        title={node.path}
      >
        {/* chevron for dirs, spacer for files */}
        <span className="w-4 h-4 flex items-center justify-center shrink-0 text-text-muted/60 group-hover:text-text-muted">
          {isDir ? (
            expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <span className="w-3.5" />
          )}
        </span>

        {/* icon */}
        <span className="w-4 h-4 flex items-center justify-center shrink-0">
          {isDir && folderInfo ? (
            <folderInfo.Icon className={`w-4 h-4 ${folderInfo.color}`} />
          ) : fileInfo ? (
            <fileInfo.Icon className={`w-4 h-4 ${fileInfo.color}`} />
          ) : null}
        </span>

        <span className={`truncate ${isDir ? 'text-text font-[450]' : 'text-text-muted group-hover:text-text'}`}>
          {node.name}
        </span>
      </div>
      {isDir && expanded && node.children && (
        <div className="relative">
          {/* subtle guide line */}
          <div
            className="absolute top-0 bottom-0 w-px bg-border/40"
            style={{ left: `${level * 14 + 13}px` }}
          />
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              projectId={projectId}
              level={level + 1}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree({ projectId, rootPath }: FileTreeProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTree();
  }, [projectId]);

  const loadTree = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.fs.tree(projectId);
      setTree(data.tree as TreeNode[]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (path: string) => {
    // TODO: Open file in editor
    console.log('Open file:', path);
  };

  if (loading) {
    return <div className="p-4 text-text-muted text-sm flex items-center gap-2"><span className="w-3 h-3 border-2 border-text-muted/30 border-t-accent rounded-full animate-spin" /> Loading…</div>;
  }

  if (error) {
    return <div className="p-4 text-danger text-sm">{error}</div>;
  }

  if (tree.length === 0) {
    return <div className="p-4 text-text-muted text-sm text-center">No files</div>;
  }

  return (
    <div className="py-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
      {tree.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          projectId={projectId}
          level={0}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}
