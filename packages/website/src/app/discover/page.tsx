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
  isCollaborative: boolean;
  contentIds: string[];
  collaborators: string[];
  createdAt: string;
  updatedAt: string;
  owner?: {
    displayName: string;
    bio: string;
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

interface Profile {
  userId: string;
  displayName: string;
  bio: string;
  avatar?: string;
  isPublic: boolean;
  publicContentCount: number;
  followersCount: number;
  followingCount: number;
}

export default function DiscoverPage() {
  const { isSignedIn, user } = useUser();
  const [activeTab, setActiveTab] = useState<'lists' | 'profiles'>('lists');
  const [publicLists, setPublicLists] = useState<ReadingList[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'items'>('date');
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [selectedList, setSelectedList] = useState<ReadingList | null>(null);
  const [showListModal, setShowListModal] = useState(false);
  const [listContents, setListContents] = useState<ListContent[]>([]);

  useEffect(() => {
    if (isSignedIn) {
      loadDiscoverData();
      loadFollowing();
    }
  }, [isSignedIn]);

  const loadDiscoverData = async () => {
    setLoading(true);
    try {
      // Load public reading lists
      const listsResponse = await fetch('/api/discover/lists');
      if (listsResponse.ok) {
        const listsData = await listsResponse.json();
        setPublicLists(listsData);
      }

      // Load discoverable profiles
      const profilesResponse = await fetch('/api/profiles/discover');
      if (profilesResponse.ok) {
        const profilesData = await profilesResponse.json();
        setProfiles(profilesData);
      }
    } catch (error) {
      console.error('Error loading discover data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowing = async () => {
    try {
      const response = await fetch('/api/social?action=following');
      if (response.ok) {
        const data = await response.json();
        setFollowing(new Set(data.map((f: any) => f.followingId)));
      }
    } catch (error) {
      console.error('Error loading following:', error);
    }
  };

  const followUser = async (userId: string) => {
    try {
      const response = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'follow',
          targetUserId: userId
        })
      });

      if (response.ok) {
        setFollowing(prev => new Set([...prev, userId]));
        setProfiles(prev => prev.map(p => 
          p.userId === userId 
            ? { ...p, followersCount: p.followersCount + 1 }
            : p
        ));
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const unfollowUser = async (userId: string) => {
    try {
      const response = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unfollow',
          targetUserId: userId
        })
      });

      if (response.ok) {
        setFollowing(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        setProfiles(prev => prev.map(p => 
          p.userId === userId 
            ? { ...p, followersCount: Math.max(0, p.followersCount - 1) }
            : p
        ));
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  const viewListContents = async (list: ReadingList) => {
    setSelectedList(list);
    setShowListModal(true);
    setListContents([]); // Reset contents while loading
    
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
    }
  };

  // Filter and sort lists
  const filteredLists = publicLists
    .filter((list: ReadingList) => {
      const matchesSearch = !searchQuery || 
        list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        list.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        list.owner?.displayName.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    })
    .sort((a: ReadingList, b: ReadingList) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'items':
          return b.contentIds.length - a.contentIds.length;
        default:
          return 0;
      }
    });

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

          {/* Tab Navigation */}
          <div style={{ 
            display: 'flex', 
            marginBottom: '2rem',
            borderBottom: '2px solid #e5e7eb'
          }}>
            <button
              onClick={() => setActiveTab('lists')}
              style={{
                padding: '1rem 2rem',
                border: 'none',
                background: 'transparent',
                fontSize: '1rem',
                fontWeight: '600',
                color: activeTab === 'lists' ? '#2563eb' : '#6b7280',
                borderBottom: activeTab === 'lists' ? '2px solid #2563eb' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: '-2px'
              }}
            >
              📋 My Public Lists ({filteredLists.length})
            </button>
            <button
              onClick={() => setActiveTab('profiles')}
              style={{
                padding: '1rem 2rem',
                border: 'none',
                background: 'transparent',
                fontSize: '1rem',
                fontWeight: '600',
                color: activeTab === 'profiles' ? '#2563eb' : '#6b7280',
                borderBottom: activeTab === 'profiles' ? '2px solid #2563eb' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: '-2px'
              }}
            >
              👥 Creators ({profiles.length})
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>
              <div style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>🔍 Loading discoveries...</div>
              <div style={{ fontSize: '0.875rem' }}>Finding amazing content from the community</div>
            </div>
          ) : (
            <>
              {activeTab === 'lists' && (
                <div>
                  {/* Lists Filters */}
                  <div style={{ 
                    background: 'white', 
                    padding: '1.5rem', 
                    borderRadius: '12px', 
                    marginBottom: '2rem',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Search your public lists..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          minWidth: '250px',
                          flex: '1'
                        }}
                      />
                      
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        style={{
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          background: 'white'
                        }}
                      >
                        <option value="date">Latest</option>
                        <option value="name">Name</option>
                        <option value="items">Most Items</option>
                      </select>
                      
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          style={{
                            padding: '0.5rem 0.75rem',
                            background: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            color: '#374151'
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lists Grid */}
                  {filteredLists.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>
                      <div style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>
                        {searchQuery ? 
                          '🔍 No public lists match your search' : 
                          '📋 You haven\'t made any lists public yet'
                        }
                      </div>
                      <div style={{ fontSize: '0.875rem' }}>
                        {searchQuery ? 
                          'Try adjusting your search terms' : 
                          'Create a reading list and make it public to share with the community!'
                        }
                      </div>
                    </div>
                  ) : (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
                      gap: '1.5rem' 
                    }}>
                      {filteredLists.map((list) => (
                        <div 
                          key={list.id}
                          style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            border: '1px solid #e2e8f0',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                          onClick={() => viewListContents(list)}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ fontSize: '1.5rem' }}>📋</div>
                            <div style={{ flex: 1 }}>
                              <h3 style={{ 
                                fontSize: '1.125rem', 
                                fontWeight: '600', 
                                color: '#1f2937',
                                marginBottom: '0.5rem',
                                lineHeight: '1.4'
                              }}>
                                {list.name}
                              </h3>
                              <p style={{ 
                                color: '#6b7280', 
                                fontSize: '0.875rem',
                                lineHeight: '1.5',
                                marginBottom: '0.75rem'
                              }}>
                                {list.description || 'No description provided'}
                              </p>
                              
                              {/* List metadata */}
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem',
                                marginBottom: '0.75rem',
                                fontSize: '0.75rem',
                                color: '#6b7280'
                              }}>
                                <span>{list.contentIds.length} items</span>
                                <span style={{ color: '#9ca3af' }}>•</span>
                                <span>{new Date(list.createdAt).toLocaleDateString()}</span>
                              </div>
                              
                              {/* List tags */}
                              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                {list.isCollaborative && (
                                  <span style={{
                                    background: '#fef3c7',
                                    border: '1px solid #fbbf24',
                                    color: '#92400e',
                                    fontSize: '0.6875rem',
                                    padding: '0.125rem 0.375rem',
                                    borderRadius: '0.375rem'
                                  }}>
                                    👥 Collaborative
                                  </span>
                                )}
                                <span style={{
                                  background: '#f0fdf4',
                                  border: '1px solid #bbf7d0',
                                  color: '#15803d',
                                  fontSize: '0.6875rem',
                                  padding: '0.125rem 0.375rem',
                                  borderRadius: '0.375rem'
                                }}>
                                  🌍 Public
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'profiles' && (
                <div>
                  {profiles.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>
                      <div style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>👥 No public profiles yet</div>
                      <div style={{ fontSize: '0.875rem' }}>
                        Be the first to make your profile public and share your reading journey!
                      </div>
                    </div>
                  ) : (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
                      gap: '1.5rem' 
                    }}>
                      {profiles.map((profile) => (
                        <div 
                          key={profile.userId}
                          style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            border: '1px solid #e2e8f0',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '50%',
                              background: '#e5e7eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.25rem',
                              fontWeight: '600',
                              color: '#374151'
                            }}>
                              {profile.displayName?.charAt(0) || 'U'}
                            </div>
                            <div style={{ flex: 1 }}>
                              <h3 style={{ 
                                fontSize: '1.125rem', 
                                fontWeight: '600', 
                                color: '#1f2937',
                                marginBottom: '0.25rem'
                              }}>
                                {profile.displayName}
                              </h3>
                              <p style={{ 
                                color: '#6b7280', 
                                fontSize: '0.875rem',
                                lineHeight: '1.4'
                              }}>
                                {profile.bio || 'No bio available'}
                              </p>
                            </div>
                          </div>
                          
                          <div style={{ 
                            display: 'flex', 
                            gap: '1rem', 
                            marginBottom: '1rem',
                            fontSize: '0.875rem',
                            color: '#6b7280'
                          }}>
                            <span>📚 {profile.publicContentCount} items</span>
                            <span>👥 {profile.followersCount} followers</span>
                            <span>➡️ {profile.followingCount} following</span>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {following.has(profile.userId) ? (
                              <button
                                onClick={() => unfollowUser(profile.userId)}
                                style={{
                                  flex: 1,
                                  padding: '0.5rem 1rem',
                                  background: '#f3f4f6',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  cursor: 'pointer',
                                  color: '#374151'
                                }}
                              >
                                ✓ Following
                              </button>
                            ) : (
                              <button
                                onClick={() => followUser(profile.userId)}
                                style={{
                                  flex: 1,
                                  padding: '0.5rem 1rem',
                                  background: '#2563eb',
                                  border: '1px solid #2563eb',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  cursor: 'pointer',
                                  color: 'white'
                                }}
                              >
                                + Follow
                              </button>
                            )}
                            <button
                              style={{
                                padding: '0.5rem 1rem',
                                background: '#f0f9ff',
                                border: '1px solid #bae6fd',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                color: '#1d4ed8'
                              }}
                            >
                              View Profile
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
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
            
            {listContents.length === 0 ? (
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