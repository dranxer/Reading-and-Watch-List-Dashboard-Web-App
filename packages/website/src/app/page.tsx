'use client';

import { useState, useEffect } from 'react';
import { useUser, SignOutButton } from '@/lib/authClient';
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


// Saved items carry different timestamp fields depending on where they came from
const fmtDate = (it: any) => {
  const d = new Date(it?.analyzedAt || it?.createdAt || it?.timestamp || it?.savedAt || '');
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function ReadWatchTracker() {
  const { isSignedIn, user } = useUser();
  
  // Helper function to normalize content type field inconsistency
  const getContentType = (item: any): string => {
    return item.type || item.contentType || 'article';
  };
  
  // Helper function to check if content matches a type
  const isContentType = (item: any, type: string): boolean => {
    return item.type === type || item.contentType === type;
  };
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
  const [aiCached, setAiCached] = useState(false);          // model files already in this browser
  const [aiSupported, setAiSupported] = useState(true);     // WebGPU available
  const [aiProgress, setAiProgress] = useState<{ phase: 'downloading' | 'loading'; percent: number } | null>(null);
  const [readingLists, setReadingLists] = useState<any[]>([]);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [selectedContentForList, setSelectedContentForList] = useState<any>(null);
  const [showListDetailsModal, setShowListDetailsModal] = useState(false);
  const [selectedList, setSelectedList] = useState<any>(null);
  const [showEditListModal, setShowEditListModal] = useState(false);
  const [editingList, setEditingList] = useState<any>(null);
  const [listContents, setListContents] = useState<any[]>([]);

  // Filter and sort content based on search, filters, and sorting
  const processedContent = userContent
    .filter((item: any) => {
      const matchesSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.source.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = selectedType === 'all' || isContentType(item, selectedType);
      
      const matchesTag = !selectedTag || (item.tags && item.tags.includes(selectedTag));
      
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
          comparison = getContentType(a).localeCompare(getContentType(b));
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  // Remove old filteredContent definition and use processedContent instead
  const filteredContent = processedContent;

  // Get all unique tags from user content
  const allTags = [...new Set(userContent.flatMap((item: any) => item.tags || []))].sort();

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
        alert('Content deleted successfully!');
      } else {
        alert(`Failed to delete: ${result.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete content. Please try again.');
    }
  };

  // Save a summary on the server so it is still there after a refresh
  const saveSummary = async (contentId: string, aiSummary: string) => {
    setUserContent(prev => prev.map((item: any) => item.id === contentId ? { ...item, aiSummary } : item));
    setSelectedContent((prev: any) => prev?.id === contentId ? { ...prev, aiSummary } : prev);
    try {
      await fetch(`/api/content/${contentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiSummary }),
      });
    } catch (error) {
      console.error('Could not save the summary:', error);
    }
  };

  const generateAISummary = async (content: any) => {
    setGeneratingSummary(content.id);
    // What the summary is made from: the description, or the page text the extension captured
    const sourceText = String(content.description || content.content || '').replace(content.title || '', '').trim().slice(0, 1500) || content.title;
    try {
      const { webllmService } = await import('@/lib/webllm');
      if (!webllmService.supported()) throw new Error('webgpu-unavailable');
      if (!webllmService.isReady()) {
        setAiInitializing(true);
        await webllmService.initialize(p => setAiProgress({ phase: p.phase, percent: p.percent }));
        setAiInitializing(false);
        setAiProgress(null);
        setAiReady(true);
        setAiCached(true);
      }
      const summary = await webllmService.generateSummary(content.title, sourceText, getContentType(content));
      if (!summary) throw new Error('empty-summary');
      await saveSummary(content.id, summary);
    } catch (error) {
      console.error('Local AI summary failed, using the page description instead:', error);
      setAiInitializing(false);
      setAiProgress(null);
      if (String(error).includes('webgpu-unavailable')) setAiSupported(false);
      // Fallback: a short summary taken from the page's own description, made on the server
      try {
        const response = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: content.title, description: sourceText, contentType: getContentType(content) }),
        });
        const result = await response.json();
        if (result.success) await saveSummary(content.id, result.summary);
      } catch (fallbackError) {
        console.error('Summary fallback failed:', fallbackError);
      }
    } finally {
      setGeneratingSummary(null);
    }
  };

  const toggleContentVisibility = async (contentId: string, isPublic: boolean) => {
    try {
      const response = await fetch(`/api/content/${contentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPublic }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        setUserContent(userContent.map(item => 
          item.id === contentId ? { ...item, isPublic } : item
        ));
        alert(`Content is now ${isPublic ? 'public' : 'private'}!`);
      } else {
        alert(`Failed to update content visibility: ${result.error}`);
      }
    } catch (error) {
      console.error('Update content visibility error:', error);
      alert('Failed to update content visibility. Please try again.');
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
        alert('Reading list created successfully!');
      } else {
        alert(`Failed to create list: ${result.error}`);
      }
    } catch (error) {
      console.error('Create list error:', error);
      alert('Failed to create reading list. Please try again.');
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
        alert('Added to reading list successfully!');
      } else {
        alert(`Failed to add to list: ${result.error}`);
      }
    } catch (error) {
      console.error('Add to list error:', error);
      alert('Failed to add to reading list. Please try again.');
    }
  };

  const updateReadingList = async (listId: string, updatedData: any) => {
    try {
      const response = await fetch(`/api/lists/${listId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        setReadingLists(readingLists.map(list => 
          list.id === listId ? { ...list, ...updatedData } : list
        ));
        setShowEditListModal(false);
        setEditingList(null);
        
        // Update selected list if it's currently being viewed
        if (selectedList?.id === listId) {
          setSelectedList({ ...selectedList, ...updatedData });
        }
        
        alert('Reading list updated successfully!');
      } else {
        alert(`Failed to update list: ${result.error}`);
      }
    } catch (error) {
      console.error('Update list error:', error);
      alert('Failed to update reading list. Please try again.');
    }
  };

  const deleteReadingList = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this reading list? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/lists/${listId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        // Remove from local state
        setReadingLists(readingLists.filter(list => list.id !== listId));
        
        // Close modals if this list was being viewed/edited
        if (selectedList?.id === listId) {
          setShowListDetailsModal(false);
          setSelectedList(null);
        }
        if (editingList?.id === listId) {
          setShowEditListModal(false);
          setEditingList(null);
        }
        
        alert('Reading list deleted successfully!');
      } else {
        alert(`Failed to delete list: ${result.error}`);
      }
    } catch (error) {
      console.error('Delete list error:', error);
      alert('Failed to delete reading list. Please try again.');
    }
  };

  const removeFromReadingList = async (listId: string, contentId: string) => {
    try {
      const response = await fetch(`/api/lists/${listId}/remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contentId }),
      });

      const result = await response.json();

      if (result.success) {
        // Update list contents
        setListContents(listContents.filter(item => item.id !== contentId));
        
        // Update reading lists to reflect new count
        setReadingLists(readingLists.map(list => 
          list.id === listId 
            ? { ...list, contentIds: list.contentIds.filter((id: string) => id !== contentId) }
            : list
        ));
        
        alert('Removed from reading list successfully!');
      } else {
        alert(`Failed to remove from list: ${result.error}`);
      }
    } catch (error) {
      console.error('Remove from list error:', error);
      alert('Failed to remove from reading list. Please try again.');
    }
  };

  const loadListContents = async (listId: string) => {
    try {
      const response = await fetch(`/api/lists/${listId}/contents`);
      const result = await response.json();

      if (result.success) {
        setListContents(result.data || []);
      } else {
        console.error('Failed to load list contents:', result.error);
        setListContents([]);
      }
    } catch (error) {
      console.error('Load list contents error:', error);
      setListContents([]);
    }
  };

  const openListDetails = (list: any) => {
    setSelectedList(list);
    setShowListDetailsModal(true);
    loadListContents(list.id);
  };

  const closeListDetails = () => {
    setShowListDetailsModal(false);
    setSelectedList(null);
    setListContents([]);
  };

  const openEditList = (list: any) => {
    setEditingList(list);
    setShowEditListModal(true);
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
          alert(`Successfully imported ${importedData.length} items!`);
        } else {
          alert('Invalid file format. Please select a valid JSON file.');
        }
      } catch (error) {
        alert('Error reading file. Please make sure it\'s a valid JSON file.');
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  // Load user content
  const loadUserContent = async (silent = false) => {
    if (!isSignedIn) return;
    
    if (!silent && !userContent.length) setLoadingContent(true);
    try {
      console.log('Loading user content...');
      const response = await fetch('/api/content');
      const result = await response.json();
      
      console.log('Content API response:', result);
      
      if (result.success) {
        console.log('Content loaded:', result.data.length, 'items');
        
        // Add automatic tags to items that don't have them
        const updatedData = result.data.map((item: any) => {
          if (!item.tags || item.tags.length === 0) {
            const autoTags = generateDomainTags(item.url);
            return { ...item, tags: autoTags };
          }
          return item;
        });
        
        setUserContent(updatedData);
      } else {
        console.error('Failed to load content:', result.error);
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

  // Show the last known library instantly on reload, then refresh it from the server
  const SNAPSHOT_KEY = 'readwatch:snapshot:v1';
  useEffect(() => {
    try {
      const snap = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || 'null');
      if (snap?.content) setUserContent(snap.content);
      if (snap?.lists) setReadingLists(snap.lists);
    } catch { /* no snapshot yet */ }
  }, []);
  useEffect(() => {
    if (!userContent.length && !readingLists.length) return;
    try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ content: userContent, lists: readingLists })); } catch { /* storage full or blocked */ }
  }, [userContent, readingLists]);

  useEffect(() => {
    if (isSignedIn) {
      loadUserContent();
      loadReadingLists();
      loadUserProfile();
    }
  }, [isSignedIn, user?.id]);

  // Pick up items the browser extension saved: refresh when this tab is shown again, when the
  // extension says it synced something, and every 20 s while the tab is visible.
  useEffect(() => {
    if (!isSignedIn) return;
    const refresh = () => { if (document.visibilityState === 'visible') { loadUserContent(true); loadReadingLists(); } };
    const onMessage = (e: MessageEvent) => { if (e.source === window && e.data?.source === 'readwatch-extension') refresh(); };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('message', onMessage);
    const timer = window.setInterval(refresh, 20000);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('message', onMessage);
      window.clearInterval(timer);
    };
  }, [isSignedIn]);

  // Is the AI model already in this browser? (cheap check, no download)
  useEffect(() => {
    import('@/lib/webllm').then(async ({ webllmService }) => {
      setAiSupported(webllmService.supported());
      setAiCached(await webllmService.isCached());
    }).catch(() => undefined);
  }, []);

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
        alert(`Content analyzed!\n\nTitle: ${result.data.title}\nType: ${result.data.type}\nQuality Score: ${result.data.qualityScore}%\nTags: ${result.data.tags.join(', ')}`);
        setUrl('');
        // Refresh content list
        loadUserContent();
      } else {
        alert(`Analysis failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Failed to analyze content. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const detectContentType = (domain: string): 'article' | 'video' | 'podcast' => {
    if (domain.includes('youtube.com') || domain.includes('vimeo.com')) return 'video';
    if (domain.includes('spotify.com') || domain.includes('podcasts.apple.com')) return 'podcast';
    return 'article';
  };

  const generateDomainTags = (url: string): string[] => {
    try {
      const domain = new URL(url).hostname.toLowerCase().replace('www.', '');
      const tags: string[] = [];

      // Get clean site name
      let siteName = '';
      if (domain.includes('youtube.com')) {
        siteName = 'youtube';
      } else if (domain.includes('medium.com')) {
        siteName = 'medium';
      } else if (domain.includes('github.com')) {
        siteName = 'github';
      } else if (domain.includes('stackoverflow.com')) {
        siteName = 'stackoverflow';
      } else if (domain.includes('reddit.com')) {
        siteName = 'reddit';
      } else if (domain.includes('twitter.com') || domain.includes('x.com')) {
        siteName = 'twitter';
      } else if (domain.includes('linkedin.com')) {
        siteName = 'linkedin';
      } else if (domain.includes('facebook.com')) {
        siteName = 'facebook';
      } else if (domain.includes('instagram.com')) {
        siteName = 'instagram';
      } else if (domain.includes('tiktok.com')) {
        siteName = 'tiktok';
      } else if (domain.includes('vimeo.com')) {
        siteName = 'vimeo';
      } else if (domain.includes('twitch.tv')) {
        siteName = 'twitch';
      } else if (domain.includes('spotify.com')) {
        siteName = 'spotify';
      } else if (domain.includes('dev.to')) {
        siteName = 'dev.to';
      } else if (domain.includes('news.ycombinator.com')) {
        siteName = 'hackernews';
      } else if (domain.includes('techcrunch.com')) {
        siteName = 'techcrunch';
      } else if (domain.includes('wired.com')) {
        siteName = 'wired';
      } else if (domain.includes('theverge.com')) {
        siteName = 'theverge';
      } else if (domain.includes('cnn.com')) {
        siteName = 'cnn';
      } else if (domain.includes('bbc.com')) {
        siteName = 'bbc';
      } else if (domain.includes('nytimes.com')) {
        siteName = 'nytimes';
      } else if (domain.includes('washingtonpost.com')) {
        siteName = 'washingtonpost';
      } else if (domain.includes('wikipedia.org')) {
        siteName = 'wikipedia';
      } else if (domain.includes('coursera.org')) {
        siteName = 'coursera';
      } else if (domain.includes('udemy.com')) {
        siteName = 'udemy';
      } else if (domain.includes('notion.so')) {
        siteName = 'notion';
      } else if (domain.includes('figma.com')) {
        siteName = 'figma';
      } else {
        // For unknown domains, extract the main part
        siteName = domain.replace(/\.(com|org|net|edu|gov|io|co|ai)$/, '');
      }

      // Add site name if we have one
      if (siteName) {
        tags.push(siteName);
      }

      // Determine and add content type
      let contentType = '';
      if (domain.includes('youtube.com') || domain.includes('vimeo.com') || domain.includes('twitch.tv')) {
        contentType = 'video';
      } else if (domain.includes('spotify.com') || domain.includes('podcasts.apple.com')) {
        contentType = 'podcast';
      } else {
        contentType = 'article';
      }

      tags.push(contentType);

      return tags;
    } catch (error) {
      console.error('Error generating domain tags:', error);
      return ['unknown', 'article'];
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--paper)' }}>
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <h1 className="logo">ReadWatch</h1>
          
          <nav className="nav">
            {isSignedIn ? (
              <>
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
                        background: 'var(--surface-2)',
                        color: 'var(--ink-2)'
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
                <h3 className="feature-title">AI-Powered Analysis</h3>
                <p className="feature-description">Local LLM analyzes content quality and generates summaries</p>
              </div>
              
              <div className="feature-card">
                <h3 className="feature-title">Browser Extension</h3>
                <p className="feature-description">Automatically track articles, videos, and podcasts</p>
              </div>
              
              <div className="feature-card">
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
            {/* Welcome */}
            <div className="welcome">
              <div>
                <h2>{user?.firstName && user.firstName !== 'Guest' ? `${user.firstName}'s library` : 'Your library'}</h2>
                <p>{userContent.length} saved {userContent.length === 1 ? 'item' : 'items'} across articles and videos</p>
              </div>
              {user?.id?.startsWith('guest_') && (
                <span className="demo-note">Demo account with sample reading. What you add stays in this browser.</span>
              )}
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
                                background: 'var(--surface-2)',
                                border: '1px solid var(--line)',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                color: 'var(--ink-2)'
                              }}
                              title="Export your content as JSON"
                            >
                              Export
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
                                  background: 'var(--surface-2)',
                                  border: '1px solid var(--line)',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  color: 'var(--ink-2)',
                                  display: 'inline-block'
                                }}
                                title="Import content from JSON file"
                              >
                                Import
                              </span>
                            </label>
                          </>
                        )}
                        <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                          {filteredContent.length} of {userContent.length} items
                        </span>
                      </div>
                    </div>
                    
                                         {/* Search and Filters */}
                     {userContent.length > 0 && (
                       <div style={{ 
                         background: 'var(--surface-2)', 
                         padding: '1rem', 
                         borderRadius: '8px', 
                         marginBottom: '1rem',
                         border: '1px solid var(--line)'
                       }}>
                         <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                           <input
                             type="text"
                             placeholder="Search content..."
                             value={searchQuery}
                             onChange={(e) => setSearchQuery(e.target.value)}
                             style={{
                               padding: '0.5rem',
                               border: '1px solid var(--line)',
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
                               border: '1px solid var(--line)',
                               borderRadius: '6px',
                               fontSize: '0.875rem',
                               background: 'var(--surface)'
                             }}
                           >
                             <option value="all">All Types</option>
                             <option value="article">Articles</option>
                             <option value="video">Videos</option>
                             <option value="podcast">Podcasts</option>
                           </select>
                           
                             <select
                               value={selectedTag}
                               onChange={(e) => setSelectedTag(e.target.value)}
                               style={{
                                 padding: '0.5rem',
                                 border: '1px solid var(--line)',
                                 borderRadius: '6px',
                                 fontSize: '0.875rem',
                               background: 'var(--surface)',
                               minWidth: '130px'
                               }}
                             >
                               <option value="">All Tags</option>
                             {allTags.map((tag) => (
                               <option key={tag} value={tag}>
                                 #{tag}
                               </option>
                               ))}
                             </select>
                           
                           {(searchQuery || selectedType !== 'all' || selectedTag) && (
                             <button
                               onClick={() => {
                                 setSearchQuery('');
                                 setSelectedType('all');
                                 setSelectedTag('');
                               }}
                               style={{
                                 padding: '0.5rem 0.75rem',
                                 background: 'var(--surface-2)',
                                 border: '1px solid var(--line)',
                                 borderRadius: '6px',
                                 fontSize: '0.875rem',
                                 cursor: 'pointer',
                                 color: 'var(--ink-2)'
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
                           borderTop: '1px solid var(--line)',
                           alignItems: 'center',
                           flexWrap: 'wrap'
                         }}>
                           <span style={{ fontSize: '0.875rem', color: 'var(--muted)', fontWeight: '500' }}>
                             Sort by:
                           </span>
                           
                           <select
                             value={sortBy}
                             onChange={(e) => setSortBy(e.target.value as any)}
                             style={{
                               padding: '0.375rem 0.5rem',
                               border: '1px solid var(--line)',
                               borderRadius: '6px',
                               fontSize: '0.875rem',
                               background: 'var(--surface)'
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
                               background: 'var(--surface-2)',
                               border: '1px solid var(--line)',
                               borderRadius: '6px',
                               fontSize: '0.875rem',
                               cursor: 'pointer',
                               color: 'var(--ink-2)',
                               display: 'flex',
                               alignItems: 'center',
                               gap: '0.25rem'
                             }}
                             title={`Currently sorting ${sortOrder === 'desc' ? 'descending' : 'ascending'}`}
                           >
                             {sortOrder === 'desc' ? '↓' : '↑'} 
                             {sortOrder === 'desc' ? 'Desc' : 'Asc'}
                           </button>
                           
                           <span style={{ fontSize: '0.75rem', color: 'var(--muted-2)' }}>
                             Showing {filteredContent.length} items
                           </span>
                         </div>
                       </div>
                     )}
                    {loadingContent ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                        Loading your content...
                      </div>
                    ) : userContent.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                        No content yet. Start by analyzing a URL above!
                      </div>
                    ) : filteredContent.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
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
                              <div className={`content-icon${isContentType(item, 'video') ? ' video' : ''}`}>
                                {isContentType(item, 'video') ? 'Video' : isContentType(item, 'podcast') ? 'Podcast' : 'Article'}
                              </div>
                              <div className="content-details">
                                <h5 className="content-title">{item.title}</h5>
                                <p className="content-description">{item.description}</p>
                                
                                {item.aiSummary && (
                                  <div style={{ 
                                    background: 'var(--accent-soft)', 
                                    border: '1px solid var(--line)',
                                    borderRadius: '6px',
                                    padding: '0.75rem',
                                    margin: '0.5rem 0',
                                    fontSize: '0.875rem'
                                  }}>
                                    <div style={{ 
                                      fontWeight: '500', 
                                      color: 'var(--accent)', 
                                      marginBottom: '0.25rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.25rem'
                                    }}>
                                      AI Summary
                                    </div>
                                    <div style={{ color: 'var(--ink-2)' }}>{item.aiSummary}</div>
                                  </div>
                                )}
                                
                                <div className="content-meta">
                                  <span>{item.source}</span>
                                  {item.readingTime && <span>{item.readingTime}</span>}
                                  {item.duration && <span>{item.duration}</span>}
                                  <span>{fmtDate(item)}</span>
                                  
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedContentForList(item);
                                      setShowAddToListModal(true);
                                    }}
                                    style={{
                                      background: 'var(--good-soft)',
                                      border: '1px solid var(--good-soft)',
                                      borderRadius: '4px',
                                      padding: '0.25rem 0.5rem',
                                      fontSize: '0.75rem',
                                      cursor: 'pointer',
                                      color: 'var(--good)'
                                    }}
                                  >
                                    Add to List
                                  </button>
                                  
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleContentVisibility(item.id, !item.isPublic);
                                    }}
                                    style={{
                                      background: item.isPublic ? 'var(--warn-soft)' : 'var(--surface-2)',
                                      border: item.isPublic ? '1px solid var(--warn)' : '1px solid var(--line)',
                                      borderRadius: '4px',
                                      padding: '0.25rem 0.5rem',
                                      fontSize: '0.75rem',
                                      cursor: 'pointer',
                                      color: item.isPublic ? 'var(--warn)' : 'var(--ink-2)'
                                    }}
                                  >
                                    {item.isPublic ? 'Public' : 'Private'}
                                  </button>
                                  
                                  {!item.aiSummary && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        generateAISummary(item);
                                      }}
                                      disabled={generatingSummary === item.id}
                                      style={{
                                        background: generatingSummary === item.id ? 'var(--surface-2)' : 'var(--accent-soft)',
                                        border: '1px solid var(--accent-soft)',
                                        borderRadius: '4px',
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.75rem',
                                        cursor: generatingSummary === item.id ? 'not-allowed' : 'pointer',
                                        color: 'var(--accent-strong)'
                                      }}
                                    >
                                      {generatingSummary === item.id ? 'Generating...' : 'AI Summary'}
                                    </button>
                                  )}
                                </div>
                                <div className="content-tags">
                                  {item.tags && item.tags.length > 0 ? (
                                    <>
                                      {item.tags.slice(0, 4).map((tag: string, tagIndex: number) => (
                                        <span 
                                          key={`tag-${item.id}-${tagIndex}-${tag}`}
                                          className="tag"
                                          style={{
                                            background: 'var(--accent-soft)',
                                            border: '1px solid var(--line)',
                                            color: 'var(--accent)',
                                            fontSize: '0.75rem',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '0.375rem',
                                            display: 'inline-block',
                                            marginRight: '0.25rem',
                                            marginBottom: '0.25rem'
                                          }}
                                        >
                                          #{tag}
                                        </span>
                                      ))}
                                      {item.tags.length > 4 && (
                                        <span 
                                          className="tag"
                                          style={{
                                            background: 'var(--surface-2)',
                                            border: '1px solid var(--line)',
                                            color: 'var(--muted)',
                                            fontSize: '0.75rem',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '0.375rem',
                                            display: 'inline-block'
                                          }}
                                        >
                                          +{item.tags.length - 4} more
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <span 
                                      className="tag tag-default"
                                      style={{
                                        background: 'var(--paper)',
                                        border: '1px solid var(--line)',
                                        color: 'var(--muted-2)',
                                        fontSize: '0.75rem',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '0.375rem',
                                        display: 'inline-block'
                                      }}
                                    >
                                      No tags
                                    </span>
                                  )}
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
                        {userContent.filter((item: any) => isContentType(item, 'article')).length}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Videos</span>
                      <span className="stat-value">
                        {userContent.filter((item: any) => isContentType(item, 'video')).length}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Podcasts</span>
                      <span className="stat-value">
                        {userContent.filter((item: any) => isContentType(item, 'podcast')).length}
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
                  <h4>Local AI summaries</h4>
                  {aiInitializing && aiProgress ? (
                    <div style={{ color: 'var(--warn)' }}>
                      <div style={{ marginBottom: '0.4rem' }}>
                        {aiProgress.phase === 'downloading' ? 'Downloading the AI model' : 'Loading the AI model from this browser'}: {aiProgress.percent}%
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: 'var(--surface-2)', overflow: 'hidden' }}>
                        <div style={{ width: `${aiProgress.percent}%`, height: '100%', background: 'var(--accent)', transition: 'width .3s' }} />
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.4rem' }}>
                        {aiProgress.phase === 'downloading' ? 'About 300 MB, one time only. Your browser keeps it.' : 'Already downloaded. This takes a few seconds.'}
                      </div>
                    </div>
                  ) : aiReady ? (
                    <div style={{ color: 'var(--good)' }}>
                      <div style={{ marginBottom: '0.4rem' }}>Ready</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Qwen2.5 0.5B is running on your device.</div>
                    </div>
                  ) : !aiSupported ? (
                    <div style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                      This browser has no WebGPU, so summaries are taken from each page&apos;s own description.
                    </div>
                  ) : (
                    <div style={{ color: 'var(--muted)' }}>
                      <div style={{ marginBottom: '0.4rem' }}>{aiCached ? 'Downloaded, not loaded yet' : 'Not downloaded yet'}</div>
                      <div style={{ fontSize: '0.875rem' }}>
                        {aiCached ? 'Click "AI Summary" on any item: it loads from this browser in seconds.' : 'Click "AI Summary" on any item to download the model once (about 300 MB).'}
                      </div>
                    </div>
                  )}
                </div>

                <div className="sidebar-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4>Reading Lists</h4>
                    <button
                      onClick={() => setShowCreateListModal(true)}
                      style={{
                        background: 'var(--accent-soft)',
                        border: '1px solid var(--accent-soft)',
                        borderRadius: '4px',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        color: 'var(--accent-strong)'
                      }}
                    >
                      + New List
                    </button>
                  </div>
                  
                  {readingLists.length === 0 ? (
                    <div style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                      No reading lists yet. Create your first list!
                    </div>
                  ) : (
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {readingLists.map((list: any) => (
                        <div 
                          key={list.id}
                          style={{
                            padding: '0.75rem',
                            marginBottom: '0.5rem',
                            background: 'var(--surface-2)',
                            borderRadius: '8px',
                            border: '1px solid var(--line)',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--surface-2)';
                            e.currentTarget.style.borderColor = 'var(--line)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--surface-2)';
                            e.currentTarget.style.borderColor = 'var(--line)';
                          }}
                        >
                          <div 
                            style={{ 
                            cursor: 'pointer',
                              marginBottom: '0.5rem'
                            }}
                            onClick={() => openListDetails(list)}
                          >
                            <div style={{ 
                              fontWeight: '600', 
                              fontSize: '0.875rem', 
                              marginBottom: '0.25rem',
                              color: 'var(--ink)'
                            }}>
                              {list.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                              {list.contentIds?.length || 0} items
                            {list.isPublic && ' • Public'}
                            {list.isCollaborative && ' • Collaborative'}
                          </div>
                            {list.description && (
                              <div style={{ 
                                fontSize: '0.75rem', 
                                color: 'var(--muted-2)',
                                marginTop: '0.25rem',
                                fontStyle: 'italic'
                              }}>
                                {list.description.length > 50 
                                  ? list.description.substring(0, 50) + '...'
                                  : list.description
                                }
                    </div>
                  )}
                </div>

                          <div style={{ 
                            display: 'flex', 
                            gap: '0.5rem',
                            borderTop: '1px solid var(--line)',
                            paddingTop: '0.5rem'
                          }}>
                      <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openListDetails(list);
                              }}
                        style={{
                                background: 'var(--accent-soft)',
                                border: '1px solid var(--accent-soft)',
                          borderRadius: '4px',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                                color: 'var(--accent-strong)'
                        }}
                      >
                              View
                      </button>
                            
                      <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditList(list);
                              }}
                        style={{
                                background: 'var(--accent-soft)',
                                border: '1px solid var(--line)',
                          borderRadius: '4px',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                                color: 'var(--accent)'
                        }}
                      >
                              Edit
                      </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteReadingList(list.id);
                              }}
                          style={{
                                background: 'var(--danger-soft)',
                                border: '1px solid var(--danger-soft)',
                                borderRadius: '4px',
                            padding: '0.25rem 0.5rem',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                color: 'var(--danger)'
                              }}
                              aria-label={`Delete ${list.name}`}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
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
              backgroundColor: 'var(--surface)',
              borderRadius: '12px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: '1', marginRight: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>
                      {isContentType(selectedContent, 'video') ? '' : 
                       isContentType(selectedContent, 'podcast') ? '' : ''}
                    </span>
                    <span style={{ 
                      fontSize: '0.875rem', 
                      color: 'var(--muted)', 
                      textTransform: 'capitalize' 
                    }}>
                      {getContentType(selectedContent)}
                    </span>
                  </div>
                  <h2 style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: '600', 
                    color: 'var(--ink)',
                    marginBottom: '0.5rem',
                    lineHeight: '1.3'
                  }}>
                    {selectedContent.title}
                  </h2>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
                    <span>{selectedContent.source}</span>
                    {selectedContent.readingTime && <span>{selectedContent.readingTime}</span>}
                    {selectedContent.duration && <span>{selectedContent.duration}</span>}
                    <span>{fmtDate(selectedContent)}</span>
                  </div>
                </div>
                <button
                  onClick={closeContentModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: 'var(--muted)',
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
                <p style={{ color: 'var(--ink-2)', lineHeight: '1.6' }}>
                  {selectedContent.description}
                </p>
              </div>

              {selectedContent.aiSummary ? (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                    AI Summary
                  </h3>
                  <div style={{ 
                    background: 'var(--accent-soft)', 
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '1rem',
                    color: 'var(--ink-2)',
                    lineHeight: '1.6'
                  }}>
                    {selectedContent.aiSummary}
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                    AI Summary
                  </h3>
                  <button
                    onClick={() => generateAISummary(selectedContent)}
                    disabled={generatingSummary === selectedContent.id}
                    style={{
                      background: generatingSummary === selectedContent.id ? 'var(--surface-2)' : 'var(--accent-soft)',
                      border: '1px solid var(--accent-soft)',
                      borderRadius: '6px',
                      padding: '0.75rem 1rem',
                      cursor: generatingSummary === selectedContent.id ? 'not-allowed' : 'pointer',
                      color: 'var(--accent-strong)',
                      width: '100%',
                      fontSize: '0.875rem'
                    }}
                  >
                    {generatingSummary === selectedContent.id ? 'Generating AI Summary...' : 'Generate AI Summary'}
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
                  <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                    {selectedContent.qualityScore >= 80 ? 'High Quality' : 
                     selectedContent.qualityScore >= 60 ? 'Medium Quality' : 'Lower Quality'}
                  </span>
                </div>
              </div>

              {selectedContent.tags && selectedContent.tags.length > 0 && (
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
                borderTop: '1px solid var(--line)',
                paddingTop: '1rem',
                marginTop: '1.5rem'
              }}>
                <button
                  onClick={() => deleteContent(selectedContent.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--danger-soft)',
                    border: '1px solid var(--danger-soft)',
                    borderRadius: '6px',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Delete
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
                    style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}
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
              backgroundColor: 'var(--surface)',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--ink)' }}>
                  Create Reading List
                </h2>
                <button
                  onClick={() => setShowCreateListModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: 'var(--muted)',
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
                  color: 'var(--ink-2)',
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
                    border: '1px solid var(--line)',
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
                  color: 'var(--ink-2)',
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
                    border: '1px solid var(--line)',
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
                    <span style={{ fontSize: '0.875rem', color: 'var(--ink-2)' }}>
                      Make public (others can view)
                    </span>
                  </label>
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="isCollaborative"
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '0.875rem', color: 'var(--ink-2)' }}>
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
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    color: 'var(--ink-2)'
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
              backgroundColor: 'var(--surface)',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--ink)' }}>
                  Add to Reading List
                </h2>
                <button
                  onClick={() => setShowAddToListModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: 'var(--muted)',
                    padding: '0.25rem'
                  }}
                >
                  ×
                </button>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Adding: {selectedContentForList.title}
              </p>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {readingLists.length === 0 ? (
                <div>
                  <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
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
                            background: 'var(--surface-2)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            border: '1px solid var(--line)',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--line)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-2)'}
                        >
                          <div style={{ fontWeight: '500', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                            {list.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                            {list.contentIds.length} items
                            {list.description && ` • ${list.description}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div style={{ borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
                    <button
                      onClick={() => {
                        setShowAddToListModal(false);
                        setShowCreateListModal(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--line)',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        color: 'var(--ink-2)'
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



      {/* Reading List Details Modal */}
      {showListDetailsModal && selectedList && (
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
          onClick={closeListDetails}
        >
          <div 
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '12px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--ink)', marginBottom: '0.5rem' }}>
                    {selectedList.name}
                  </h2>
                  {selectedList.description && (
                    <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                      {selectedList.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
                    <span>{listContents.length} items</span>
                    {selectedList.isPublic && <span>Public</span>}
                    {selectedList.isCollaborative && <span>Collaborative</span>}
                    <span>Created {new Date(selectedList.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                  <button
                    onClick={() => openEditList(selectedList)}
                    style={{
                      background: 'var(--accent-soft)',
                      border: '1px solid var(--line)',
                      borderRadius: '6px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      color: 'var(--accent)'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={closeListDetails}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      color: 'var(--muted)',
                      padding: '0.25rem'
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {listContents.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '3rem 1rem',
                  color: 'var(--muted)'
                }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    No content yet
                  </h3>
                  <p style={{ fontSize: '0.875rem' }}>
                    Add content to this list using the "Add to List" button on any content item.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {listContents.map((item: any) => (
                    <div 
                      key={item.id}
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--line)',
                        borderRadius: '8px',
                        padding: '1rem',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '1.2rem' }}>
                              {item.type === 'video' ? '' : 
                               item.type === 'podcast' ? '' : ''}
                            </span>
                            <h4 style={{ 
                              fontSize: '1rem', 
                              fontWeight: '600', 
                              color: 'var(--ink)',
                              margin: 0,
                              cursor: 'pointer'
                            }}
                            onClick={() => openContentDetails(item)}>
                              {item.title}
                            </h4>
                          </div>
                          
                          {item.description && (
                            <p style={{ 
                              color: 'var(--muted)', 
                              fontSize: '0.875rem', 
                              marginBottom: '0.5rem',
                              lineHeight: '1.5'
                            }}>
                              {item.description.length > 200 
                                ? item.description.substring(0, 200) + '...'
                                : item.description
                              }
                            </p>
                          )}
                          
                          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--muted-2)' }}>
                            <span>{item.source}</span>
                            {item.readingTime && <span>{item.readingTime}</span>}
                            {item.duration && <span>{item.duration}</span>}
                            <span>{fmtDate(item)}</span>
                            {item.qualityScore && (
                              <span>Quality: {item.qualityScore}%</span>
                            )}
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                          <button
                            onClick={() => window.open(item.url, '_blank')}
                            style={{
                              background: 'var(--accent-soft)',
                              border: '1px solid var(--accent-soft)',
                              borderRadius: '4px',
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              color: 'var(--accent-strong)'
                            }}
                          >
                            Open
                          </button>
                          <button
                            onClick={() => removeFromReadingList(selectedList.id, item.id)}
                            style={{
                              background: 'var(--danger-soft)',
                              border: '1px solid var(--danger-soft)',
                              borderRadius: '4px',
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              color: 'var(--danger)'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Reading List Modal */}
      {showEditListModal && editingList && (
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
          onClick={() => setShowEditListModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--ink)' }}>
                  Edit Reading List
                </h2>
                <button
                  onClick={() => setShowEditListModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: 'var(--muted)',
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
                  updateReadingList(editingList.id, {
                    name: name.trim(),
                    description: description.trim(),
                    isPublic,
                    isCollaborative
                  });
                }
              }}
              style={{ padding: '1.5rem' }}
            >
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: 'var(--ink-2)',
                  marginBottom: '0.5rem'
                }}>
                  List Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingList.name}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--line)',
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
                  color: 'var(--ink-2)',
                  marginBottom: '0.5rem'
                }}>
                  Description
                </label>
                <textarea
                  name="description"
                  defaultValue={editingList.description || ''}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--line)',
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
                      defaultChecked={editingList.isPublic}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '0.875rem', color: 'var(--ink-2)' }}>
                      Make public (others can view)
                    </span>
                </label>
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                      type="checkbox"
                      name="isCollaborative"
                      defaultChecked={editingList.isCollaborative}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '0.875rem', color: 'var(--ink-2)' }}>
                      Allow collaboration
                    </span>
                    </label>
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                justifyContent: 'space-between'
              }}>
                <button
                  type="button"
                  onClick={() => deleteReadingList(editingList.id)}
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'var(--danger-soft)',
                    border: '1px solid var(--danger-soft)',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    color: 'var(--danger)'
                  }}
                >
                  Delete List
                </button>
                
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowEditListModal(false)}
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    color: 'var(--ink-2)'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.75rem 1rem' }}
                >
                    Save Changes
                </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 