import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api.ts';
import ToolCallBlock from './ToolCallBlock.tsx';
import ApprovalModal from './ApprovalModal.tsx';
import MarkdownRenderer from './MarkdownRenderer.tsx';
import InteractiveNebulaShader from './ui/InteractiveNebulaShader.tsx';

interface ChatPanelProps {
  conversationId: string;
  projectId: string;
}

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

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: Array<{ id: string; name: string; args: Record<string, unknown>; status?: string; output?: string; diff?: FileDiff | null; filePath?: string }>;
  createdAt: string;
}

interface ChatEvent {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  args?: Record<string, unknown>;
  ok?: boolean;
  output?: string;
  tokensIn?: number;
  tokensOut?: number;
  message?: string;
  messageId?: string;
  kind?: string;
  detail?: string;
  diff?: FileDiff | null;
  filePath?: string;
}

interface ApprovalRequest {
  id: string;
  kind: string;
  detail: string;
}

const BUILTIN_COMMANDS = [
  { name: '/help', desc: 'Show available commands' },
  { name: '/clear', desc: 'Clear terminal output' },
  { name: '/skills', desc: 'List available skills' },
  { name: '/model', desc: 'Show current model' },
  { name: '/new', desc: 'New conversation' },
  { name: '/history', desc: 'Command history' },
];

export default function ChatPanel({ conversationId, projectId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [approvalRequest, setApprovalRequest] = useState<ApprovalRequest | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [streamingToolCalls, setStreamingToolCalls] = useState<Array<{ id: string; name: string; args: Record<string, unknown>; status?: string; output?: string; diff?: FileDiff | null; filePath?: string }>>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showHelp, setShowHelp] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadMessages();
  }, [conversationId]);

  useEffect(() => {
    outputRef.current?.scrollTo(0, outputRef.current.scrollHeight);
  }, [messages, streamingText]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [input]);

  const loadMessages = async () => {
    try {
      const data = await api.conversations.messages(conversationId);
      setMessages(data.messages as Message[]);
    } catch {
      // Ignore
    }
  };

  const handleCommand = (cmd: string): boolean => {
    const trimmed = cmd.trim();

    if (trimmed === '/help') {
      setShowHelp(true);
      return true;
    }

    if (trimmed === '/clear') {
      setMessages([]);
      setStreamingText('');
      setStreamingToolCalls([]);
      return true;
    }

    if (trimmed === '/skills') {
      const helpMsg: Message = {
        id: `cmd-${Date.now()}`,
        role: 'assistant',
        content: 'Loading skills...',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, helpMsg]);
      return false; // Let it pass through to AI
    }

    if (trimmed === '/model') {
      const modelMsg: Message = {
        id: `cmd-${Date.now()}`,
        role: 'assistant',
        content: 'Use the Settings page to view/change the model configuration.',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, modelMsg]);
      return true;
    }

    if (trimmed === '/new') {
      window.location.reload();
      return true;
    }

    if (trimmed === '/history') {
      const historyMsg: Message = {
        id: `cmd-${Date.now()}`,
        role: 'assistant',
        content: commandHistory.length > 0
          ? commandHistory.map((h, i) => `${i + 1}. ${h}`).join('\n')
          : 'No command history yet.',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, historyMsg]);
      return true;
    }

    return false;
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const cmd = input.trim();
    setInput('');
    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);

    // Handle built-in commands
    if (cmd.startsWith('/')) {
      const handled = handleCommand(cmd);
      if (handled) return;
    }

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: cmd,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamingText('');
    setStreamingToolCalls([]);

    abortRef.current = new AbortController();

    try {
      const stream = api.chat.send(
        conversationId,
        projectId,
        userMessage.content,
        abortRef.current.signal
      );

      let finalText = '';
      const toolCalls: Array<{ id: string; name: string; args: Record<string, unknown>; status?: string; output?: string; diff?: FileDiff | null; filePath?: string }> = [];
      let lastMessageId = '';

      for await (const event of stream) {
        const e = event as ChatEvent;

        switch (e.type) {
          case 'text_delta':
            finalText += e.text || '';
            setStreamingText(finalText);
            break;

          case 'tool_call':
            toolCalls.push({
              id: e.id || '',
              name: e.name || '',
              args: e.args || {},
              status: 'running',
            });
            setStreamingToolCalls([...toolCalls]);
            break;

          case 'tool_result':
            const tcIndex = toolCalls.findIndex(tc => tc.id === e.id);
            if (tcIndex >= 0) {
              toolCalls[tcIndex].status = e.ok ? 'done' : 'error';
              toolCalls[tcIndex].output = e.output || '';
              toolCalls[tcIndex].diff = e.diff ?? null;
              toolCalls[tcIndex].filePath = e.filePath;
              setStreamingToolCalls([...toolCalls]);
            }
            break;

          case 'approval_request':
            setApprovalRequest({
              id: e.id || '',
              kind: e.kind || '',
              detail: e.detail || '',
            });
            break;

          case 'error':
            setStreamingText(prev => prev + `\n\nError: ${e.message}`);
            break;

          case 'done':
            if (e.messageId) lastMessageId = e.messageId;
            break;
        }
      }

      if (finalText) {
        setMessages(prev => [...prev, {
          id: lastMessageId || `msg-${Date.now()}`,
          role: 'assistant',
          content: finalText,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          createdAt: new Date().toISOString(),
        }]);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setStreamingText(`Error: ${(err as Error).message}`);
      }
    } finally {
      setIsStreaming(false);
      setStreamingText('');
      setStreamingToolCalls([]);
    }
  };

  const handleApproval = async (decision: string) => {
    if (!approvalRequest) return;
    try {
      await api.chat.approve(approvalRequest.id, decision);
      setApprovalRequest(null);
    } catch {
      // Ignore
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'c' && e.ctrlKey) {
      handleStop();
    }
  };

  return (
    <div className="h-full flex flex-col font-mono relative overflow-hidden bg-[#050a14]">
      {/* Nebula background — chat area only (not side sections) */}
      <InteractiveNebulaShader className="absolute inset-0" />
      {/* Subtle veil for readability without hiding nebula */}
      <div className="absolute inset-0 bg-[#0d1117]/35 pointer-events-none" aria-hidden />
      {/* Output area */}
      <div ref={outputRef} className="relative z-10 flex-1 overflow-y-auto p-4 space-y-1">
        {showHelp && (
          <div className="mb-4 p-3 bg-bg-secondary border border-border rounded">
            <div className="text-accent font-bold mb-2">Available Commands:</div>
            {BUILTIN_COMMANDS.map(cmd => (
              <div key={cmd.name} className="flex gap-4 text-sm">
                <span className="text-text-bright w-24">{cmd.name}</span>
                <span className="text-text-muted">{cmd.desc}</span>
              </div>
            ))}
            <div className="mt-2 text-text-muted text-xs">
              Type any message to chat with the AI. Use ↑/↓ for command history. Ctrl+C to stop.
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="text-sm">
            {msg.role === 'user' ? (
              <div className="flex">
                <span className="text-accent mr-2">{'>'}</span>
                <span className="text-text-bright whitespace-pre-wrap">{msg.content}</span>
              </div>
            ) : (
              <div className="ml-0">
                <div className="text-text leading-relaxed">
                  <MarkdownRenderer content={msg.content} />
                </div>
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {msg.toolCalls.map((tc) => (
                      <ToolCallBlock key={tc.id} toolCall={tc} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {streamingText && (
          <div className="text-sm">
            <div className="text-text leading-relaxed">
              <MarkdownRenderer content={streamingText} />
            </div>
          </div>
        )}

        {streamingToolCalls.length > 0 && (
          <div className="space-y-1 text-sm">
            {streamingToolCalls.map((tc) => (
              <ToolCallBlock key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {isStreaming && (
          <div className="text-text-muted text-sm animate-pulse">...</div>
        )}
      </div>

      {/* Input area — keep above nebula, semi-transparent with blur */}
      <div className="relative z-10 border-t border-border bg-[#0d1117]/80 backdrop-blur-sm p-4">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl border border-border bg-bg-secondary transition-colors focus-within:border-accent/60">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              className="w-full bg-transparent px-4 pt-3 pb-1 text-sm text-text placeholder-text-muted focus:outline-none resize-none overflow-y-auto max-h-[160px] leading-relaxed"
              disabled={isStreaming}
              autoFocus
            />
            <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
              <span className="text-[11px] text-text-muted select-none">
                Enter to send, Shift + Enter for new line
              </span>
              {isStreaming ? (
                <button
                  onClick={handleStop}
                  aria-label="Stop"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-danger text-white transition-opacity hover:opacity-90"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <rect x="2" y="2" width="8" height="8" rx="1.5" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  aria-label="Send"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-text-bright text-bg transition-opacity hover:opacity-90 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 14V2M2.5 7.5L8 2l5.5 5.5" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {approvalRequest && (
        <ApprovalModal
          request={approvalRequest}
          onApprove={() => handleApproval('approve')}
          onReject={() => handleApproval('reject')}
        />
      )}
    </div>
  );
}
