import { useState, useEffect } from 'react';

export function Login({ onSuccess }: { onSuccess?: () => void }) {
  const [showOpenAI, setShowOpenAI] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [deviceCode, setDeviceCode] = useState<{
    device_code: string;
    user_code: string;
    verification_uri_complete: string;
    code_verifier: string;
  } | null>(null);

  // Fetch default values from server
  useEffect(() => {
    async function fetchDefaults() {
      try {
        const res = await fetch('/api/config/individual');
        const data = await res.json();

        // Extract base URL and model from config
        const baseUrlValue = data['OpenAI Base URL'];
        const modelValue = data['OpenAI Model'];

        if (baseUrlValue && baseUrlValue !== 'Not configured') {
          setBaseUrl(baseUrlValue);
        }
        if (modelValue && modelValue !== 'Not configured') {
          setModel(modelValue);
        }
      } catch (error) {
      }
    }

    fetchDefaults();
  }, []);

  const generateCodeVerifier = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const generateCodeChallenge = async (verifier: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const handleOAuthLogin = async () => {
    try {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      const res = await fetch('/api/auth/oauth/qwen/device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        }),
      });

      const data = await res.json();
      setDeviceCode({
        device_code: data.device_code,
        user_code: data.user_code,
        verification_uri_complete: data.verification_uri_complete,
        code_verifier: codeVerifier,
      });

      // Open verification URL
      window.open(data.verification_uri_complete, '_blank');

      // Start polling
      pollForToken(data.device_code, codeVerifier);
    } catch (error) {
    }
  };

  const pollForToken = async (deviceCode: string, codeVerifier: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/auth/oauth/qwen/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_code: deviceCode,
            code_verifier: codeVerifier,
          }),
        });

        const data = await res.json();

        if (data.access_token) {
          clearInterval(interval);
          if (onSuccess) {
            onSuccess();
          } else {
            window.location.href = '/';
          }
        } else if (data.error && data.error !== 'authorization_pending') {
          clearInterval(interval);
          setDeviceCode(null);
        }
      } catch (error) {
      }
    }, 3000);
  };

  const handleOpenAILogin = async () => {
    try {
      const res = await fetch('/api/auth/login/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ apiKey, baseUrl, model }),
      });

      if (res.ok) {
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.href = '/';
        }
      } else {
        alert('Login failed. Please check your credentials.');
      }
    } catch (error) {
      alert('Login failed. Please try again.');
    }
  };

  const handleDevLogin = async () => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok) {
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.href = '/';
        }
      }
    } catch (error) {
    }
  };

  if (showOpenAI) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              OpenAI Configuration
            </h1>
            <p className="text-gray-600 text-sm">
              Enter your OpenAI-compatible API credentials
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base URL (optional)
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model (optional)
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleOpenAILogin}
              disabled={!apiKey}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sign In
            </button>
            <button
              onClick={() => setShowOpenAI(false)}
              className="w-full px-6 py-3 text-gray-600 hover:text-gray-900 transition-colors font-medium"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Qwen Code
          </h1>
          <p className="text-gray-600">Sign in to continue</p>
        </div>

        <div className="space-y-3">
          {deviceCode ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">
                Waiting for authorization...
              </p>
              <p className="text-xs text-gray-500">
                A browser window has been opened. Please complete the
                authorization.
              </p>
              <button
                onClick={() => setDeviceCode(null)}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleOAuthLogin}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-md hover:shadow-lg"
            >
              Sign in with Qwen OAuth
            </button>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          <button
            onClick={() => setShowOpenAI(true)}
            className="w-full px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Sign in with OpenAI API
          </button>

          <button
            onClick={handleDevLogin}
            className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Continue as Guest (Dev Mode)
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
