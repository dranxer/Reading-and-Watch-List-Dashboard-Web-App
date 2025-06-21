'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { SignInButton, SignOutButton } from '@clerk/nextjs';
import Link from 'next/link';
import styles from './Dashboard.module.css';

interface Content {
  _id: string;
  url: string;
  title: string;
  content: string;
  summary: string;
  type: string;
  qualityRating?: number;
  qualityExplanation?: string;
  isPublic: boolean;
  createdAt: string;
  user?: {
    displayName: string;
    firstName: string;
    lastName: string;
  };
}

interface Profile {
  userId: string;
  displayName: string;
  bio: string;
  website: string;
  isPublic: boolean;
  publicContentCount: number;
  followersCount: number;
  followingCount: number;
}

interface ContentItemWithSummaryProps {
  item: Content;
  onShowDetail: () => void;
  onDelete: () => void;
  isMyContent: boolean;
  selected: boolean;
  onSelect: (checked: boolean) => void;
}

// WebLLM instance - will be initialized once (client-side only)
let webLLM: any = null;
let isInitializing = false;

// Initialize WebLLM (client-side only)
async function initializeWebLLM() {
  if (typeof window === 'undefined') return null; // Server-side check
  if (webLLM || isInitializing) return webLLM;
  
  isInitializing = true;
  try {
    console.log('Initializing WebLLM...');
    
    // Dynamic import to avoid SSR issues
    const { CreateMLCEngine } = await import('@mlc-ai/web-llm');
    
    // Try different models in order of preference
    const models = [
      "Llama-3.1-8B-Instruct-q4f32_1-MLC",
      "Llama-2-7b-chat-hf-q4f16_1"
    ];
    
    let engine = null;
    let lastError = null;
    
    for (const model of models) {
      try {
        console.log(`Trying model: ${model}`);
        engine = await CreateMLCEngine(
          model,
          { 
            initProgressCallback: (progress: any) => {
              console.log("Model loading progress:", progress);
            }
          }
        );
        console.log(`Successfully loaded model: ${model}`);
        break;
      } catch (error) {
        console.log(`Failed to load model ${model}:`, error);
        lastError = error;
        continue;
      }
    }
    
    if (!engine) {
      throw new Error(`Failed to load any model. Last error: ${lastError}`);
    }
    
    webLLM = engine;
    console.log("WebLLM initialized successfully");
  } catch (error) {
    console.error("Failed to initialize WebLLM:", error);
    webLLM = null;
  } finally {
    isInitializing = false;
  }
  return webLLM;
}

// Simple but effective text summarization (no WebLLM required)
function createSmartSummary(text: string): string {
  try {
    // Clean and normalize text
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // Split into sentences
    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length === 0) {
      return 'No content available to summarize.';
    }
    
    if (sentences.length <= 3) {
      return sentences.join('. ') + '.';
    }
    
    // Score sentences based on word frequency and position
    const wordFreq: { [key: string]: number } = {};
    const words = cleanText.toLowerCase().match(/\b\w+\b/g) || [];
    
    // Count word frequency
    words.forEach(word => {
      if (word.length > 3) { // Ignore short words
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
    
    // Score sentences
    const sentenceScores = sentences.map((sentence, index) => {
      const sentenceWords = sentence.toLowerCase().match(/\b\w+\b/g) || [];
      let score = 0;
      
      // Score based on word frequency
      sentenceWords.forEach(word => {
        if (wordFreq[word]) {
          score += wordFreq[word];
        }
      });
      
      // Bonus for first few sentences (position bias)
      if (index < 3) {
        score *= 1.5;
      }
      
      // Bonus for longer sentences (more informative)
      if (sentence.length > 50) {
        score *= 1.2;
      }
      
      return { sentence, score };
    });
    
    // Sort by score and take top 3
    const topSentences = sentenceScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.sentence)
      .sort((a, b) => sentences.indexOf(a) - sentences.indexOf(b)); // Maintain original order
    
    return topSentences.join('. ') + '.';
  } catch (error) {
    console.error('Error in smart summarization:', error);
    // Fallback to simple summarization
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.slice(0, 3).join('. ') + '.';
  }
}

function ContentItemWithSummary({ item, onShowDetail, onDelete, isMyContent, selected, onSelect }: ContentItemWithSummaryProps) {
  const [showSummary, setShowSummary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState(item.summary || '');
  const [summarySaved, setSummarySaved] = useState(!!item.summary);
  const [error, setError] = useState('');
  const [isWebLLMReady, setIsWebLLMReady] = useState(false);

  useEffect(() => {
    // Initialize WebLLM when component mounts (client-side only)
    const initLLM = async () => {
      if (typeof window === 'undefined') return; // Server-side check
      
      try {
        await initializeWebLLM();
        setIsWebLLMReady(!!webLLM);
        console.log('WebLLM ready state:', !!webLLM);
      } catch (err) {
        console.error('Failed to initialize WebLLM:', err);
        setIsWebLLMReady(false);
      }
    };
    initLLM();
  }, []);

  const handleSummarize = async () => {
    console.log('=== SUMMARIZATION DEBUG START ===');
    console.log('1. Button clicked');
    console.log('2. WebLLM ready:', isWebLLMReady);
    console.log('3. WebLLM instance:', webLLM);
    console.log('4. Item content length:', item.content?.length);
    
    setSaving(true);
    setError('');
    
    try {
      let generatedSummary = '';
      
      // Try WebLLM first if available
      if (webLLM && isWebLLMReady) {
        console.log('5. Attempting WebLLM summarization...');
        try {
          const messages = [
            { role: "system", content: "You are a helpful AI assistant that creates concise summaries in 2-3 sentences." },
            { role: "user", content: `Please summarize the following content in 2-3 sentences, focusing on the key points and main ideas:

${item.content}

Summary:` }
          ];

          console.log('6. Calling WebLLM chat completions...');
          const reply = await webLLM.chat.completions.create({
            messages,
            temperature: 0.7,
            max_tokens: 200
          });
          
          console.log('7. WebLLM response:', reply);
          generatedSummary = reply.choices[0]?.message?.content || '';
          console.log('8. WebLLM generated summary:', generatedSummary);
          
          if (generatedSummary) {
            console.log('9. WebLLM summarization successful!');
          }
        } catch (webLLMError) {
          console.error('10. WebLLM failed:', webLLMError);
        }
      }
      
      // Fallback to smart summarization if WebLLM failed or isn't available
      if (!generatedSummary) {
        console.log('11. Using smart text summarization as fallback...');
        generatedSummary = createSmartSummary(item.content);
        console.log('12. Smart summary generated:', generatedSummary);
      }
      
      console.log('13. Final summary:', generatedSummary);
      setSummary(generatedSummary);
      setShowSummary(true);
      
    } catch (e) {
      console.error('ERROR in summarization:', e);
      setError('Failed to generate summary: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
      console.log('14. Summarization complete');
    }
    
    console.log('=== SUMMARIZATION DEBUG END ===');
  };

  const handleSaveSummary = async () => {
    console.log('=== SAVE SUMMARY DEBUG ===');
    console.log('Saving summary:', summary);
    
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/content/${item._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary })
      });
      if (res.ok) {
        setSummarySaved(true);
        console.log('Summary saved successfully');
      } else {
        setError('Failed to save summary.');
        console.log('Failed to save summary, status:', res.status);
      }
    } catch (e) {
      setError('Error saving summary: ' + (e instanceof Error ? e.message : String(e)));
      console.error('Error saving summary:', e);
    } finally {
      setSaving(false);
    }
  };

  // Debug render
  console.log('=== RENDER DEBUG ===');
  console.log('Component state:', {
    showSummary,
    summary,
    saving,
    error,
    summarySaved,
    isWebLLMReady
  });

  return (
    <div className={styles.contentItem}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{flex: 1, marginRight: '1rem'}}>
          <div className={styles.contentItemHeader}>
            {isMyContent && <input type="checkbox" checked={selected} onChange={e => onSelect(e.target.checked)} />}
            <h3 className={styles.contentTitle}>{item.title}</h3>
          </div>
          <div className={styles.contentItemHeader} style={{marginBottom: '0.75rem'}}>
            {item.qualityRating && (<span className={styles.qualityBadge}>Rating: {item.qualityRating}/10</span>)}
            {item.isPublic && (<span className={styles.publicBadge}>Public</span>)}
          </div>
          {item.user && <p style={{fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem'}}>Shared by {item.user.displayName}</p>}
          <p className={styles.contentSummary}>{item.summary}</p>
          <div className={styles.contentMeta}>
            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
            <span>{item.type}</span>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.contentLink}>View Original</a>
          </div>
          
          {/* Debug info */}
          <div style={{marginTop: '0.5rem', padding: '0.5rem', background: '#f0f0f0', fontSize: '0.8rem'}}>
            <strong>Debug Info:</strong><br/>
            Show Summary: {showSummary.toString()}<br/>
            Has Summary: {(summary && summary.length > 0).toString()}<br/>
            Summary Length: {summary?.length || 0}<br/>
            Saving: {saving.toString()}<br/>
            Error: {error || 'none'}<br/>
            WebLLM Ready: {isWebLLMReady.toString()}
          </div>
          
          <div style={{marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap'}}>
            <button 
              className={`${styles.btn} ${styles.btnLight}`} 
              onClick={() => {
                console.log('Toggle summary clicked, current state:', showSummary);
                setShowSummary(s => !s);
              }}
            >
              {showSummary ? 'Hide Summary' : 'Show Summary'}
            </button>
            
            <button 
              className={`${styles.btn} ${styles.btnPrimary}`} 
              onClick={handleSummarize} 
              disabled={saving}
            >
              {saving ? 'Generating...' : 'Summarize Content'}
            </button>
            
            {summary && !summarySaved && (
              <button 
                className={`${styles.btn} ${styles.btnSuccess}`} 
                onClick={handleSaveSummary} 
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Summary'}
              </button>
            )}
            
            <button 
              className={`${styles.btn} ${styles.btnSecondary}`} 
              onClick={onShowDetail}
            >
              View Details
            </button>
            
            {isMyContent && (
              <button 
                className={`${styles.btn} ${styles.btnDanger}`} 
                onClick={onDelete}
              >
                Delete
              </button>
            )}
          </div>
          
          {error && (
            <div style={{marginTop: '0.5rem', padding: '0.5rem', background: '#fee', color: '#c00', fontSize: '0.8rem'}}>
              Error: {error}
            </div>
          )}
          
          {showSummary && summary && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '0.375rem',
              borderLeft: '4px solid #007bff'
            }}>
              <h4 style={{margin: '0 0 0.5rem 0', color: '#495057'}}>Generated Summary:</h4>
              <p style={{margin: 0, lineHeight: '1.6', color: '#212529'}}>{summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const [content, setContent] = useState<Content[]>([]);
  const [feedContent, setFeedContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'my-content' | 'feed' | 'discover'>('my-content');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    bio: '',
    website: '',
    isPublic: false
  });

  useEffect(() => {
    if (isLoaded && user) {
      fetchContent();
      fetchProfile();
      fetchFollowers();
      fetchFollowing();
    }
  }, [isLoaded, user]);

  const fetchData = async (url: string, setter: Function, loader = true) => {
    if (loader) setLoading(true);
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setter(data);
      } else {
        console.error('Failed to fetch data:', res.status);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      if (loader) setLoading(false);
    }
  };

  const fetchContent = () => fetchData('/api/content', setContent);
  const fetchPublicContent = () => fetchData('/api/content?public=true&all=true', setContent);
  const fetchFeed = () => fetchData('/api/feed', setFeedContent);
  const fetchProfile = () => fetchData(`/api/profiles?userId=${user?.id}`, (data: Profile) => {
    setProfile(data);
    setProfileForm({
      displayName: data.displayName || '',
      bio: data.bio || '',
      website: data.website || '',
      isPublic: data.isPublic || false
    });
  });
  const fetchFollowers = () => fetchData('/api/follows?type=followers', setFollowers, false);
  const fetchFollowing = () => fetchData('/api/follows?type=following', setFollowing, false);

  const postData = async (url: string, body: object, callback?: (data: any) => void) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json();
        if (callback) callback(data);
        return data;
      } else {
        console.error('Failed to post data:', res.status);
      }
    } catch (error) {
      console.error('Error posting data:', error);
    }
  };

  const extractContent = () => postData('/api/extract', { url }, data => {
    setContent(prev => [data, ...prev]);
    setUrl('');
  });

  const createManualContent = () => postData('/api/content', { url: `manual-${Date.now()}`, title: manualTitle, content: manualContent, type: 'MANUAL' }, data => {
    setContent(prev => [data, ...prev]);
    setManualTitle('');
    setManualContent('');
  });

  const updateProfile = () => postData('/api/profiles', profileForm, data => {
    setProfile(data);
  });

  const deleteData = async (url: string, callback?: () => void) => {
    try {
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        if (callback) callback();
      } else {
        console.error('Failed to delete data:', res.status);
      }
    } catch (error) {
      console.error('Error deleting data:', error);
    }
  };

  const deleteContent = (id: string) => deleteData(`/api/content/${id}`, () => setContent(prev => prev.filter(item => item._id !== id)));
  const bulkDelete = () => deleteData('/api/content/bulk', () => {
    setContent(prev => prev.filter(item => !selectedItems.includes(item._id)));
    setSelectedItems([]);
  });

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedItems(prev => checked ? [...prev, id] : prev.filter(item => item !== id));
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedItems(checked ? content.map(item => item._id) : []);
  };

  if (!isLoaded) {
    return <div className={styles.container}>Loading...</div>;
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <h1>Welcome to Social Reading</h1>
        <p>Please sign in to continue.</p>
        <SignInButton />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Social Reading Dashboard</h1>
        <div className={styles.userInfo}>
          <span>Welcome, {user.firstName || user.emailAddresses[0]?.emailAddress}</span>
          <SignOutButton />
        </div>
      </header>

      <nav className={styles.nav}>
        <button 
          className={`${styles.navButton} ${activeTab === 'my-content' ? styles.active : ''}`}
          onClick={() => setActiveTab('my-content')}
        >
          My Content
        </button>
        <button 
          className={`${styles.navButton} ${activeTab === 'feed' ? styles.active : ''}`}
          onClick={() => setActiveTab('feed')}
        >
          Feed
        </button>
        <button 
          className={`${styles.navButton} ${activeTab === 'discover' ? styles.active : ''}`}
          onClick={() => setActiveTab('discover')}
        >
          Discover
        </button>
        <Link href="/discover" className={styles.navButton}>
          Browse Public Content
        </Link>
      </nav>

      <main className={styles.main}>
        {activeTab === 'my-content' && (
          <div className={styles.section}>
            <h2>Add Content</h2>
            <div className={styles.form}>
              <input
                type="url"
                placeholder="Enter URL to extract content"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className={styles.input}
              />
              <button onClick={extractContent} className={styles.btn}>Extract Content</button>
            </div>

            <div className={styles.form}>
              <input
                type="text"
                placeholder="Title"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                className={styles.input}
              />
              <textarea
                placeholder="Content"
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                className={styles.textarea}
              />
              <button onClick={createManualContent} className={styles.btn}>Add Manual Content</button>
            </div>

            <h2>My Content</h2>
            {selectedItems.length > 0 && (
              <div className={styles.bulkActions}>
                <button onClick={bulkDelete} className={`${styles.btn} ${styles.btnDanger}`}>
                  Delete Selected ({selectedItems.length})
                </button>
              </div>
            )}
            {loading ? (
              <p>Loading...</p>
            ) : (
              <div className={styles.contentList}>
                {content.map(item => (
                  <ContentItemWithSummary
                    key={item._id}
                    item={item}
                    onShowDetail={() => {/* TODO: Implement detail view */}}
                    onDelete={() => deleteContent(item._id)}
                    isMyContent={true}
                    selected={selectedItems.includes(item._id)}
                    onSelect={(checked) => handleSelect(item._id, checked)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'feed' && (
          <div className={styles.section}>
            <h2>Your Feed</h2>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <div className={styles.contentList}>
                {feedContent.map(item => (
                  <ContentItemWithSummary
                    key={item._id}
                    item={item}
                    onShowDetail={() => {/* TODO: Implement detail view */}}
                    onDelete={() => {/* Feed items can't be deleted */}}
                    isMyContent={false}
                    selected={false}
                    onSelect={() => {/* Feed items can't be selected */}}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'discover' && (
          <div className={styles.section}>
            <h2>Discover Public Content</h2>
            <button onClick={fetchPublicContent} className={styles.btn}>Load Public Content</button>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <div className={styles.contentList}>
                {content.map(item => (
                  <ContentItemWithSummary
                    key={item._id}
                    item={item}
                    onShowDetail={() => {/* TODO: Implement detail view */}}
                    onDelete={() => {/* Public content can't be deleted */}}
                    isMyContent={false}
                    selected={false}
                    onSelect={() => {/* Public content can't be selected */}}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}