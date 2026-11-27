'use client';

import { useAuth, useUser } from '@/lib/authClient';
import { useEffect, useState } from 'react';

// Extend Window interface for Chrome extension API
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage: (message: any) => void;
      };
    };
  }
}

export default function AuthTokenPage() {
  const { getToken, isLoaded } = useAuth();
  const { user } = useUser();
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isExtension, setIsExtension] = useState(false);

  useEffect(() => {
    // Check if this was opened by the extension
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('extension') === 'true') {
      setIsExtension(true);
    }
  }, []);

  useEffect(() => {
    const fetchToken = async () => {
      if (isLoaded && user) {
        try {
          const authToken = await getToken();
          if (authToken) {
            setToken(authToken);
            
            // Store token for extension if needed
            if (typeof window !== 'undefined') {
              localStorage.setItem('clerk-db-jwt', authToken);
              sessionStorage.setItem('auth-token', authToken);
            }
          }
        } catch (error) {
          console.error('Error fetching token:', error);
        }
      }
    };

    fetchToken();
  }, [isLoaded, user, getToken]);

  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="mb-6">You need to be signed in to view your authentication token.</p>
          <a 
            href="/sign-in" 
            className="inline-block px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-4">
              {isExtension ? 'Extension Setup Complete!' : 'Authentication Token'}
            </h1>
            <p className="text-gray-300">
              {isExtension 
                ? 'Your CurioLog extension is now connected to your Knowledge Tracker account.'
                : 'Your authentication token for API access and browser extension setup.'
              }
            </p>
          </div>

          {/* User Info */}
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              {user.imageUrl && (
                <img 
                  src={user.imageUrl} 
                  alt="Profile" 
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <h2 className="text-white font-semibold">
                  {user.fullName || user.emailAddresses[0]?.emailAddress}
                </h2>
                <p className="text-gray-400 text-sm">
                  {user.emailAddresses[0]?.emailAddress}
                </p>
              </div>
            </div>
          </div>

          {/* Token Display */}
          {token && (
            <div className="bg-gray-800 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Authentication Token</h3>
                <button
                  onClick={copyToken}
                  className="px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div 
                className="bg-gray-900 p-4 rounded-lg font-mono text-sm text-gray-300 break-all cursor-pointer hover:bg-gray-700 transition-colors"
                onClick={copyToken}
                data-auth-token={token}
              >
                {token}
              </div>
              <p className="text-gray-400 text-xs mt-2">
                This token authenticates your browser extension with your Knowledge Tracker account.
              </p>
            </div>
          )}

          {/* Extension Status */}
          {isExtension && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <h3 className="text-green-400 font-semibold">Extension Connected</h3>
              </div>
              <p className="text-green-300 text-sm mb-4">
                Your CurioLog browser extension is now authenticated and will automatically save articles and videos you read to your Knowledge Tracker.
              </p>
              <div className="text-sm text-green-300/80">
                <p>✅ Authentication complete</p>
                <p>✅ Content detection active</p>
                <p>✅ Auto-save enabled</p>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">
              {isExtension ? 'You can now:' : 'How to use this token:'}
            </h3>
            <div className="space-y-3 text-gray-300 text-sm">
              {isExtension ? (
                <>
                  <p>• Browse articles and videos - they'll be automatically saved</p>
                  <p>• View your saved content in the Knowledge Tracker dashboard</p>
                  <p>• Use the extension popup to check status and test pages</p>
                  <p>• Generate AI summaries of your saved content</p>
                </>
              ) : (
                <>
                  <p>• Use this token to authenticate API requests to your Knowledge Tracker</p>
                  <p>• Include it in the Authorization header as: <code className="bg-gray-700 px-1 rounded">Bearer {token?.substring(0, 20)}...</code></p>
                  <p>• Configure your browser extension with this token</p>
                  <p>• Keep this token secure and don't share it publicly</p>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 mt-8">
            <a
              href="/"
              className="flex-1 px-6 py-3 bg-orange-500 text-white text-center rounded-lg hover:bg-orange-600 transition-colors"
            >
              Open Knowledge Tracker
            </a>
            {isExtension && (
              <button
                onClick={() => window.close()}
                className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close Window
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 