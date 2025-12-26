import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Message } from '../store/chatStore';

// Type assertions for third-party components
const SyntaxHighlighterComponent = SyntaxHighlighter as any;
const ReactMarkdownComponent = ReactMarkdown as any;

interface MessageListProps {
  messages: Message[];
  currentMessage: string;
  onEdit?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onResend?: (messageId: string, content: string) => void;
}

const cleanContent = (content: string) => {
  // Remove tool_call tags and incomplete tool syntax
  let cleaned = content
    .replace(/<tool_call>[\s\S]*$/i, '')
    .replace(/<function=[^>]*$/i, '')
    .trim();

  // If content is wrapped in markdown code block, extract it
  const markdownBlockMatch = cleaned.match(/^```markdown\n([\s\S]*?)\n```$/);
  if (markdownBlockMatch) {
    cleaned = markdownBlockMatch[1];
  }

  return cleaned;
};

const hasToolExecution = (content: string) => {
  return /<tool_call>|<function=/.test(content);
};

interface MessageActionsProps {
  message: Message;
  isUser: boolean;
  onEdit?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onResend?: (messageId: string, content: string) => void;
}

function MessageActions({
  message,
  isUser,
  onEdit,
  onRegenerate,
  onDelete,
  onResend,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = () => {
    if (isEditing) {
      onEdit?.(message.id, editContent);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleResend = () => {
    onResend?.(message.id, editContent);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleRegenerate = () => {
    onRegenerate?.(message.id);
  };

  const handleDelete = () => {
    if (confirm('Delete this message?')) {
      onDelete?.(message.id);
    }
  };

  const iconClass = `w-4 h-4 cursor-pointer transition-opacity hover:opacity-70 ${isUser ? 'text-white' : 'text-gray-600'}`;

  if (isEditing) {
    return (
      <div
        className="mt-2 pt-2 border-t border-opacity-20"
        style={{ borderColor: isUser ? 'white' : '#e5e7eb' }}
      >
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full p-2 border rounded text-sm text-gray-900 bg-white"
          rows={3}
        />
        <div className="flex gap-2 mt-2">
          {isUser ? (
            <>
              <button
                onClick={handleResend}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Send
              </button>
              <button
                onClick={handleEdit}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                Save Only
              </button>
            </>
          ) : (
            <button
              onClick={handleEdit}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Save
            </button>
          )}
          <button
            onClick={handleCancelEdit}
            className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 mt-2 pt-2 border-t border-opacity-20"
      style={{ borderColor: isUser ? 'white' : '#e5e7eb' }}
    >
      <button
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy'}
        className={iconClass}
      >
        {copied ? (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )}
      </button>
      <button onClick={handleEdit} title="Edit" className={iconClass}>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </button>
      {!isUser && (
        <button
          onClick={handleRegenerate}
          title="Regenerate"
          className={iconClass}
        >
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      )}
      <button onClick={handleDelete} title="Delete" className={iconClass}>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  );
}

export function MessageList({
  messages,
  currentMessage,
  onEdit,
  onRegenerate,
  onDelete,
  onResend,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentMessage]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-2xl px-6 py-4 shadow-md text-[13px] ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}
            >
              <ReactMarkdownComponent
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighterComponent
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-lg my-2"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighterComponent>
                    ) : (
                      <code
                        className={`${className} px-1.5 py-0.5 rounded ${msg.role === 'user' ? 'bg-white/20' : 'bg-gray-100'}`}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  table({ children }: any) {
                    return (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full divide-y divide-gray-300 border border-gray-300 rounded-lg">
                          {children}
                        </table>
                      </div>
                    );
                  },
                  thead({ children }: any) {
                    return <thead className="bg-gray-50">{children}</thead>;
                  },
                  th({ children }: any) {
                    return (
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
                        {children}
                      </th>
                    );
                  },
                  td({ children }: any) {
                    return (
                      <td className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
                        {children}
                      </td>
                    );
                  },
                  ul({ children }: any) {
                    return (
                      <ul className="list-disc list-inside my-2 space-y-1">
                        {children}
                      </ul>
                    );
                  },
                  ol({ children }: any) {
                    return (
                      <ol className="list-decimal list-inside my-2 space-y-1">
                        {children}
                      </ol>
                    );
                  },
                  li({ children, className }: any) {
                    // Check if this is a task list item
                    const isTaskList = className?.includes('task-list-item');
                    return (
                      <li
                        className={isTaskList ? 'flex items-start gap-2' : ''}
                      >
                        {children}
                      </li>
                    );
                  },
                  input({ checked, ...props }: any) {
                    // Task list checkbox
                    return (
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled
                        className="mt-1"
                        {...props}
                      />
                    );
                  },
                  blockquote({ children }: any) {
                    return (
                      <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2 text-gray-600">
                        {children}
                      </blockquote>
                    );
                  },
                  h1({ children }: any) {
                    return (
                      <h1 className="text-2xl font-bold mt-4 mb-2">
                        {children}
                      </h1>
                    );
                  },
                  h2({ children }: any) {
                    return (
                      <h2 className="text-xl font-bold mt-3 mb-2">
                        {children}
                      </h2>
                    );
                  },
                  h3({ children }: any) {
                    return (
                      <h3 className="text-lg font-semibold mt-2 mb-1">
                        {children}
                      </h3>
                    );
                  },
                  a({ href, children }: any) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`underline hover:no-underline ${msg.role === 'user' ? 'text-white' : 'text-blue-600'}`}
                      >
                        {children}
                      </a>
                    );
                  },
                  hr() {
                    return <hr className="my-4 border-gray-300" />;
                  },
                }}
              >
                {cleanContent(msg.content)}
              </ReactMarkdownComponent>
              {msg.files && msg.files.length > 0 && (
                <div
                  className="mt-3 pt-3 border-t border-opacity-20 space-y-2"
                  style={{
                    borderColor: msg.role === 'user' ? 'white' : '#e5e7eb',
                  }}
                >
                  {msg.files.map((file, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-50 text-gray-700'
                      }`}
                    >
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                        />
                      </svg>
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs opacity-70">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <MessageActions
                message={msg}
                isUser={msg.role === 'user'}
                onEdit={onEdit}
                onRegenerate={onRegenerate}
                onDelete={onDelete}
                onResend={onResend}
              />
            </div>
          </div>
        ))}

        {currentMessage && (
          <div className="flex justify-start">
            <div className="max-w-3xl rounded-2xl px-6 py-4 bg-white text-gray-900 border border-gray-200 shadow-md">
              {cleanContent(currentMessage) && (
                <ReactMarkdownComponent remarkPlugins={[remarkGfm]}>
                  {cleanContent(currentMessage)}
                </ReactMarkdownComponent>
              )}
              {hasToolExecution(currentMessage) && (
                <div className="text-sm text-gray-500 italic mt-2">
                  Working...
                </div>
              )}
              <span className="inline-block w-2 h-4 ml-1 bg-blue-600 animate-pulse" />
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
}
