import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import AssistantChatPanel from '../components/AssistantChatPanel.tsx';

/**
 * Assistant page — new section/tab for no-code task execution.
 * Matches ChatPanel background + input styling (nebula + rounded input).
 * User chats naturally: "install X", "create file Y", etc.
 * Accessible via /assistant (also linked from Workspace top bar and Settings).
 */
export default function Assistant() {
  const { project } = useProject();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Array<{ id: string; title: string; updatedAt: string }>>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);

  useEffect(() => {
    if (!project) {
      // still allow viewing Assistant without project, but prompt to pick one
      loadConversations();
    } else {
      loadConversations();
    }
  }, [project]);

  const loadConversations = async () => {
    if (!project) return;
    try {
      const data = await api.conversations.list(project.id);
      setConversations(data.conversations);
      if (data.conversations.length > 0 && !activeConversation) {
        setActiveConversation(data.conversations[0].id);
      }
    } catch { /* ignore */ }
  };

  const createConversation = async () => {
    if (!project) return;
    try {
      const data = await api.conversations.create(project.id, 'Assistant');
      setConversations(prev => [{ ...data.conversation, updatedAt: new Date().toISOString() } as never, ...prev]);
      setActiveConversation(data.conversation.id);
    } catch { /* ignore */ }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // No project selected state — friendly picker
  if (!project) {
    return (
      <div className="h-screen flex flex-col bg-bg">
        <div className="h-10 flex items-center justify-between px-4 bg-bg-secondary border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-text-bright font-bold text-sm">HipHopono</span>
            <span className="text-text-muted text-xs">Assistant</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-text-muted text-xs">{user?.username}</span>
            <button onClick={() => navigate('/workspace')} className="text-text-muted hover:text-text text-xs">Workspace</button>
            <button onClick={() => navigate('/project')} className="text-text-muted hover:text-text text-xs">Projects</button>
            <button onClick={() => navigate('/setting')} className="text-text-muted hover:text-text text-xs">Settings</button>
            <button onClick={handleLogout} className="text-text-muted hover:text-danger text-xs">Logout</button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center border border-border bg-bg-secondary rounded-xl p-8">
            <h2 className="text-text-bright font-semibold mb-2">No project selected</h2>
            <p className="text-text-muted text-sm mb-4 leading-relaxed">
              The Assistant needs a project to work in — that&apos;s where files are created and commands run.
            </p>
            <button
              onClick={() => navigate('/project')}
              className="px-5 py-2 bg-accent hover:bg-accent-hover text-bg font-medium rounded transition-colors text-sm"
            >
              Choose project
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-bg">
      {/* Top bar — same style as Workspace, adds Assistant active state */}
      <div className="h-10 flex items-center justify-between px-4 bg-bg-secondary border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-text-bright font-bold text-sm">HipHopono</span>
          <span className="text-text-muted text-xs font-mono">
            {project.name} ({project.gitBranch})
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-accent/15 border border-accent/20 text-accent text-[11px] font-medium">
            Assistant
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-text-muted text-xs hidden sm:inline">{user?.username}</span>
          <button
            onClick={() => navigate('/workspace')}
            className="text-text-muted hover:text-text text-xs"
          >
            Workspace
          </button>
          <button
            className="text-accent text-xs font-medium"
            aria-current="page"
          >
            Assistant
          </button>
          <button
            onClick={() => navigate('/setting')}
            className="text-text-muted hover:text-text text-xs"
          >
            Settings
          </button>
          <button
            onClick={() => navigate('/project')}
            className="text-text-muted hover:text-text text-xs"
          >
            Projects
          </button>
          <button
            onClick={handleLogout}
            className="text-text-muted hover:text-danger text-xs"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left narrow sidebar — conversations + new chat */}
        <div className="w-[260px] hidden md:flex flex-col bg-bg-secondary border-r border-border">
          <div className="p-3 border-b border-border">
            <button
              onClick={createConversation}
              className="w-full px-3 py-2 bg-accent hover:bg-accent-hover text-bg font-medium rounded transition-colors text-sm"
            >
              + New Assistant Chat
            </button>
            <p className="text-[11px] text-text-muted mt-2 leading-relaxed">
              Each chat keeps its own history. The AI can create files and run commands in <span className="text-text font-mono">{project.name}</span>.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <p className="text-text-muted text-xs text-center py-6">No chats yet</p>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversation(conv.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm truncate transition-colors ${
                    activeConversation === conv.id
                      ? 'bg-accent/20 text-accent border border-accent/20'
                      : 'text-text hover:bg-bg-tertiary border border-transparent'
                  }`}
                >
                  {conv.title || 'Assistant'}
                </button>
              ))
            )}
          </div>
          <div className="p-3 border-t border-border">
            <button
              onClick={() => navigate('/workspace')}
              className="w-full px-3 py-2 bg-bg-tertiary hover:bg-border text-text rounded transition-colors text-xs"
            >
              ← Back to Workspace
            </button>
          </div>
        </div>

        {/* Main chatbot — same background + input styling as ChatPanel */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Mobile conversation switcher */}
          <div className="md:hidden flex items-center gap-2 p-2 border-b border-border bg-bg-secondary">
            <button
              onClick={createConversation}
              className="px-3 py-1.5 bg-accent text-bg rounded text-xs font-medium"
            >
              + New
            </button>
            <select
              value={activeConversation || ''}
              onChange={e => setActiveConversation(e.target.value || null)}
              className="flex-1 px-2 py-1.5 bg-bg-tertiary border border-border rounded text-text text-xs"
            >
              <option value="">Select a chat…</option>
              {conversations.map(c => (
                <option key={c.id} value={c.id}>{c.title || 'Assistant'}</option>
              ))}
            </select>
          </div>

          {activeConversation ? (
            <AssistantChatPanel conversationId={activeConversation} projectId={project.id} />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-[#050a14] relative overflow-hidden">
              <div className="absolute inset-0 bg-[#0d1117]/35 pointer-events-none" aria-hidden />
              <div className="relative z-10 text-center p-6">
                <p className="text-text-muted text-sm mb-4">No conversation selected</p>
                <button
                  onClick={createConversation}
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-bg font-medium rounded transition-colors text-sm"
                >
                  Start Assistant Chat
                </button>
                <p className="text-[11px] text-text-muted/60 mt-3">Example: &quot;Install axios&quot; or &quot;Create a file notes.md&quot;</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
