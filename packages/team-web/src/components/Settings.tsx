import { useState, useEffect } from 'react';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SettingsData {
  sessionTokenLimit: number;
  visionModelPreview: boolean;
  vlmSwitchMode: 'once' | 'session' | 'persist' | 'ask';
}

interface AuthInfo {
  loginType: string;
  baseUrl: string | null;
  model: string | null;
}

export function Settings({ isOpen, onClose }: SettingsProps) {
  const [settings, setSettings] = useState<SettingsData>({
    sessionTokenLimit: 32000,
    visionModelPreview: true,
    vlmSwitchMode: 'ask',
  });
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAuthInfo(null); // Clear previous data
      fetch('/api/auth/info', {
        credentials: 'include',
        cache: 'no-store',
      })
        .then((res) => res.json())
        .then((data) => setAuthInfo(data))
        .catch(() => setAuthInfo(null));
    }
  }, [isOpen]);

  const handleSave = () => {
    // Save to localStorage or send to server
    localStorage.setItem('qwen-settings', JSON.stringify(settings));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Settings</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure your Qwen Code experience
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Authentication Info */}
          {authInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Connection Information
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Login Type:</span>
                  <span className="text-xs font-medium text-gray-900">
                    {authInfo.loginType === 'openai'
                      ? 'OpenAI Compatible'
                      : 'Qwen OAuth'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Base URL:</span>
                  <span className="text-xs font-medium text-gray-900 truncate ml-2">
                    {authInfo.baseUrl || 'N/A'}
                  </span>
                </div>
                {authInfo.model && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Model:</span>
                    <span className="text-xs font-medium text-gray-900">
                      {authInfo.model}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Session Token Limit */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Session Token Limit
            </label>
            <input
              type="number"
              value={settings.sessionTokenLimit}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  sessionTokenLimit: parseInt(e.target.value),
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1000"
              step="1000"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum tokens per conversation session (default: 32000)
            </p>
          </div>

          {/* Vision Model Preview */}
          <div>
            <label className="flex items-center justify-between">
              <div>
                <span className="block text-sm font-semibold text-gray-900">
                  Vision Model Preview
                </span>
                <span className="text-xs text-gray-500">
                  Enable automatic vision model detection for images
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.visionModelPreview}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    visionModelPreview: e.target.checked,
                  })
                }
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>

          {/* VLM Switch Mode */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Vision Model Switch Mode
            </label>
            <select
              value={settings.vlmSwitchMode}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  vlmSwitchMode: e.target.value as
                    | 'ask'
                    | 'once'
                    | 'session'
                    | 'persist',
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ask">Ask each time</option>
              <option value="once">Switch once per query</option>
              <option value="session">Switch for entire session</option>
              <option value="persist">Never switch automatically</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              How to handle vision model switching when images are detected
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
