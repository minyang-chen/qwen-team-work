import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
// Type assertions for third-party components
const SyntaxHighlighterComponent = SyntaxHighlighter;
const ReactMarkdownComponent = ReactMarkdown;
const cleanContent = (content) => {
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
const hasToolExecution = (content) => {
    return /<tool_call>|<function=/.test(content);
};
function MessageActions({ message, isUser, onEdit, onRegenerate, onDelete, onResend, }) {
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
        }
        else {
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
        return (_jsxs("div", { className: "mt-2 pt-2 border-t border-opacity-20", style: { borderColor: isUser ? 'white' : '#e5e7eb' }, children: [_jsx("textarea", { value: editContent, onChange: (e) => setEditContent(e.target.value), className: "w-full p-2 border rounded text-sm text-gray-900 bg-white", rows: 3 }), _jsxs("div", { className: "flex gap-2 mt-2", children: [isUser ? (_jsxs(_Fragment, { children: [_jsx("button", { onClick: handleResend, className: "px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700", children: "Send" }), _jsx("button", { onClick: handleEdit, className: "px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700", children: "Save Only" })] })) : (_jsx("button", { onClick: handleEdit, className: "px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700", children: "Save" })), _jsx("button", { onClick: handleCancelEdit, className: "px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400", children: "Cancel" })] })] }));
    }
    return (_jsxs("div", { className: "flex items-center gap-2 mt-2 pt-2 border-t border-opacity-20", style: { borderColor: isUser ? 'white' : '#e5e7eb' }, children: [_jsx("button", { onClick: handleCopy, title: copied ? 'Copied!' : 'Copy', className: iconClass, children: copied ? (_jsx("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) })) : (_jsx("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" }) })) }), _jsx("button", { onClick: handleEdit, title: "Edit", className: iconClass, children: _jsx("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" }) }) }), !isUser && (_jsx("button", { onClick: handleRegenerate, title: "Regenerate", className: iconClass, children: _jsx("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" }) }) })), _jsx("button", { onClick: handleDelete, title: "Delete", className: iconClass, children: _jsx("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" }) }) })] }));
}
export function MessageList({ messages, currentMessage, onEdit, onRegenerate, onDelete, onResend, }) {
    const endRef = useRef(null);
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, currentMessage]);
    return (_jsx("div", { className: "flex-1 overflow-y-auto", children: _jsxs("div", { className: "max-w-5xl mx-auto p-6 space-y-6", children: [messages.map((msg) => (_jsx("div", { className: `flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`, children: _jsxs("div", { className: `max-w-3xl rounded-2xl px-6 py-4 shadow-md text-[13px] ${msg.role === 'user'
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                            : 'bg-white text-gray-900 border border-gray-200'}`, children: [_jsx(ReactMarkdownComponent, { remarkPlugins: [remarkGfm], components: {
                                    code({ inline, className, children, ...props }) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        return !inline && match ? (_jsx(SyntaxHighlighterComponent, { style: vscDarkPlus, language: match[1], PreTag: "div", className: "rounded-lg my-2", ...props, children: String(children).replace(/\n$/, '') })) : (_jsx("code", { className: `${className} px-1.5 py-0.5 rounded ${msg.role === 'user' ? 'bg-white/20' : 'bg-gray-100'}`, ...props, children: children }));
                                    },
                                    table({ children }) {
                                        return (_jsx("div", { className: "overflow-x-auto my-4", children: _jsx("table", { className: "min-w-full divide-y divide-gray-300 border border-gray-300 rounded-lg", children: children }) }));
                                    },
                                    thead({ children }) {
                                        return _jsx("thead", { className: "bg-gray-50", children: children });
                                    },
                                    th({ children }) {
                                        return (_jsx("th", { className: "px-4 py-2 text-left text-sm font-semibold text-gray-900 border-b border-gray-300", children: children }));
                                    },
                                    td({ children }) {
                                        return (_jsx("td", { className: "px-4 py-2 text-sm text-gray-700 border-b border-gray-200", children: children }));
                                    },
                                    ul({ children }) {
                                        return (_jsx("ul", { className: "list-disc list-inside my-2 space-y-1", children: children }));
                                    },
                                    ol({ children }) {
                                        return (_jsx("ol", { className: "list-decimal list-inside my-2 space-y-1", children: children }));
                                    },
                                    li({ children, className }) {
                                        // Check if this is a task list item
                                        const isTaskList = className?.includes('task-list-item');
                                        return (_jsx("li", { className: isTaskList ? 'flex items-start gap-2' : '', children: children }));
                                    },
                                    input({ checked, ...props }) {
                                        // Task list checkbox
                                        return (_jsx("input", { type: "checkbox", checked: checked, disabled: true, className: "mt-1", ...props }));
                                    },
                                    blockquote({ children }) {
                                        return (_jsx("blockquote", { className: "border-l-4 border-gray-300 pl-4 italic my-2 text-gray-600", children: children }));
                                    },
                                    h1({ children }) {
                                        return (_jsx("h1", { className: "text-2xl font-bold mt-4 mb-2", children: children }));
                                    },
                                    h2({ children }) {
                                        return (_jsx("h2", { className: "text-xl font-bold mt-3 mb-2", children: children }));
                                    },
                                    h3({ children }) {
                                        return (_jsx("h3", { className: "text-lg font-semibold mt-2 mb-1", children: children }));
                                    },
                                    a({ href, children }) {
                                        return (_jsx("a", { href: href, target: "_blank", rel: "noopener noreferrer", className: `underline hover:no-underline ${msg.role === 'user' ? 'text-white' : 'text-blue-600'}`, children: children }));
                                    },
                                    hr() {
                                        return _jsx("hr", { className: "my-4 border-gray-300" });
                                    },
                                }, children: cleanContent(msg.content) }), msg.files && msg.files.length > 0 && (_jsx("div", { className: "mt-3 pt-3 border-t border-opacity-20 space-y-2", style: {
                                    borderColor: msg.role === 'user' ? 'white' : '#e5e7eb',
                                }, children: msg.files.map((file, index) => (_jsxs("div", { className: `flex items-center gap-2 px-3 py-2 rounded-lg ${msg.role === 'user'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-gray-50 text-gray-700'}`, children: [_jsx("svg", { className: "w-4 h-4 flex-shrink-0", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" }) }), _jsx("span", { className: "text-sm truncate", children: file.name }), _jsxs("span", { className: "text-xs opacity-70", children: ["(", (file.size / 1024).toFixed(1), " KB)"] })] }, index))) })), _jsx(MessageActions, { message: msg, isUser: msg.role === 'user', onEdit: onEdit, onRegenerate: onRegenerate, onDelete: onDelete, onResend: onResend })] }) }, msg.id))), currentMessage && (_jsx("div", { className: "flex justify-start", children: _jsxs("div", { className: "max-w-3xl rounded-2xl px-6 py-4 bg-white text-gray-900 border border-gray-200 shadow-md", children: [cleanContent(currentMessage) && (_jsx(ReactMarkdownComponent, { remarkPlugins: [remarkGfm], children: cleanContent(currentMessage) })), hasToolExecution(currentMessage) && (_jsx("div", { className: "text-sm text-gray-500 italic mt-2", children: "Working..." })), _jsx("span", { className: "inline-block w-2 h-4 ml-1 bg-blue-600 animate-pulse" })] }) })), _jsx("div", { ref: endRef })] }) }));
}
