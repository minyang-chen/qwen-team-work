import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SyntaxHighlighterComponent = SyntaxHighlighter as any;

interface FileViewerProps {
  path: string;
  content: string;
  onClose: () => void;
  onSave?: (content: string) => void;
}

export function FileViewer({
  path,
  content,
  onClose,
  onSave,
}: FileViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);

  const language = getLanguageFromPath(path);

  const handleSave = () => {
    onSave?.(editContent);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl mx-4 h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{path}</h2>
            <p className="text-sm text-gray-500">{language}</p>
          </div>
          <div className="flex gap-2">
            {onSave && (
              <button
                onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {isEditing ? 'Save' : 'Edit'}
              </button>
            )}
            {isEditing && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(content);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-full p-4 font-mono text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          ) : (
            <SyntaxHighlighterComponent
              language={language}
              style={vscDarkPlus}
              showLineNumbers
              customStyle={{ margin: 0, borderRadius: '0.5rem' }}
            >
              {content}
            </SyntaxHighlighterComponent>
          )}
        </div>
      </div>
    </div>
  );
}

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    php: 'php',
    html: 'html',
    css: 'css',
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    sh: 'bash',
    sql: 'sql',
  };
  return langMap[ext || ''] || 'text';
}
