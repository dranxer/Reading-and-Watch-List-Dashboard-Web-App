'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

interface ReadingList {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  isPublic: boolean;
  contentIds: string[];
  createdAt: string;
  creator?: {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    imageUrl: string;
    isCurrentUser: boolean;
  };
}

interface ListContent {
  id: string;
  title: string;
  url: string;
  description?: string;
  contentType: 'article' | 'video' | 'podcast';
  domain: string;
  tags: string[];
  qualityScore?: number;
  createdAt: string;
}

export default function DiscoverPage() {
  const { isSignedIn, user } = useUser();
  const [publicLists, setPublicLists] = useState<ReadingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedList, setSelectedList] = useState<ReadingList | null>(null);
  const [showListModal, setShowListModal] = useState(false);
  const [listContents, setListContents] = useState<ListContent[]>([]);
  const [loadingContents, setLoadingContents] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      loadPublicLists();
    }
  }, [isSignedIn]);

  const loadPublicLists = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/discover/lists');
      if (response.ok) {
        const data = await response.json();
        setPublicLists(data || []);
      } else {
        setError('Failed to load public lists');
      }
    } catch (err) {
      console.error('Error loading public lists:', err);
      setError('Failed to load public lists');
    } finally {
      setLoading(false);
    }
  };

  const viewListContents = async (list: ReadingList) => {
    setSelectedList(list);
    setShowListModal(true);
    setListContents([]);
    setLoadingContents(true);
    
    try {
      const response = await fetch(`/api/lists/${list.id}/contents`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setListContents(result.data);
        } else {
          console.error('Invalid response format:', result);
          setListContents([]);
        }
      } else {
        console.error('Failed to fetch list contents:', response.status);
        setListContents([]);
      }
    } catch (error) {
      console.error('Error loading list contents:', error);
      setListContents([]);
    } finally {
      setLoadingContents(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Sign In to Discover</h2>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
            Sign in to manage your public reading lists and share them with the community.
          </p>
          <Link href="/sign-in" className="btn btn-primary">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <h1 className="logo">📚 ReadWatch Tracker</h1>
          
          <nav className="nav">
            <Link href="/" className="nav-link">
              Dashboard
            </Link>
            <Link href="/discover" className="nav-link" style={{ fontWeight: '600' }}>
              Discover
            </Link>
            <Link href="/extension" className="nav-link">
              Extension
            </Link>
            <div className="user-info">
              <div className="user-avatar">
                {user?.firstName?.charAt(0) || 'U'}
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                {user?.firstName || 'User'}
              </span>
            </div>
          </nav>
        </div>
      </header>

      <main className="main-container">
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
          {/* Page Header */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
              🔍 Discover
            </h1>
            <p style={{ color: '#6b7280', fontSize: '1.125rem' }}>
              Share your public reading lists and connect with fellow readers
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>
              <div style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>🔍 Loading discoveries...</div>
              <div style={{ fontSize: '0.875rem' }}>Finding amazing content from the community</div>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#dc2626' }}>
              <div style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>❌ {error}</div>
              <button 
                onClick={loadPublicLists}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Try Again
              </button>
            </div>
          ) : (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1f2937', marginBottom: '1.5rem' }}>
                📋 Public Reading Lists ({publicLists.length})
              </h2>

              {publicLists.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '4rem', 
                  background: 'white',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ fontSize: '1.125rem', marginBottom: '1rem', color: '#6b7280' }}>
                    📋 No public reading lists found
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Create a reading list and make it public to share with the community, or check back later for lists from other users!
                  </div>
                </div>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
                  gap: '1.5rem' 
                }}>
                  {publicLists.map((list) => (
                    <div 
                      key={list.id}
                      style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        border: '1px solid #e2e8f0',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ marginBottom: '1rem' }}>
                        <h3 style={{ 
                          fontSize: '1.125rem', 
                          fontWeight: '600', 
                          color: '#1f2937',
                          marginBottom: '0.5rem'
                        }}>
                          📋 {list.name}
                        </h3>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                          {list.description || 'No description provided'}
                        </p>
                        
                        {/* Creator information */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem',
                          padding: '0.5rem',
                          background: list.creator?.isCurrentUser ? '#f0f9ff' : '#f8fafc',
                          borderRadius: '6px',
                          border: `1px solid ${list.creator?.isCurrentUser ? '#bae6fd' : '#e2e8f0'}`
                        }}>
                          {list.creator?.imageUrl ? (
                            <img 
                              src={list.creator.imageUrl} 
                              alt={list.creator.name}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                objectFit: 'cover'
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: '#3b82f6',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              {list.creator?.firstName?.[0] || '?'}
                            </div>
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              fontSize: '0.8125rem', 
                              fontWeight: '500',
                              color: list.creator?.isCurrentUser ? '#0369a1' : '#374151'
                            }}>
                              {list.creator?.isCurrentUser ? '👤 Your List' : `👥 ${list.creator?.name || 'Unknown User'}`}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '1rem'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {list.contentIds.length} items
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {new Date(list.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => viewListContents(list)}
                          style={{
                            flex: 1,
                            padding: '0.5rem 1rem',
                            background: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            cursor: 'pointer'
                          }}
                        >
                          View Contents
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* List Contents Modal */}
      {showListModal && selectedList && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '800px',
            maxHeight: '80vh',
            width: '90%',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1f2937' }}>
                📋 {selectedList.name}
              </h2>
              <button
                onClick={() => setShowListModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                {selectedList.description || 'No description provided'}
              </p>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {selectedList.contentIds.length} items • Created {new Date(selectedList.createdAt).toLocaleDateString()}
              </div>
            </div>
            
            {loadingContents ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <div>🔄 Loading contents...</div>
              </div>
            ) : listContents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <div>📭 This list is empty</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {listContents.map((item) => (
                  <div 
                    key={item.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                    onClick={() => window.open(item.url, '_blank')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ fontSize: '1.25rem' }}>
                        {item.contentType === 'video' ? '🎥' : 
                         item.contentType === 'podcast' ? '🎧' : '📖'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ 
                          fontSize: '1rem', 
                          fontWeight: '600', 
                          color: '#1f2937',
                          marginBottom: '0.25rem'
                        }}>
                          {item.title}
                        </h4>
                        {item.description && (
                          <p style={{ 
                            color: '#6b7280', 
                            fontSize: '0.875rem',
                            marginBottom: '0.5rem'
                          }}>
                            {item.description}
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {item.tags && item.tags.map((tag, index) => (
                            <span 
                              key={`${item.id}-tag-${index}`}
                              style={{
                                background: '#f0f9ff',
                                border: '1px solid #bae6fd',
                                color: '#0369a1',
                                fontSize: '0.6875rem',
                                padding: '0.125rem 0.375rem',
                                borderRadius: '0.375rem'
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      {item.qualityScore && (
                        <div style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: item.qualityScore >= 80 ? '#dcfce7' : 
                                     item.qualityScore >= 60 ? '#fef3c7' : '#fee2e2',
                          color: item.qualityScore >= 80 ? '#16a34a' : 
                                 item.qualityScore >= 60 ? '#d97706' : '#dc2626'
                        }}>
                          {item.qualityScore}%
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 