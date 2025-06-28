'use client';

import { useState, useEffect } from 'react';
import { useUser, SignOutButton } from '@clerk/nextjs';
import Link from 'next/link';

interface ContentItem {
  id: string;
  url: string;
  title: string;
  description?: string;
  contentType: 'article' | 'video' | 'podcast';
  domain: string;
  thumbnailUrl?: string;
  readingTime?: number;
  videoDuration?: number;
  tags: string[];
  llmSummary?: string;
  qualityScore?: number;
  isPublic: boolean;
  createdAt: string;
}

export default function ReadWatchTracker() {
  const { isSignedIn, user } = useUser();
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userContent, setUserContent] = useState<any[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [recentContent, setRecentContent] = useState<ContentItem[]>([]);
  const [activeTab, setActiveTab] = useState<'recent' | 'feed' | 'discover'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'article' | 'video' | 'podcast'>('all');
  const [selectedTag, setSelectedTag] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'quality' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [showContentModal, setShowContentModal] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState<string | null>(null);
  const [aiInitializing, setAiInitializing] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [readingLists, setReadingLists] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [showTagManagerModal, setShowTagManagerModal] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [selectedContentForList, setSelectedContentForList] = useState<any>(null);

  // Filter and sort content based on search, filters, and sorting
  const processedContent = userContent
    .filter((item: any) => {
      const matchesSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.source.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = selectedType === 'all' || item.type === selectedType;
      const matchesTag = !selectedTag || item.tags.includes(selectedTag);
      
      return matchesSearch && matchesType && matchesTag;
    })
    .sort((a: any, b: any) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.analyzedAt).getTime() - new Date(b.analyzedAt).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'quality':
          comparison = a.qualityScore - b.qualityScore;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  // Remove old filteredContent definition and use processedContent instead
  const filteredContent = processedContent;

  // Get all unique tags from user content
  const allTags = [...new Set(userContent.flatMap((item: any) => item.tags))].sort();

  const openContentDetails = (content: any) => {
    setSelectedContent(content);
    setShowContentModal(true);
  };

  const closeContentModal = () => {
    setShowContentModal(false);
    setSelectedContent(null);
  };

  const deleteContent = async (contentId: string) => {
    if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/content/${contentId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        // Remove from local state
        setUserContent(userContent.filter((item: any) => item.id !== contentId));
        closeContentModal();
        alert('✅ Content deleted successfully!');
      } else {
        alert(`❌ Failed to delete: ${result.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('❌ Failed to delete content. Please try again.');
    }
  };

  const generateAISummary = async (content: any) => {
    setGeneratingSummary(content.id);
    
    try {
      // Import WebLLM service dynamically for client-side usage
      const { webllmService } = await import('@/lib/webllm');
      
      // Initialize WebLLM if not already done
      if (!webllmService.isReady()) {
        setAiInitializing(true);
        const initPromise = webllmService.initialize();
        
        // Show progress to user
        alert('🤖 Setting up AI model for the first time...\n\nThis will download ~2GB and may take 2-5 minutes.\nThe model runs locally for privacy!\n\nCheck console for progress updates.');
        
        await initPromise;
        setAiReady(true);
        setAiInitializing(false);
      }

      // Generate summary using local AI
      const summary = await webllmService.generateSummary(
        content.title,
        content.description,
        content.type,
        (message) => {
          console.log('🤖 AI Progress:', message);
        }
      );

      // Update the content with AI summary
      const updatedContent = userContent.map((item: any) => 
        item.id === content.id 
          ? { ...item, aiSummary: summary }
          : item
      );
      setUserContent(updatedContent);
      
      // Update selected content if modal is open
      if (selectedContent?.id === content.id) {
        setSelectedContent({ ...selectedContent, aiSummary: summary });
      }
      
      // Also save to persistent storage
      const { storage } = await import('@/lib/storage');
      storage.updateUserContent(user?.id || '', content.id, { aiSummary: summary });
      
      alert('✅ Real AI summary generated locally!');
    } catch (error) {
      console.error('WebLLM error:', error);
      setAiInitializing(false);
      
      // Fallback to server-side mock if WebLLM fails
      try {
        console.log('🔄 Falling back to mock AI...');
        const response = await fetch('/api/summarize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: content.title,
            description: content.description,
            contentType: content.type
          }),
        });

        const result = await response.json();

        if (result.success) {
          const updatedContent = userContent.map((item: any) => 
            item.id === content.id 
              ? { ...item, aiSummary: result.summary }
              : item
          );
          setUserContent(updatedContent);
          
          if (selectedContent?.id === content.id) {
            setSelectedContent({ ...selectedContent, aiSummary: result.summary });
          }
          
          alert('✅ Mock AI summary generated (WebLLM unavailable)');
        } else {
          alert(`❌ Failed to generate summary: ${result.error}`);
        }
      } catch (fallbackError) {
        alert('❌ Failed to generate summary. Please try again.');
      }
    } finally {
      setGeneratingSummary(null);
    }
  };

  const createReadingList = async (name: string, description: string, isPublic: boolean, isCollaborative: boolean) => {
    try {
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          isPublic,
          isCollaborative
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Add to local state
        setReadingLists([...readingLists, result.data]);
        setShowCreateListModal(false);
        alert('✅ Reading list created successfully!');
      } else {
        alert(`❌ Failed to create list: ${result.error}`);
      }
    } catch (error) {
      console.error('Create list error:', error);
      alert('❌ Failed to create reading list. Please try again.');
    }
  };

  const createManualTag = async (name: string, category: string, color: string) => {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim(),
          color,
          isSystemTag: false
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Add to local state
        setTags([...tags, result.data]);
        setShowTagModal(false);
        alert('✅ Tag created successfully!');
      } else {
        alert(`❌ Failed to create tag: ${result.error}`);
      }
    } catch (error) {
      console.error('Create tag error:', error);
      alert('❌ Failed to create tag. Please try again.');
    }
  };

  const addToReadingList = async (listId: string, contentId: string) => {
    try {
      const response = await fetch(`/api/lists/${listId}/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contentId }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local reading lists state
        setReadingLists(readingLists.map(list => 
          list.id === listId 
            ? { ...list, contentIds: [...list.contentIds, contentId] }
            : list
        ));
        setShowAddToListModal(false);
        setSelectedContentForList(null);
        alert('✅ Added to reading list successfully!');
      } else {
        alert(`❌ Failed to add to list: ${result.error}`);
      }
    } catch (error) {
      console.error('Add to list error:', error);
      alert('❌ Failed to add to reading list. Please try again.');
    }
  };

  const exportContent = () => {
    const dataStr = JSON.stringify(userContent, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `readwatch-content-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedData)) {
          // Add imported content to existing content
          const newContent = [...userContent] as any[];
          importedData.forEach((item: any) => {
            // Check if item already exists (by URL)
            if (!newContent.find((existing: any) => existing.url === item.url)) {
              newContent.unshift({
                ...item,
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                userId: user?.id,
                analyzedAt: item.analyzedAt || new Date().toISOString()
              });
            }
          });
          setUserContent(newContent);
          alert(`✅ Successfully imported ${importedData.length} items!`);
        } else {
          alert('❌ Invalid file format. Please select a valid JSON file.');
        }
      } catch (error) {
        alert('❌ Error reading file. Please make sure it\'s a valid JSON file.');
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  // Load user content
  const loadUserContent = async () => {
    if (!isSignedIn) return;
    
    setLoadingContent(true);
    try {
      console.log('🔍 Loading user content...');
      const response = await fetch('/api/content');
      const result = await response.json();
      
      console.log('📊 Content API response:', result);
      
      if (result.success) {
        console.log('✅ Content loaded:', result.data.length, 'items');
        setUserContent(result.data);
      } else {
        console.error('❌ Failed to load content:', result.error);
      }
    } catch (error) {
      console.error('Failed to load content:', error);
    } finally {
      setLoadingContent(false);
    }
  };

  // Load reading lists
  const loadReadingLists = async () => {
    if (!isSignedIn) return;
    
    try {
      const response = await fetch('/api/lists');
      const result = await response.json();
      
      if (result.success) {
        setReadingLists(result.data);
      }
    } catch (error) {
      console.error('Failed to load reading lists:', error);
    }
  };

  // Load tags
  const loadTags = async () => {
    if (!isSignedIn) return;
    
    try {
      const response = await fetch('/api/tags');
      const result = await response.json();
      
      if (result.success) {
        setTags(result.data);
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  // Load user profile
  const loadUserProfile = async () => {
    if (!isSignedIn || !user?.id) return;
    
    try {
      const response = await fetch(`/api/social?action=profile&userId=${user.id}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setUserProfile(result.data);
      } else {
        // Create profile if it doesn't exist
        const createResponse = await fetch('/api/social', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_profile',
            profileData: {
              displayName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Anonymous User',
              bio: '',
              isPublic: false
            }
          })
        });
        
        const createResult = await createResponse.json();
        if (createResult.success) {
          setUserProfile(createResult.data);
        }
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      loadUserContent();
      loadReadingLists();
      loadTags();
      loadUserProfile();
    }
  }, [isSignedIn, user?.id]);

  const analyzeContent = async () => {
    if (!url) return;
    setIsAnalyzing(true);
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Content analyzed!\n\nTitle: ${result.data.title}\nType: ${result.data.type}\nQuality Score: ${result.data.qualityScore}%\nTags: ${result.data.tags.join(', ')}`);
        setUrl('');
        // Refresh content list
        loadUserContent();
      } else {
        alert(`❌ Analysis failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('❌ Failed to analyze content. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const detectContentType = (domain: string): 'article' | 'video' | 'podcast' => {
    if (domain.includes('youtube.com') || domain.includes('vimeo.com')) return 'video';
    if (domain.includes('spotify.com') || domain.includes('podcasts.apple.com')) return 'podcast';
    return 'article';
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <h1 className="logo">📚 ReadWatch Tracker</h1>
          
          <nav className="nav">
            {isSignedIn ? (
              <>
                <Link href="/profile" className="nav-link">
                  Profile
                </Link>
                <Link href="/discover" className="nav-link">
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
                  <SignOutButton>
                    <button 
                      className="btn" 
                      style={{ 
                        padding: '0.4rem 0.8rem', 
                        fontSize: '0.875rem',
                        marginLeft: '0.5rem',
                        background: '#f3f4f6',
                        color: '#374151'
                      }}
                    >
                      Sign Out
                    </button>
                  </SignOutButton>
                </div>
              </>
            ) : (
              <>
                <Link href="/sign-in" className="nav-link">
                  Sign In
                </Link>
                <Link href="/sign-up" className="btn btn-primary">
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="main-container">
        {!isSignedIn ? (
          // Landing page
          <div className="hero">
            <h2 className="hero-title">
              Track Your Reading & Watching Journey
            </h2>
            <p className="hero-subtitle">
              Automatically curate and share your intellectual consumption. 
              Discover what others are reading and watching. Get AI-powered insights.
            </p>
            
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">🤖</div>
                <h3 className="feature-title">AI-Powered Analysis</h3>
                <p className="feature-description">Local LLM analyzes content quality and generates summaries</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">🔗</div>
                <h3 className="feature-title">Browser Extension</h3>
                <p className="feature-description">Automatically track articles, videos, and podcasts</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">👥</div>
                <h3 className="feature-title">Social Discovery</h3>
                <p className="feature-description">Follow others and discover quality content</p>
              </div>
            </div>
            
            <Link href="/sign-up" className="btn btn-primary" style={{ fontSize: '1.125rem', padding: '1rem 2rem' }}>
              Get Started Free
            </Link>
          </div>
        ) : (
          // Main app interface
          <div>
            {/* Welcome Message */}
            <div style={{ 
              background: 'white', 
              padding: '1.5rem', 
              borderRadius: '12px', 
              marginBottom: '2rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
                Welcome back, {user?.firstName}! 👋
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                Ready to discover and track amazing content? Start by analyzing a URL or install our browser extension for automatic tracking.
              </p>
              
              {/* Debug Info */}
              <div style={{ 
                background: '#f3f4f6', 
                padding: '1rem', 
                borderRadius: '8px', 
                fontSize: '0.875rem',
                color: '#374151'
              }}>
                <strong>📊 Content Stats:</strong> {userContent.length} items tracked
                {userContent.length > 0 && (
                  <span style={{ marginLeft: '1rem', color: '#10b981' }}>
                    ✅ Extension integration working!
                  </span>
                )}
                {userContent.length === 0 && (
                  <div style={{ marginTop: '0.5rem', color: '#6b7280' }}>
                    💡 Try visiting an article, video, or podcast page with the extension enabled to see automatic tracking in action.
                  </div>
                )}
              </div>
            </div>

            <div className="app-layout">
              <div>
                {/* Content Input */}
                <div className="main-content">
                  <div className="content-input">
                    <h3>Add Content</h3>
                    <div className="input-group">
                      <input
                        type="url"
                        placeholder="Paste a URL to analyze (article, video, podcast)..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="input"
                      />
                      <button
                        onClick={analyzeContent}
                        disabled={!url || isAnalyzing}
                        className="btn btn-primary"
                      >
                        {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                      </button>
                    </div>
                  </div>

                  {/* User Content */}
                  <div className="content-list">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4>Your Recent Content</h4>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {userContent.length > 0 && (
                          <>
                            <button
                              onClick={exportContent}
                              style={{
                                padding: '0.375rem 0.75rem',
                                background: '#f3f4f6',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                color: '#374151'
                              }}
                              title="Export your content as JSON"
                            >
                              📥 Export
                            </button>
                            
                            <label style={{ cursor: 'pointer' }}>
                              <input
                                type="file"
                                accept=".json"
                                onChange={handleImportFile}
                                style={{ display: 'none' }}
                              />
                              <span
                                style={{
                                  padding: '0.375rem 0.75rem',
                                  background: '#f3f4f6',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  color: '#374151',
                                  display: 'inline-block'
                                }}
                                title="Import content from JSON file"
                              >
                                📤 Import
                              </span>
                            </label>
                          </>
                        )}
                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {filteredContent.length} of {userContent.length} items
                        </span>
                      </div>
                    </div>
                    
                                         {/* Search and Filters */}
                     {userContent.length > 0 && (
                       <div style={{ 
                         background: '#f8fafc', 
                         padding: '1rem', 
                         borderRadius: '8px', 
                         marginBottom: '1rem',
                         border: '1px solid #e2e8f0'
                       }}>
                         <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                           <input
                             type="text"
                             placeholder="Search content..."
                             value={searchQuery}
                             onChange={(e) => setSearchQuery(e.target.value)}
                             style={{
                               padding: '0.5rem',
                               border: '1px solid #d1d5db',
                               borderRadius: '6px',
                               fontSize: '0.875rem',
                               minWidth: '200px',
                               flex: '1'
                             }}
                           />
                           
                           <select
                             value={selectedType}
                             onChange={(e) => setSelectedType(e.target.value as any)}
                             style={{
                               padding: '0.5rem',
                               border: '1px solid #d1d5db',
                               borderRadius: '6px',
                               fontSize: '0.875rem',
                               background: 'white'
                             }}
                           >
                             <option value="all">All Types</option>
                             <option value="article">Articles</option>
                             <option value="video">Videos</option>
                             <option value="podcast">Podcasts</option>
                           </select>
                           
                           {allTags.length > 0 && (
                             <select
                               value={selectedTag}
                               onChange={(e) => setSelectedTag(e.target.value)}
                               style={{
                                 padding: '0.5rem',
                                 border: '1px solid #d1d5db',
                                 borderRadius: '6px',
                                 fontSize: '0.875rem',
                                 background: 'white'
                               }}
                             >
                               <option value="">All Tags</option>
                               {allTags.map((tag: string) => (
                                 <option key={tag} value={tag}>{tag}</option>
                               ))}
                             </select>
                           )}
                           
                           {(searchQuery || selectedType !== 'all' || selectedTag) && (
                             <button
                               onClick={() => {
                                 setSearchQuery('');
                                 setSelectedType('all');
                                 setSelectedTag('');
                               }}
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

                         {/* Sorting Controls */}
                         <div style={{ 
                           display: 'flex', 
                           gap: '1rem', 
                           marginTop: '1rem',
                           paddingTop: '1rem',
                           borderTop: '1px solid #e2e8f0',
                           alignItems: 'center',
                           flexWrap: 'wrap'
                         }}>
                           <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
                             Sort by:
                           </span>
                           
                           <select
                             value={sortBy}
                             onChange={(e) => setSortBy(e.target.value as any)}
                             style={{
                               padding: '0.375rem 0.5rem',
                               border: '1px solid #d1d5db',
                               borderRadius: '6px',
                               fontSize: '0.875rem',
                               background: 'white'
                             }}
                           >
                             <option value="date">Date Added</option>
                             <option value="title">Title (A-Z)</option>
                             <option value="quality">Quality Score</option>
                             <option value="type">Content Type</option>
                           </select>
                           
                           <button
                             onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                             style={{
                               padding: '0.375rem 0.75rem',
                               background: '#f3f4f6',
                               border: '1px solid #d1d5db',
                               borderRadius: '6px',
                               fontSize: '0.875rem',
                               cursor: 'pointer',
                               color: '#374151',
                               display: 'flex',
                               alignItems: 'center',
                               gap: '0.25rem'
                             }}
                             title={`Currently sorting ${sortOrder === 'desc' ? 'descending' : 'ascending'}`}
                           >
                             {sortOrder === 'desc' ? '↓' : '↑'} 
                             {sortOrder === 'desc' ? 'Desc' : 'Asc'}
                           </button>
                           
                           <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                             Showing {filteredContent.length} items
                           </span>
                         </div>
                       </div>
                     )}
                    {loadingContent ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                        Loading your content...
                      </div>
                    ) : userContent.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                        No content yet. Start by analyzing a URL above!
                      </div>
                    ) : filteredContent.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                        <div style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                          No content matches your filters
                        </div>
                        <div style={{ fontSize: '0.875rem' }}>
                          Try adjusting your search terms or clearing the filters
                        </div>
                      </div>
                    ) : (
                      <div className="content-items">
                        {filteredContent.map((item: any) => (
                          <div 
                            key={item.id} 
                            className="content-item"
                            onClick={() => openContentDetails(item)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="content-header">
                              <div className="content-icon">
                                {item.type === 'video' ? '🎥' : 
                                 item.type === 'podcast' ? '🎧' : '📖'}
                              </div>
                              <div className="content-details">
                                <h5 className="content-title">{item.title}</h5>
                                <p className="content-description">{item.description}</p>
                                
                                {item.aiSummary && (
                                  <div style={{ 
                                    background: '#f0f9ff', 
                                    border: '1px solid #bae6fd',
                                    borderRadius: '6px',
                                    padding: '0.75rem',
                                    margin: '0.5rem 0',
                                    fontSize: '0.875rem'
                                  }}>
                                    <div style={{ 
                                      fontWeight: '500', 
                                      color: '#0369a1', 
                                      marginBottom: '0.25rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.25rem'
                                    }}>
                                      🤖 AI Summary
                                    </div>
                                    <div style={{ color: '#075985' }}>{item.aiSummary}</div>
                                  </div>
                                )}
                                
                                <div className="content-meta">
                                  <span>{item.source}</span>
                                  {item.readingTime && <span>{item.readingTime}</span>}
                                  {item.duration && <span>{item.duration}</span>}
                                  <span>{new Date(item.analyzedAt).toLocaleDateString()}</span>
                                  
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedContentForList(item);
                                      setShowAddToListModal(true);
                                    }}
                                    style={{
                                      background: '#f0fdf4',
                                      border: '1px solid #bbf7d0',
                                      borderRadius: '4px',
                                      padding: '0.25rem 0.5rem',
                                      fontSize: '0.75rem',
                                      cursor: 'pointer',
                                      color: '#15803d'
                                    }}
                                  >
                                    📚 Add to List
                                  </button>
                                  
                                  {!item.aiSummary && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        generateAISummary(item);
                                      }}
                                      disabled={generatingSummary === item.id}
                                      style={{
                                        background: generatingSummary === item.id ? '#f3f4f6' : '#eff6ff',
                                        border: '1px solid #dbeafe',
                                        borderRadius: '4px',
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.75rem',
                                        cursor: generatingSummary === item.id ? 'not-allowed' : 'pointer',
                                        color: '#1d4ed8'
                                      }}
                                    >
                                      {generatingSummary === item.id ? '🤖 Generating...' : '🤖 AI Summary'}
                                    </button>
                                  )}
                                </div>
                                <div className="content-tags">
                                  {item.tags.map((tag: string) => (
                                    <span key={tag} className="tag">{tag}</span>
                                  ))}
                                </div>
                              </div>
                              <div className={`quality-score ${item.qualityScore >= 80 ? 'quality-high' : item.qualityScore >= 60 ? 'quality-medium' : 'quality-low'}`}>
                                {item.qualityScore}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="sidebar">
                <div className="sidebar-card">
                  <h4>Your Stats</h4>
                  <div className="stats-list">
                    <div className="stat-item">
                      <span className="stat-label">Articles</span>
                      <span className="stat-value">
                        {userContent.filter((item: any) => item.type === 'article').length}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Videos</span>
                      <span className="stat-value">
                        {userContent.filter((item: any) => item.type === 'video').length}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Podcasts</span>
                      <span className="stat-value">
                        {userContent.filter((item: any) => item.type === 'podcast').length}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Total</span>
                      <span className="stat-value">{userContent.length}</span>
                    </div>
                  </div>
                </div>

                <div className="sidebar-card">
                  <h4>Browser Extension</h4>
                  <p>
                    Install our extension for automatic content tracking.
                  </p>
                  <Link href="/extension" className="btn btn-success" style={{ width: '100%' }}>
                    Install Extension
                  </Link>
                </div>

                <div className="sidebar-card">
                  <h4>🤖 Local AI Status</h4>
                  {aiInitializing ? (
                    <div style={{ color: '#f59e0b' }}>
                      <div style={{ marginBottom: '0.5rem' }}>⏳ Downloading AI model...</div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        First-time setup may take several minutes
                      </div>
                    </div>
                  ) : aiReady ? (
                    <div style={{ color: '#10b981' }}>
                      <div style={{ marginBottom: '0.5rem' }}>✅ AI Ready</div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        Local Phi-3.5 model loaded
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#6b7280' }}>
                      <div style={{ marginBottom: '0.5rem' }}>💤 AI Not Loaded</div>
                      <div style={{ fontSize: '0.875rem' }}>
                        Click "Generate AI Summary" to activate
                      </div>
                    </div>
                  )}
                </div>

                <div className="sidebar-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4>📚 Reading Lists</h4>
                    <button
                      onClick={() => setShowCreateListModal(true)}
                      style={{
                        background: '#eff6ff',
                        border: '1px solid #dbeafe',
                        borderRadius: '4px',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        color: '#1d4ed8'
                      }}
                    >
                      + New List
                    </button>
                  </div>
                  
                  {readingLists.length === 0 ? (
                    <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      No reading lists yet. Create your first list!
                    </div>
                  ) : (
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {readingLists.map((list: any) => (
                        <div 
                          key={list.id}
                          style={{
                            padding: '0.5rem',
                            marginBottom: '0.5rem',
                            background: '#f8fafc',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            border: '1px solid #e2e8f0'
                          }}
                        >
                          <div style={{ fontWeight: '500', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                            {list.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {list.contentIds.length} items
                            {list.isPublic && ' • Public'}
                            {list.isCollaborative && ' • Collaborative'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="sidebar-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4>🏷️ Your Tags</h4>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setShowTagModal(true)}
                        style={{
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '4px',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          color: '#15803d'
                        }}
                      >
                        + New Tag
                      </button>
                      <button
                        onClick={() => setShowTagManagerModal(true)}
                        style={{
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '4px',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          color: '#15803d'
                        }}
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                  
                  {tags.length === 0 ? (
                    <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      No custom tags yet. Create tags to organize your content!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {tags.slice(0, 10).map((tag: any) => (
                        <span 
                          key={tag.id}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            background: tag.color + '20',
                            color: tag.color,
                            borderRadius: '12px',
                            border: `1px solid ${tag.color}40`
                          }}
                        >
                          {tag.name} ({tag.usageCount})
                        </span>
                      ))}
                      {tags.length > 10 && (
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          +{tags.length - 10} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Content Details Modal */}
      {showContentModal && selectedContent && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={closeContentModal}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: '1', marginRight: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>
                      {selectedContent.type === 'video' ? '🎥' : 
                       selectedContent.type === 'podcast' ? '🎧' : '📖'}
                    </span>
                    <span style={{ 
                      fontSize: '0.875rem', 
                      color: '#6b7280', 
                      textTransform: 'capitalize' 
                    }}>
                      {selectedContent.type}
                    </span>
                  </div>
                  <h2 style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: '600', 
                    color: '#1f2937',
                    marginBottom: '0.5rem',
                    lineHeight: '1.3'
                  }}>
                    {selectedContent.title}
                  </h2>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    <span>{selectedContent.source}</span>
                    {selectedContent.readingTime && <span>{selectedContent.readingTime}</span>}
                    {selectedContent.duration && <span>{selectedContent.duration}</span>}
                    <span>{new Date(selectedContent.analyzedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={closeContentModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#6b7280',
                    padding: '0.25rem'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                  Description
                </h3>
                <p style={{ color: '#374151', lineHeight: '1.6' }}>
                  {selectedContent.description}
                </p>
              </div>

              {selectedContent.aiSummary ? (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                    🤖 AI Summary
                  </h3>
                  <div style={{ 
                    background: '#f0f9ff', 
                    border: '1px solid #bae6fd',
                    borderRadius: '8px',
                    padding: '1rem',
                    color: '#075985',
                    lineHeight: '1.6'
                  }}>
                    {selectedContent.aiSummary}
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                    🤖 AI Summary
                  </h3>
                  <button
                    onClick={() => generateAISummary(selectedContent)}
                    disabled={generatingSummary === selectedContent.id}
                    style={{
                      background: generatingSummary === selectedContent.id ? '#f3f4f6' : '#eff6ff',
                      border: '1px solid #dbeafe',
                      borderRadius: '6px',
                      padding: '0.75rem 1rem',
                      cursor: generatingSummary === selectedContent.id ? 'not-allowed' : 'pointer',
                      color: '#1d4ed8',
                      width: '100%',
                      fontSize: '0.875rem'
                    }}
                  >
                    {generatingSummary === selectedContent.id ? '🤖 Generating AI Summary...' : '🤖 Generate AI Summary'}
                  </button>
                </div>
              )}

              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                  Quality Score
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className={`quality-score ${selectedContent.qualityScore >= 80 ? 'quality-high' : selectedContent.qualityScore >= 60 ? 'quality-medium' : 'quality-low'}`}>
                    {selectedContent.qualityScore}%
                  </div>
                  <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    {selectedContent.qualityScore >= 80 ? 'High Quality' : 
                     selectedContent.qualityScore >= 60 ? 'Medium Quality' : 'Lower Quality'}
                  </span>
                </div>
              </div>

              {selectedContent.tags.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                    Tags
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {selectedContent.tags.map((tag: string) => (
                      <span key={tag} className="tag" style={{ fontSize: '0.875rem' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                justifyContent: 'space-between',
                borderTop: '1px solid #e5e7eb',
                paddingTop: '1rem',
                marginTop: '1.5rem'
              }}>
                <button
                  onClick={() => deleteContent(selectedContent.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  🗑️ Delete
                </button>
                
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <a
                    href={selectedContent.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ textDecoration: 'none' }}
                  >
                    Open Original
                  </a>
                  <button
                    onClick={closeContentModal}
                    className="btn"
                    style={{ background: '#f3f4f6', color: '#374151' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Reading List Modal */}
      {showCreateListModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setShowCreateListModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
                  📚 Create Reading List
                </h2>
                <button
                  onClick={() => setShowCreateListModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#6b7280',
                    padding: '0.25rem'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const name = formData.get('name') as string;
                const description = formData.get('description') as string;
                const isPublic = formData.get('isPublic') === 'on';
                const isCollaborative = formData.get('isCollaborative') === 'on';
                
                if (name.trim()) {
                  createReadingList(name.trim(), description.trim(), isPublic, isCollaborative);
                }
              }}
              style={{ padding: '1.5rem' }}
            >
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  List Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="My Awesome Reading List"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Description
                </label>
                <textarea
                  name="description"
                  placeholder="Describe what this list is about..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="isPublic"
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                      Make public (others can view)
                    </span>
                  </label>
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="isCollaborative"
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                      Allow collaboration
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => setShowCreateListModal(false)}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    color: '#374151'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.75rem 1rem' }}
                >
                  Create List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add to Reading List Modal */}
      {showAddToListModal && selectedContentForList && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setShowAddToListModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
                  📚 Add to Reading List
                </h2>
                <button
                  onClick={() => setShowAddToListModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#6b7280',
                    padding: '0.25rem'
                  }}
                >
                  ×
                </button>
              </div>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Adding: {selectedContentForList.title}
              </p>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {readingLists.length === 0 ? (
                <div>
                  <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                    You don't have any reading lists yet. Create one first!
                  </p>
                  <button
                    onClick={() => {
                      setShowAddToListModal(false);
                      setShowCreateListModal(true);
                    }}
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                  >
                    Create Your First List
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.75rem' }}>
                      Select a reading list:
                    </h3>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {readingLists.map((list: any) => (
                        <div
                          key={list.id}
                          onClick={() => addToReadingList(list.id, selectedContentForList.id)}
                          style={{
                            padding: '0.75rem',
                            marginBottom: '0.5rem',
                            background: '#f8fafc',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            border: '1px solid #e2e8f0',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        >
                          <div style={{ fontWeight: '500', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                            {list.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {list.contentIds.length} items
                            {list.description && ` • ${list.description}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                    <button
                      onClick={() => {
                        setShowAddToListModal(false);
                        setShowCreateListModal(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        color: '#374151'
                      }}
                    >
                      + Create New List
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Tag Modal */}
      {showTagModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setShowTagModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
                  🏷️ Create Custom Tag
                </h2>
                <button
                  onClick={() => setShowTagModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#6b7280',
                    padding: '0.25rem'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const name = formData.get('name') as string;
                const category = formData.get('category') as string;
                const color = formData.get('color') as string;
                
                if (name.trim()) {
                  createManualTag(name.trim(), category.trim(), color);
                }
              }}
              style={{ padding: '1.5rem' }}
            >
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Tag Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="technology, personal-dev, fiction..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Category
                </label>
                <select
                  name="category"
                  defaultValue="general"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                    background: 'white'
                  }}
                >
                  <option value="general">General</option>
                  <option value="technology">Technology</option>
                  <option value="science">Science</option>
                  <option value="business">Business</option>
                  <option value="personal">Personal Development</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="education">Education</option>
                  <option value="health">Health & Wellness</option>
                  <option value="politics">Politics</option>
                  <option value="culture">Culture</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Color
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'].map((color) => (
                    <label key={color} style={{ cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="color"
                        value={color}
                        defaultChecked={color === '#3b82f6'}
                        style={{ display: 'none' }}
                      />
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: color,
                        border: '2px solid white',
                        boxShadow: '0 0 0 2px #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => setShowTagModal(false)}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    color: '#374151'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.75rem 1rem' }}
                >
                  Create Tag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 