import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useProject } from '../context/ProjectContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import Sidebar from '../components/Sidebar.tsx';
import ChatPanel from '../components/ChatPanel.tsx';
import FileTree from '../components/FileTree.tsx';
import FileEditor from '../components/FileEditor.tsx';
import Footer from '../components/Footer.tsx';

export default function Workspace() {
  const { project, setProject } = useProject();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Array<{ id: string; title: string; updatedAt: string }>>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [skills, setSkills] = useState<Array<{ name: string; description: string; enabled: boolean }>>([]);
  const [sidebarTab, setSidebarTab] = useState<'files' | 'conversations' | 'skills'>('files');
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [branches, setBranches] = useState<{ branches: string[]; current: string }>({ branches: [], current: '' });
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [branchSwitchError, setBranchSwitchError] = useState<string | null>(null);

  useEffect(() => {
    if (!project) {
      navigate('/project');
      return;
    }
    loadConversations();
    loadSkills();
    loadBranches();
  }, [project]);

  const loadConversations = async () => {
    if (!project) return;
    try {
      const data = await api.conversations.list(project.id);
      setConversations(data.conversations);
    } catch {
      // Ignore
    }
  };

  const loadSkills = async () => {
    if (!project) return;
    try {
      const data = await api.skills.list(project.id);
      setSkills(data.skills);
    } catch {
      // Ignore
    }
  };

  const loadBranches = async () => {
    if (!project) return;
    try {
      const data = await api.fs.gitBranches(project.id);
      setBranches(data);
    } catch {
      // Ignore
    }
  };

  const handleSwitchBranch = async (branch: string) => {
    if (!project) return;
    setBranchSwitchError(null);
    try {
      const data = await api.fs.gitCheckout(project.id, branch);
      setBranches(prev => ({ ...prev, current: data.branch }));
      // Update the project-level gitBranch so the header badge reflects the new branch
      setProject({ ...project, gitBranch: data.branch });
      setShowBranchMenu(false);
    } catch (err) {
      setBranchSwitchError((err as Error).message || 'Failed to switch branch');
    }
  };

  const createConversation = async () => {
    if (!project) return;
    try {
      const data = await api.conversations.create(project.id);
      setConversations(prev => [{ ...data.conversation, updatedAt: new Date().toISOString() }, ...prev]);
      setActiveConversation(data.conversation.id);
    } catch {
      // Ignore
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      await api.conversations.delete(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversation === id) {
        setActiveConversation(null);
      }
    } catch {
      // Ignore
    }
  };

  const handleTitleUpdate = (conversationId: string, title: string) => {
    setConversations(prev =>
      prev.map(c => c.id === conversationId ? { ...c, title } : c)
    );
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSidebarResize = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = Math.max(200, Math.min(400, e.clientX));
    setSidebarWidth(newWidth);
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      const handleUp = () => setIsResizing(false);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('mousemove', handleSidebarResize);
      return () => {
        window.removeEventListener('mouseup', handleUp);
        window.removeEventListener('mousemove', handleSidebarResize);
      };
    }
  }, [isResizing, handleSidebarResize]);

  return (
    <motion.div
      className="h-screen flex flex-col bg-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
        className="h-10 flex items-center justify-between px-4 bg-bg-secondary border-b border-border"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
          >
            <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-label="HipHopono logo">
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
            <span className="text-text-bright font-bold text-sm">HipHopono</span>
            {project && (
              <div className="relative">
                <button
                  onClick={() => setShowBranchMenu(!showBranchMenu)}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-bg-tertiary text-text-muted text-xs font-mono transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M6 1v2M6 9v2M1 6h2M9 6h2M2.5 2.5l1.5 1.5M8 8l1.5 1.5M2.5 9.5l1.5-1.5M8 4l1.5-1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                  </svg>
                  {project.gitBranch}
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M2 3l2 2 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {showBranchMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowBranchMenu(false)} />
                    <div className="absolute top-full left-0 mt-1 w-48 bg-bg-secondary border border-border rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                      <div className="p-1.5 text-xs text-text-muted font-medium border-b border-border">Branches</div>
                      {branchSwitchError && (
                        <div className="px-3 py-1.5 text-xs text-danger border-b border-border">{branchSwitchError}</div>
                      )}
                      {branches.branches.map(branch => (
                        <button
                          key={branch}
                          onClick={() => handleSwitchBranch(branch)}
                          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-bg-tertiary flex items-center gap-2 ${branch === branches.current ? 'text-accent' : 'text-text'}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 shrink-0" />
                          {branch}
                          {branch === branches.current && <span className="ml-auto text-xs opacity-60">current</span>}
                        </button>
                      ))}
                      {branches.branches.length === 0 && (
                        <div className="px-3 py-2 text-xs text-text-muted">No branches found</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </motion.div>
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
        >

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent text-xs font-bold shrink-0">
              {(user?.displayName || user?.username)?.[0]?.toUpperCase()}
            </div>
            <span className="text-text-muted text-xs">{user?.displayName || user?.username}</span>
          </div>
          <motion.button
            onClick={() => navigate('/setting')}
            className="text-text-muted hover:text-text text-xs"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            Settings
          </motion.button>
          <motion.button
            onClick={() => navigate('/project')}
            className="text-text-muted hover:text-text text-xs"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            Projects
          </motion.button>
          <motion.button
            onClick={handleLogout}
            className="text-text-muted hover:text-danger text-xs"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            Logout
          </motion.button>
        </motion.div>
      </motion.div>

      <motion.div
        className="flex-1 flex overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Sidebar
          width={sidebarWidth}
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          conversations={conversations}
          activeConversation={activeConversation}
          onSelectConversation={setActiveConversation}
          onCreateConversation={createConversation}
          onDeleteConversation={deleteConversation}
          skills={skills}
          onResizeStart={() => setIsResizing(true)}
        />

        {sidebarTab === 'files' && project && (
          <div
            className="border-r border-border overflow-y-auto bg-bg-secondary"
            style={{ width: sidebarWidth }}
          >
            <FileTree
              projectId={project.id}
              rootPath={project.absPath}
              selectedFile={selectedFile || undefined}
              onSelectFile={setSelectedFile}
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          {selectedFile && project ? (
            <motion.div
              className="flex-1 overflow-hidden border-l border-border"
              key="editor"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
            >
              <FileEditor
                projectId={project.id}
                filePath={selectedFile}
                onClose={() => setSelectedFile(null)}
              />
            </motion.div>
          ) : activeConversation ? (
            <motion.div
              className="flex-1 overflow-hidden"
              key="chat"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <ChatPanel
                conversationId={activeConversation}
                projectId={project?.id || ''}
                onTitleUpdate={handleTitleUpdate}
              />
            </motion.div>
          ) : (
            <motion.div
              className="h-full flex items-center justify-center"
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-center">
                <motion.p
                  className="text-text-muted mb-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  No conversation selected
                </motion.p>
                <motion.button
                  onClick={createConversation}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-bg font-medium rounded transition-colors text-sm"
                  whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(88,166,255,0.3)' }}
                  whileTap={{ scale: 0.95 }}
                >
                  New Conversation
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <Footer hasBackground />
    </motion.div>
  );
}
