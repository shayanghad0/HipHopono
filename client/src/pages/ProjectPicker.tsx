import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext.tsx';
import { useProject } from '../context/ProjectContext.tsx';
import { api } from '../lib/api.ts';
import { FileExplorer } from '../components/FileExplorer.tsx';
import { BackgroundPaths } from '../components/ui/background-paths.tsx';

interface Project {
  id: string;
  name: string;
  absPath: string;
  gitBranch: string;
  lastUsedAt: string;
}

const container = { exit: { opacity: 0, y: -20 } };
const item = {
  initial: { opacity: 0, y: 16 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' as const }
  })
};

export default function ProjectPicker() {
  const { user, logout } = useAuth();
  const { setProject } = useProject();
  const navigate = useNavigate();

  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileExplorerOpen, setFileExplorerOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => { loadRecent(); }, []);

  const loadRecent = async () => {
    try {
      const data = await api.project.recent();
      setRecentProjects(data.projects);
    } catch { /* ignore */ }
  };

  const openProject = async (path: string) => {
    setLoading(true); setError('');
    try {
      const data = await api.project.open(path);
      setProject(data.project);
      navigate('/workspace');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async (id: string, patch: Partial<Project>) => {
    if (patch.name && !(patch.name as string).trim()) return;
    try {
      if (patch.name) await api.project.rename(id, patch.name.trim());
      setRecentProjects(prev => prev.map(p => p.id === id ? { ...p, ...patch, name: patch.name || p.name } : p));
    } catch (err) {
      setError((err as Error).message);
    }
    setRenamingId(null);
  };

  const deleteProject = async (project: Project) => {
    if (!confirm(`Remove "${project.name}"?`)) return;
    try {
      await api.project.remove(project.id);
      setRecentProjects(prev => prev.filter(p => p.id !== project.id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso), now = new Date();
    const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const headerBtn = "px-3 py-1.5 text-text-muted hover:text-text text-xs font-medium rounded-md hover:bg-white/5 transition-all";

  return (
    <div className="relative min-h-screen bg-[#0d1117] overflow-hidden">
      <BackgroundPaths />

      {/* ── Top bar ── */}
      <header className="relative z-10 h-12 border-b border-white/10 bg-black/20 backdrop-blur-xl flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" stroke-linecap="round" stroke-linejoin="round" aria-label="HipHopono logo">
              <g transform="rotate(-45 12 12)">
                <path d="M5 9h10v6H5z"/>
                <path d="M14 8h3v8h-3z"/>
                <path d="M17 12h3.5"/>
                <path d="M5 12H2"/>
                <path d="M2 10.5v3"/>
                <circle cx="21" cy="14" r="0.6"/>
                <circle cx="22.5" cy="10.5" r="0.6"/>
              </g>
            </svg>
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">HipHopono</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold shrink-0">
              {(user?.displayName || user?.username)?.[0]?.toUpperCase()}
            </div>
            <span className="text-white/40 text-xs font-mono">{user?.displayName || user?.username}</span>
          </div>
          <button onClick={() => navigate('/setting')} className={headerBtn}>Settings</button>
          <button onClick={() => logout().then(() => navigate('/login'))} className="text-red-400/70 hover:text-red-400 text-xs font-medium px-3 py-1.5 rounded-md hover:bg-red-500/10 transition-all">Logout</button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="relative z-10 flex items-start justify-center px-6 pt-16 pb-20">
        <motion.div
          className="w-full max-w-2xl"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={container.exit}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {/* Hero */}
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
              Welcome back
            </h1>
            <p className="text-white/50 text-base">
              Open a project to continue working
            </p>
          </motion.div>

          {/* ── Action button ── */}
          <motion.div
            className="flex justify-center mb-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.35 }}
          >
            <button
              onClick={() => setFileExplorerOpen(true)}
              disabled={loading}
              className="group relative flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-60 text-white font-semibold text-base rounded-xl transition-all shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
              </svg>
              Open Folder
              <svg className="w-4 h-4 ml-1 opacity-60 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
            </button>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-3"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </motion.div>
          )}

          {/* ── Divider + heading ── */}
          {recentProjects.length > 0 && (
            <motion.div
              className="flex items-center gap-4 mb-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-white/30 text-xs uppercase tracking-widest font-semibold">Recent Projects</span>
              <div className="h-px flex-1 bg-white/10" />
            </motion.div>
          )}

          {/* ── Project list ── */}
          <motion.ul className="space-y-2.5" variants={container} initial="initial" animate="animate" exit="exit">
            {recentProjects.map((project, i) => (
              <motion.li
                key={project.id}
                variants={item}
                custom={i}
                layout
              >
                <div className="group relative">
                  {/* Glow on hover */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative flex items-center gap-4 p-4 bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/20 rounded-xl transition-all cursor-pointer"
                    onClick={() => openProject(project.absPath)}
                  >
                    {/* Icon */}
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {renamingId === project.id ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onBlur={() => updateProject(project.id, { name: renameValue })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') updateProject(project.id, { name: renameValue });
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          onClick={e => e.stopPropagation()}
                          className="w-full px-2 py-1 bg-white/10 border border-blue-500/50 rounded text-white text-sm focus:outline-none"
                        />
                      ) : (
                        <>
                          <div className="text-white font-semibold text-base truncate">{project.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-white/40 text-xs font-mono truncate max-w-[60%]">{project.absPath}</span>
                            <span className="text-white/20 text-xs">·</span>
                            <span className="text-white/40 text-xs font-mono flex items-center gap-1.5">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
                              </svg>
                              {project.gitBranch}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Meta + Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-white/30 text-xs hidden sm:block">{formatDate(project.lastUsedAt)}</span>

                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); setRenamingId(project.id); setRenameValue(project.name); }}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
                          title="Rename"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
                          </svg>
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); deleteProject(project); }}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
                          title="Remove"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.li>
            ))}
          </motion.ul>

          {/* Empty state */}
          {recentProjects.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center py-20"
            >
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
                  <path d="M12 12v.01"/>
                </svg>
              </div>
              <p className="text-white/50 text-base font-medium mb-1">No projects yet</p>
              <p className="text-white/30 text-sm">Open a folder to get started</p>
            </motion.div>
          )}
        </motion.div>
      </main>

      <FileExplorer isOpen={fileExplorerOpen} onClose={() => setFileExplorerOpen(false)} onSelect={openProject} />
    </div>
  );
}
