import { Files, MessageSquare, Lightbulb } from 'lucide-react';
import FileTree from './FileTree.tsx';

interface SidebarProps {
  width: number;
  activeTab: 'files' | 'conversations' | 'skills';
  onTabChange: (tab: 'files' | 'conversations' | 'skills') => void;
  conversations: Array<{ id: string; title: string; updatedAt: string }>;
  activeConversation: string | null;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
  onDeleteConversation: (id: string) => void;
  skills: Array<{ name: string; description: string; enabled: boolean }>;
  onResizeStart: () => void;
  // File tree props (for files tab)
  projectId?: string;
  rootPath?: string;
  selectedFile?: string;
  onSelectFile?: (path: string) => void;
}

const ACTIVITY_BAR_WIDTH = 48;

type TabKey = 'files' | 'conversations' | 'skills';

const tabs: { key: TabKey; icon: React.ReactNode; label: string }[] = [
  { key: 'files', icon: <Files size={22} />, label: 'Explorer' },
  { key: 'conversations', icon: <MessageSquare size={22} />, label: 'Chat' },
  { key: 'skills', icon: <Lightbulb size={22} />, label: 'Skills' },
];

export default function Sidebar({
  width,
  activeTab,
  onTabChange,
  conversations,
  activeConversation,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  skills,
  onResizeStart,
  projectId,
  rootPath,
  selectedFile,
  onSelectFile,
}: SidebarProps) {
  const handleTabClick = (key: TabKey) => onTabChange(key);

  return (
    <div className="flex flex-col bg-bg-secondary" style={{ width }}>
      {/* Activity bar */}
      <div
        className="flex flex-col items-center py-2 shrink-0 border-r border-border"
        style={{ width: ACTIVITY_BAR_WIDTH }}
      >
        {tabs.map(({ key, icon, label }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => handleTabClick(key)}
              title={label}
              className={`relative w-full flex items-center justify-center py-3 transition-colors ${
                isActive ? 'text-text' : 'text-text-muted hover:text-text'
              }`}
            >
              {/* Active indicator line */}
              {isActive && (
                <span
                  className="absolute left-0 top-1 bottom-1 w-[2px] bg-accent rounded-r"
                />
              )}
              <span className={isActive ? 'opacity-100' : 'opacity-60'}>
                {icon}
              </span>
            </button>
          );
        })}

        <div className="flex-1" />

        {/* Bottom spacer icon */}
        <button className="p-1.5 text-text-muted/40 hover:text-text-muted transition-colors">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.07 4.93A10 10 0 1 0 22 12" />
          </svg>
        </button>
      </div>

      {/* Sidebar panel */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Panel header */}
        <div className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border shrink-0">
          {tabs.find(t => t.key === activeTab)?.label}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'files' && projectId && rootPath ? (
            <FileTree
              projectId={projectId}
              rootPath={rootPath}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
            />
          ) : (
            <div className="py-1">
              <p className="px-3 py-1 text-text-muted text-xs">
                Open a file to preview it here
              </p>
            </div>
          )}

          {activeTab === 'conversations' && (
            <div className="p-2">
              <button
                onClick={onCreateConversation}
                className="w-full mb-2 px-3 py-2 bg-bg-tertiary hover:bg-border text-text text-sm rounded transition-colors"
              >
                + New Conversation
              </button>
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    className={`group flex items-center justify-between px-3 py-2 rounded cursor-pointer text-sm ${
                      activeConversation === conv.id
                        ? 'bg-accent/20 text-accent'
                        : 'text-text hover:bg-bg-tertiary'
                    }`}
                  >
                    <span className="truncate">{conv.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="p-2">
              {skills.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-4">No skills found</p>
              ) : (
                <div className="space-y-1">
                  {skills.map((skill) => (
                    <div
                      key={skill.name}
                      className="px-3 py-2 bg-bg-tertiary rounded text-sm"
                    >
                      <div className="text-text font-medium">{skill.name}</div>
                      <div className="text-text-muted text-xs mt-1">{skill.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Resize handle */}
      <div
        className="h-1 cursor-row-resize hover:bg-accent transition-colors shrink-0"
        onMouseDown={onResizeStart}
      />
    </div>
  );
}
