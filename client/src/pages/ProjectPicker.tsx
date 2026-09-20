import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.tsx';
import { useProject } from '../context/ProjectContext.tsx';
import { api } from '../lib/api.ts';
import { BackgroundPaths } from '../components/ui/background-paths.tsx';
import { FileExplorer } from '../components/FileExplorer.tsx';

interface Project {
  id: string;
  name: string;
  absPath: string;
  gitBranch: string;
  lastUsedAt: string;
}

export default function ProjectPicker() {
  const { user, logout } = useAuth();
  const { setProject } = useProject();
  const navigate = useNavigate();

  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileExplorerOpen, setFileExplorerOpen] = useState(false);

  useEffect(() => {
    loadRecent();
  }, []);

  const loadRecent = async () => {
    try {
      const data = await api.project.recent();
      setRecentProjects(data.projects);
    } catch {
      // Ignore
    }
  };

  const openProject = async (path: string) => {
    setLoading(true);
    setError('');
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

  const editProject = async (project: Project) => {
    const newName = prompt('Edit project name:', project.name);
    if (newName !== null && newName.trim() !== '' && newName !== project.name) {
      try {
        await api.project.rename(project.id, newName.trim());
        setRecentProjects((prev) =>
          prev.map((p) => (p.id === project.id ? { ...p, name: newName.trim() } : p))
        );
      } catch (err) {
        setError((err as Error).message);
      }
    }
  };

  const deleteProject = async (project: Project) => {
    if (!confirm(`Remove "${project.name}" from recent projects?`)) return;
    try {
      await api.project.remove(project.id);
      setRecentProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <motion.div
      className="relative min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <BackgroundPaths />
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="w-full max-w-2xl p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <motion.div
            className="flex justify-between items-center mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <div>
              <motion.h1
                className="text-2xl font-bold text-text-bright"
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                HipHopono
              </motion.h1>
              <p className="text-text-muted text-sm">Open a project to get started</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-text-muted text-sm">{user?.username}</span>
              <motion.button
                onClick={() => navigate('/setting')}
                className="text-text-muted hover:text-text text-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Settings
              </motion.button>
              <motion.button
                onClick={logout}
                className="text-text-muted hover:text-danger text-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Logout
              </motion.button>
            </div>
          </motion.div>

          {error && (
            <motion.div
              className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded text-danger text-sm"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              {error}
            </motion.div>
          )}

          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
          >
            <motion.button
              onClick={() => setFileExplorerOpen(true)}
              disabled={loading}
              className="w-full px-4 py-3 bg-accent hover:bg-accent-hover text-bg font-medium rounded transition-colors disabled:opacity-50"
              whileHover={{ scale: !loading ? 1.02 : 1, boxShadow: !loading ? '0 0 20px rgba(88,166,255,0.3)' : 'none' }}
              whileTap={{ scale: !loading ? 0.98 : 1 }}
            >
              Browse & Open Project
            </motion.button>
          </motion.div>

          {recentProjects.length > 0 && (
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <h2 className="text-sm font-medium text-text-muted mb-2">Recent projects</h2>
              <div className="space-y-1">
                {recentProjects.map((project, i) => (
                  <motion.div
                    key={project.id}
                    className="flex items-center gap-2 p-3 bg-bg-secondary hover:bg-bg-tertiary border border-border rounded transition-colors group"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: 0.3 + i * 0.05 }}
                    whileHover={{ backgroundColor: 'rgba(33,38,45,0.8)', borderColor: 'rgba(88,166,255,0.2)' }}
                  >
                    <button
                      onClick={() => openProject(project.absPath)}
                      className="flex-1 text-left"
                      disabled={loading}
                    >
                      <div className="text-text font-medium">{project.name}</div>
                      <div className="text-text-muted text-xs font-mono">{project.absPath}</div>
                      <div className="text-text-muted text-xs mt-1">branch: {project.gitBranch}</div>
                    </button>
                    <motion.button
                      onClick={() => editProject(project)}
                      className="p-2 text-text-muted hover:text-text opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-bg-tertiary"
                      title="Edit project"
                      disabled={loading}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </motion.button>
                    <motion.button
                      onClick={() => deleteProject(project)}
                      className="p-2 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-bg-tertiary"
                      title="Remove from recent"
                      disabled={loading}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      <FileExplorer
        isOpen={fileExplorerOpen}
        onClose={() => setFileExplorerOpen(false)}
        onSelect={openProject}
      />
    </motion.div>
  );
}
