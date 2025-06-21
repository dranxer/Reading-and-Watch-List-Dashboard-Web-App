'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

interface ContentItem {
  _id: string;
  createdAt: string;
  userId: string;
  url: string;
  title: string;
  content?: string;
  summary?: string;
  type: 'ARTICLE' | 'VIDEO';
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      fetchContentItems();
    }
  }, [isLoaded, user]);

  const fetchContentItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/content');
      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }
      const data = await response.json();
      setContentItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (!isLoaded) {
    return (
      <div className="dashboard-container">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dashboard-container">
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <h2 className="empty-title">Authentication Required</h2>
          <p className="empty-description">
            Please sign in to access your dashboard and view your saved articles.
          </p>
          <Link href="/sign-in" className="btn btn-primary">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container fade-in">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Welcome back, {user.firstName || 'Reader'}!</h1>
        <p className="dashboard-subtitle">
          Your personal reading dashboard with AI-powered summaries
        </p>
        <div className="nav-links">
          <Link href="/" className="nav-link">🏠 Home</Link>
          <button 
            onClick={fetchContentItems} 
            className="nav-link"
            style={{ background: 'rgba(102, 126, 234, 0.1)', color: '#667eea', border: '1px solid rgba(102, 126, 234, 0.2)' }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      )}

      {error && (
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <h2 className="empty-title">Oops! Something went wrong</h2>
          <p className="empty-description">{error}</p>
          <button onClick={fetchContentItems} className="btn btn-primary">
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && contentItems.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h2 className="empty-title">No articles saved yet</h2>
          <p className="empty-description">
            Install the browser extension and start browsing articles to see AI-powered summaries here!
          </p>
          <div className="card-actions">
            <Link href="/" className="btn btn-primary">
              Learn More
            </Link>
            <button onClick={fetchContentItems} className="btn btn-secondary">
              Refresh
            </button>
          </div>
        </div>
      )}

      {!loading && !error && contentItems.length > 0 && (
        <div className="content-grid">
          {contentItems.map((item, index) => (
            <div 
              key={item._id} 
              className="content-card slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="card-meta">
                <span className="card-type">{item.type}</span>
                <span>{formatDate(item.createdAt)}</span>
              </div>
              
              <h3 className="card-title">
                {truncateText(item.title, 80)}
              </h3>
              
              {item.summary && (
                <p className="card-summary">
                  {truncateText(item.summary, 150)}
                </p>
              )}
              
              <div className="card-actions">
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-primary"
                >
                  📖 Read Original
                </a>
                {item.content && (
                  <button 
                    className="btn btn-secondary"
                    onClick={() => {
                      // Copy content to clipboard
                      navigator.clipboard.writeText(item.content || '');
                      alert('Content copied to clipboard!');
                    }}
                  >
                    📋 Copy Content
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 