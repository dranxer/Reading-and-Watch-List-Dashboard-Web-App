'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';

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
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Get the session token using the auth hook
      getToken().then((token: string | null) => {
        if (!token) {
          alert('Failed to get authentication token. Please try again.');
          return;
        }
        
        // Send token to extension if it's available
        if (window.chrome?.runtime) {
          window.chrome.runtime.sendMessage({
            action: 'setAuthToken',
            token: token
          });
        }
        
        // Also post message for the popup
        window.postMessage({
          type: 'AUTH_TOKEN',
          token: token
        }, '*');
        
        // Show success message
        alert('Authentication token sent to extension! You can now close this tab.');
      }).catch((error: Error) => {
        console.error('Error getting token:', error);
        alert('Failed to get authentication token. Please try again.');
      });
    } else if (isLoaded && !isSignedIn) {
      alert('Please sign in first to get your authentication token.');
    }
  }, [isLoaded, isSignedIn, getToken]);

  if (!isLoaded) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'sans-serif'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'sans-serif',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <h2>Authentication Required</h2>
        <p>Please sign in to get your authentication token for the extension.</p>
        <button 
          onClick={() => window.location.href = '/sign-in'}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'sans-serif',
      flexDirection: 'column',
      gap: '1rem',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <h2>✅ Authentication Token Sent!</h2>
      <p>Your authentication token has been sent to the Reading Tracker extension.</p>
      <p>You can now close this tab and use the extension to save articles.</p>
      <div style={{ 
        background: 'rgba(102, 126, 234, 0.1)', 
        padding: '1rem', 
        borderRadius: '8px',
        border: '1px solid rgba(102, 126, 234, 0.2)',
        marginTop: '1rem'
      }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
          <strong>Next steps:</strong><br/>
          1. Go to any article page<br/>
          2. Click the extension icon<br/>
          3. Click "Extract Current Page"<br/>
          4. View your saved articles in the dashboard
        </p>
      </div>
    </div>
  );
} 