import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useProject } from '../context/ProjectContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import Sidebar from '../components/Sidebar.tsx';
import ChatPanel from '../components/ChatPanel.tsx';
import FileTree from '../components/FileTree.tsx';
import Notifications from '../components/ui/notifications.tsx';

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

  useEffect(() => {
    if (!project) {
      navigate('/project');
      return;
    }
    loadConversations();
    loadSkills();
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
          <span className="text-text-bright font-bold text-sm">HipHopono</span>
          {project && (
            <motion.span
              className="text-text-muted text-xs font-mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              {project.name} ({project.gitBranch})
            </motion.span>
          )}
        </motion.div>
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
        >
          <Notifications
            notifications={[
              { id: 1, type: "success", message: "Server connected", timestamp: "Just now" },
              { id: 2, type: "message", message: "Welcome to HipHopono", timestamp: "1m ago" },
            ]}
          />
          <span className="text-text-muted text-xs">{user?.username}</span>
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
            <FileTree projectId={project.id} rootPath={project.absPath} />
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeConversation ? (
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
    </motion.div>
  );
}
