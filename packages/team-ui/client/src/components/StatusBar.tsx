import { useEffect, useState } from 'react';
import { useChatStore } from '../store/chatStore';

interface AuthInfo {
  loginType: string;
  baseUrl: string | null;
}

export function StatusBar() {
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);
  const [tokenLimit, setTokenLimit] = useState(32000);
  const { sessionId, sessionStats, tokensPerSecond, isStreaming } =
    useChatStore();

  useEffect(() => {
    fetch('/api/auth/info', {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((res) => res.json())
      .then((data) => setAuthInfo(data))
      .catch(() => setAuthInfo(null));

    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => setTokenLimit(data.sessionTokenLimit))
      .catch(() => setTokenLimit(32000));
  }, []);

  if (!authInfo) return null;

  const tokenUsage = sessionStats?.tokenUsage?.totalTokens || 0;
  const percentage = (tokenUsage / tokenLimit) * 100;
  const color =
    percentage >= 90
      ? 'text-red-600'
      : percentage >= 80
        ? 'text-yellow-600'
        : 'text-gray-600';

  return (
    <div className="border-t border-gray-200 bg-gray-50 px-4 py-1.5">
      <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="font-medium">
              {authInfo.loginType === 'openai' ? 'OpenAI' : 'Qwen OAuth'}
            </span>
          </span>
          {authInfo.baseUrl && (
            <span className="text-gray-500">• {authInfo.baseUrl}</span>
          )}
        </div>
        {sessionId && (
          <div className="flex items-center gap-4">
            {isStreaming && tokensPerSecond > 0 && (
              <span className="text-blue-600 font-medium">
                {tokensPerSecond} tok/s
              </span>
            )}
            <div className={`flex items-center gap-2 ${color}`}>
              <span>
                Tokens: {tokenUsage.toLocaleString()} /{' '}
                {tokenLimit.toLocaleString()}
              </span>
              <span className="font-medium">({Math.round(percentage)}%)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
