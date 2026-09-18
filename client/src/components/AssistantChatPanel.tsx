import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api.ts';
import ToolCallBlock from './ToolCallBlock.tsx';
import ApprovalModal from './ApprovalModal.tsx';
import MarkdownRenderer from './MarkdownRenderer.tsx';
import InteractiveNebulaShader from './ui/InteractiveNebulaShader.tsx';

interface AssistantChatPanelProps {
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

const QUICK_ACTIONS = [
  { label: 'Create a file', prompt: 'Create a new file named hello.txt with some example content' },
  { label: 'Install a program', prompt: 'Install express with npm install express' },
  { label: 'List files', prompt: 'List all files in the current project directory' },
  { label: 'Run a command', prompt: 'Run `npm --version` and show me the output' },
  { label: 'Create folder', prompt: 'Create a new folder called my-new-folder' },
  { label: 'Git status', prompt: 'Show me the current git status' },
];

const BUILTIN_COMMANDS = [
  { name: '/help', desc: 'Show available commands' },
  { name: '/clear', desc: 'Clear chat' },
];

export default function AssistantChatPanel({ conversationId, projectId }: AssistantChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [approvalRequest, setApprovalRequest] = useState<ApprovalRequest | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [streamingToolCalls, setStreamingToolCalls] = useState<Array<{ id: string; name: string; args: Record<string, unknown>; status?: string; output?: string; diff?: FileDiff | null; filePath?: string }>>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadMessages();
  }, [conversationId]);

  useEffect(() => {
    outputRef.current?.scrollTo(0, outputRef.current.scrollHeight);
  }, [messages, streamingText, streamingToolCalls]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [conversationId]);

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
      // ignore
    }
  };

  const sendPrompt = (prompt: string) => {
    setInput(prompt);
    setTimeout(() => {
      // trigger send after state updates - use direct call
      void doSend(prompt);
    }, 0);
  };

  const doSend = async (rawInput: string) => {
    const content = rawInput.trim();
    if (!content || isStreaming) return;
    if (content === '/clear') {
      setMessages([]);
      setStreamingText('');
      setStreamingToolCalls([]);
      setInput('');
      return;
    }
    if (content === '/help') {
      setShowHelp(v => !v);
      setInput('');
      return;
    }

    setInput('');
    setCommandHistory(prev => [...prev, content]);
    setHistoryIndex(-1);

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamingText('');
    setStreamingToolCalls([]);
    abortRef.current = new AbortController();
    try {
      const stream = api.chat.send(conversationId, projectId, content, abortRef.current.signal);
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
            toolCalls.push({ id: e.id || '', name: e.name || '', args: e.args || {}, status: 'running' });
            setStreamingToolCalls([...toolCalls]);
            break;
          case 'tool_result': {
            const idx = toolCalls.findIndex(tc => tc.id === e.id);
            if (idx >= 0) {
              toolCalls[idx].status = e.ok ? 'done' : 'error';
              toolCalls[idx].output = e.output || '';
              toolCalls[idx].diff = e.diff ?? null;
              toolCalls[idx].filePath = e.filePath;
              setStreamingToolCalls([...toolCalls]);
            }
            break;
          }
          case 'approval_request':
            setApprovalRequest({ id: e.id || '', kind: e.kind || '', detail: e.detail || '' });
            break;
          case 'error':
            setStreamingText(prev => prev + `\n\nError: ${e.message}`);
            break;
          case 'done':
            if (e.messageId) lastMessageId = e.messageId;
            break;
        }
      }
      if (finalText || toolCalls.length > 0) {
        setMessages(prev => [...prev, {
          id: lastMessageId || `msg-${Date.now()}`,
          role: 'assistant',
          content: finalText || '_Tool execution finished._',
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

  const sendMessage = () => doSend(input);

  const handleApproval = async (decision: string) => {
    if (!approvalRequest) return;
    try {
      await api.chat.approve(approvalRequest.id, decision);
      setApprovalRequest(null);
    } catch { /* ignore */ }
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
      {/* Nebula background — same as ChatPanel for visual parity */}
      <InteractiveNebulaShader className="absolute inset-0" />
      <div className="absolute inset-0 bg-[#0d1117]/35 pointer-events-none" aria-hidden />

      {/* Header hint */}
      <div className="relative z-10 border-b border-border/60 bg-[#0d1117]/60 backdrop-blur-sm px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-sm font-semibold text-text-bright">Task Assistant</h2>
          <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
            Chat naturally to get things done — no manual coding. Try: install a package, create a file, run a command.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {QUICK_ACTIONS.map(a => (
              <button
                key={a.label}
                onClick={() => sendPrompt(a.prompt)}
                disabled={isStreaming}
                className="px-2.5 py-1 rounded-full text-xs bg-bg-secondary border border-border text-text-muted hover:text-text hover:border-accent/40 hover:bg-bg-tertiary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Output area */}
      <div ref={outputRef} className="relative z-10 flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !streamingText && streamingToolCalls.length === 0 && (
          <div className="max-w-3xl mx-auto">
            <div className="rounded-xl border border-border bg-bg-secondary/70 backdrop-blur-sm p-5">
              <div className="text-sm text-text-bright font-medium mb-2">How I can help</div>
              <ul className="text-xs text-text-muted space-y-1 leading-relaxed list-disc list-inside">
                <li>Say <span className="text-text font-mono">“install lodash”</span> — I&apos;ll run the install command for you.</li>
                <li>Say <span className="text-text font-mono">“create a file config.json with ...”</span> — I&apos;ll create it in your project.</li>
                <li>Say <span className="text-text font-mono">“run npm run build”</span> or any shell command — I&apos;ll execute it.</li>
                <li>All actions ask for approval first (unless auto-approve is on in Settings).</li>
              </ul>
              <div className="mt-3 text-[11px] text-text-muted/70">Tip: press Enter to send, Shift+Enter for new line.</div>
            </div>
          </div>
        )}

        {showHelp && (
          <div className="max-w-3xl mx-auto p-3 bg-bg-secondary border border-border rounded">
            <div className="text-accent font-bold mb-2 text-xs">Available Commands:</div>
            {BUILTIN_COMMANDS.map(cmd => (
              <div key={cmd.name} className="flex gap-4 text-sm">
                <span className="text-text-bright w-24 font-mono text-xs">{cmd.name}</span>
                <span className="text-text-muted text-xs">{cmd.desc}</span>
              </div>
            ))}
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className="text-sm max-w-3xl mx-auto w-full">
            {msg.role === 'user' ? (
              <div className="flex justify-end">
                <div className="max-w-[78%] rounded-2xl border border-white/15 bg-[#161b22]/55 backdrop-blur-md px-4 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
                  <div className="flex gap-2.5">
                    <span className="text-accent select-none leading-relaxed">{'>'}</span>
                    <span className="text-text-bright whitespace-pre-wrap leading-relaxed flex-1 break-words">{msg.content}</span>
                  </div>
                  <div className="text-[11px] text-text-muted/60 mt-2 text-right font-mono">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="ml-0">
                <div className="text-text leading-relaxed">
                  <MarkdownRenderer content={msg.content} />
                </div>
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {msg.toolCalls.map(tc => (
                      <ToolCallBlock key={tc.id} toolCall={tc} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {streamingText && (
          <div className="text-sm max-w-3xl mx-auto w-full">
            <div className="text-text leading-relaxed">
              <MarkdownRenderer content={streamingText} />
            </div>
          </div>
        )}

        {streamingToolCalls.length > 0 && (
          <div className="space-y-1 text-sm max-w-3xl mx-auto w-full">
            {streamingToolCalls.map(tc => (
              <ToolCallBlock key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {isStreaming && (
          <div className="text-text-muted text-sm animate-pulse max-w-3xl mx-auto w-full">...</div>
        )}
      </div>

      {/* Input area — identical styling to ChatPanel:22 */}
      <div className="relative z-10 border-t border-border bg-[#0d1117]/80 backdrop-blur-sm p-4">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl border border-border bg-bg-secondary transition-colors focus-within:border-accent/60">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me to install something, create a file, run a command…"
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
