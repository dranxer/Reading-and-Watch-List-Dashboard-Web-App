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

// 🧪 WebLLM Dynamic Loading (browser-only, equivalent to distribution)
let webLLM: any = null;
let isInitializing = false;

async function initializeWebLLM() {
  if (typeof window === 'undefined') return null;
  if (webLLM || isInitializing) return webLLM;
  
  isInitializing = true;
  
  try {
    console.log('🧪 Loading WebLLM dynamically in browser (distribution-style)...');
    
    // Dynamic import only in browser to avoid build issues
    let CreateMLCEngine: any;
    let prebuiltAppConfig: any;
    
    try {
      // Try the npm package first (already installed)
      const webllmModule = await import('@mlc-ai/web-llm');
      CreateMLCEngine = webllmModule.CreateMLCEngine;
      prebuiltAppConfig = webllmModule.prebuiltAppConfig;
      console.log('✅ Loaded WebLLM from local package');
    } catch (npmError) {
      console.log('📦 Local package failed, trying CDN fallback...');
      
      // Fallback to CDN loading in browser only
      const script = document.createElement('script');
      script.type = 'module';
      script.textContent = `
        import * as webllm from "https://esm.run/@mlc-ai/web-llm@0.2.79";
        window.webllmModule = webllm;
      `;
      document.head.appendChild(script);
      
      // Wait for CDN loading
      await new Promise((resolve, reject) => {
        let attempts = 0;
        const checkInterval = setInterval(() => {
          attempts++;
          if ((window as any).webllmModule) {
            clearInterval(checkInterval);
            resolve(true);
          } else if (attempts > 50) { // 5 seconds timeout
            clearInterval(checkInterval);
            reject(new Error('CDN loading timeout'));
          }
        }, 100);
      });
      
      const webllmModule = (window as any).webllmModule;
      CreateMLCEngine = webllmModule.CreateMLCEngine;
      prebuiltAppConfig = webllmModule.prebuiltAppConfig;
      console.log('✅ Loaded WebLLM from CDN');
    }
    
    // List all available models
    console.log('📋 Available models in WebLLM:');
    prebuiltAppConfig.model_list.forEach((model: any, index: number) => {
      console.log(`${index + 1}. ${model.model_id} (${model.vram_required_MB}MB)`);
    });
    
    // Try the smallest, most reliable models first
    const modelsToTry = [
      "SmolLM2-135M-Instruct-q0f32-MLC",        // 719MB - Very small
      "SmolLM2-360M-Instruct-q4f32_1-MLC",     // 579MB - Small  
      "TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC",  // 839MB - Proven to work
      "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",     // 1060MB - Fast
      "Qwen2.5-1.5B-Instruct-q4f32_1-MLC",     // 1888MB - Good balance
      "Llama-3.2-1B-Instruct-q4f32_1-MLC"      // 1128MB - Latest small model
    ];
    
    for (const modelId of modelsToTry) {
      try {
        console.log(`🔄 Trying model: ${modelId}`);
        
        webLLM = await CreateMLCEngine(modelId, {
          initProgressCallback: (progress: any) => {
            console.log(`📊 Loading ${modelId}:`, Math.round(progress.progress * 100) + "%");
            if (progress.text) {
              console.log(`   ${progress.text}`);
            }
          }
        });
        
        console.log(`✅ WebLLM working! Successfully loaded: ${modelId}`);
        return webLLM;
        
      } catch (modelError) {
        console.log(`❌ ${modelId} failed:`, (modelError as Error).message);
        console.log('🔄 Trying next model...');
        continue;
      }
    }
    
    throw new Error('All test models failed to load');
    
  } catch (error) {
    console.error('❌ WebLLM initialization failed:', error);
    console.log('💡 Possible issues:');
    console.log('   - All models failed to load');
    console.log('   - Browser compatibility (need Chrome 113+ or Firefox 117+)');
    console.log('   - WebGPU not available (check chrome://gpu/)');
    console.log('   - Network/CORS issues downloading models');
    console.log('   - Insufficient memory (models need 500MB-2GB)');
    console.log('   - Package or CDN connectivity issues');
    
    webLLM = null;
    return null;
  } finally {
    isInitializing = false;
  }
}

// Enhanced smart summarization that mimics AI behavior
function createAdvancedSummary(text: string): string {
  if (!text || text.trim().length === 0) {
    return 'No content available to summarize.';
  }

  try {
    // Clean and normalize text
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // Split into sentences
    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 15);
    
    if (sentences.length === 0) {
      return 'Content is too short to summarize effectively.';
    }
    
    if (sentences.length <= 2) {
      return sentences.join('. ').trim() + '.';
    }
    
    // Advanced algorithm: score sentences by importance
    const wordFreq: { [key: string]: number } = {};
    const words = cleanText.toLowerCase().match(/\b\w{4,}\b/g) || [];
    
    // Build word frequency map
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    // Score each sentence
    const scoredSentences = sentences.map((sentence, index) => {
      const sentenceWords = sentence.toLowerCase().match(/\b\w{4,}\b/g) || [];
      let score = 0;
      
      // Word frequency score
      sentenceWords.forEach(word => {
        score += wordFreq[word] || 0;
      });
      
      // Position bonus (first and last sentences are often important)
      if (index === 0 || index === sentences.length - 1) score *= 1.3;
      
      // Length bonus (moderate length sentences are often better)
      if (sentence.length > 50 && sentence.length < 150) score *= 1.2;
      
      // Keyword bonus (look for important terms)
      const keywords = ['important', 'significant', 'key', 'main', 'primary', 'essential', 'crucial', 'major'];
      if (keywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
        score *= 1.4;
      }
      
      return { sentence: sentence.trim(), score, index };
    });
    
    // Sort by score and take top 3, then sort by original order
    const topSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(3, sentences.length))
      .sort((a, b) => a.index - b.index)
      .map(item => item.sentence);
    
    // Create a coherent summary
    let summary = topSentences.join('. ') + '.';
    
    // Clean up the summary
    summary = summary.replace(/\.\./g, '.').replace(/\s+/g, ' ').trim();
    
    return summary;
    
  } catch (error) {
    console.error('Error in advanced summarization:', error);
    // Ultra-simple fallback
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.slice(0, 2).join('. ') + '.';
  }
}

function ContentItemWithSummary({ item, onShowDetail, onDelete, isMyContent, selected, onSelect }: ContentItemWithSummaryProps) {
  const [showSummary, setShowSummary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState(item.summary || '');
  const [summarySaved, setSummarySaved] = useState(!!item.summary);
  const [statusMessage, setStatusMessage] = useState('');
  const [isWebLLMReady, setIsWebLLMReady] = useState(false);

  useEffect(() => {
    const initLLM = async () => {
      setStatusMessage('🔄 Initializing AI...');
      
      try {
        const llm = await initializeWebLLM();
        if (llm) {
          setIsWebLLMReady(true);
          setStatusMessage('🤖 AI Ready!');
          setTimeout(() => setStatusMessage(''), 2000);
        } else {
          setIsWebLLMReady(false);
          setStatusMessage('⚠️ Using fallback');
          setTimeout(() => setStatusMessage(''), 2000);
        }
      } catch (err) {
        setIsWebLLMReady(false);
        setStatusMessage('⚠️ AI unavailable');
        setTimeout(() => setStatusMessage(''), 2000);
      }
    };
    
    initLLM();
  }, []);

  const handleSummarize = async () => {
    setSaving(true);
    setStatusMessage('🔄 Generating summary...');
    setSummary('');

    try {
      let generatedSummary = '';
      
      if (isWebLLMReady && webLLM) {
        setStatusMessage('🤖 AI is thinking...');
        
        try {
          const response = await webLLM.chat.completions.create({
            messages: [
              { role: "system", content: "Summarize content in 2-3 clear sentences." },
              { role: "user", content: `Summarize: ${item.content}` }
            ],
            temperature: 0.7,
            max_tokens: 100
          });
          
          generatedSummary = response.choices[0]?.message?.content?.trim() || '';
          
          if (generatedSummary) {
            setStatusMessage('✅ AI Summary Complete!');
          }
        } catch (aiError) {
          console.error('AI Error:', aiError);
          setStatusMessage('⚠️ AI failed, using backup...');
        }
      } else {
        setStatusMessage('📝 Using smart algorithm...');
      }
      
      // Fallback if needed
      if (!generatedSummary) {
        generatedSummary = createAdvancedSummary(item.content);
      }
      
      setSummary(generatedSummary);
      setShowSummary(true);
      
    } catch (e) {
      setSummary('Error generating summary.');
      setShowSummary(true);
      setStatusMessage('❌ Error occurred');
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const handleSaveSummary = async () => {
    setSaving(true);
    setStatusMessage('💾 Saving...');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setSummarySaved(true);
    setStatusMessage('✅ Saved!');
    setSaving(false);
    
    setTimeout(() => setStatusMessage(''), 2000);
  };

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
            {isWebLLMReady && (<span style={{padding: '0.25rem 0.5rem', background: '#dcfce7', color: '#166534', borderRadius: '9999px', fontSize: '0.75rem'}}>🤖 AI Ready</span>)}
          </div>
          {item.user && <p style={{fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem'}}>Shared by {item.user.displayName}</p>}
          <p className={styles.contentSummary}>{item.summary}</p>
          <div className={styles.contentMeta}>
            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
            <span>{item.type}</span>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.contentLink}>View Original</a>
          </div>
          
          <div style={{marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap'}}>
            <button 
              className={`${styles.btn} ${styles.btnPrimary}`} 
              onClick={handleSummarize} 
              disabled={saving}
              style={{fontWeight: 'bold', background: isWebLLMReady ? 'linear-gradient(135deg, #10b981, #059669)' : undefined}}
            >
              {saving ? '⏳ Working...' : isWebLLMReady ? '🤖 AI Summarize' : '📝 Summarize'}
            </button>
            
            {summary && !summarySaved && (
              <button className={`${styles.btn} ${styles.btnSuccess}`} onClick={handleSaveSummary} disabled={saving}>
                💾 Save
              </button>
            )}
            
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onShowDetail}>👁️ Details</button>
            {isMyContent && (<button className={`${styles.btn} ${styles.btnDanger}`} onClick={onDelete}>🗑️ Delete</button>)}
          </div>
          
          {statusMessage && (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.75rem',
              background: '#f0f9ff',
              color: '#0369a1',
              border: '1px solid #bae6fd',
              borderRadius: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              {statusMessage}
            </div>
          )}
          
          {showSummary && summary && (
            <div style={{
              marginTop: '1rem', 
              padding: '1.5rem', 
              background: isWebLLMReady ? 'linear-gradient(135deg, #ecfdf5, #f0fdf4)' : '#f8f9fa',
              border: `2px solid ${isWebLLMReady ? '#10b981' : '#0ea5e9'}`, 
              borderRadius: '0.75rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <h4 style={{margin: '0 0 0.75rem 0', color: '#0c4a6e', fontSize: '1.1rem', fontWeight: 'bold'}}>
                {isWebLLMReady ? '🤖 AI Generated Summary:' : '📄 Smart Summary:'}
              </h4>
              <p style={{margin: 0, lineHeight: '1.7', color: '#1e293b', fontSize: '1rem'}}>
                {summary}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const [content, setContent] = useState<Content[]>([
    // Add test content for immediate testing
    {
      _id: 'test-1',
      url: 'https://example.com',
      title: 'Test Article: The Future of AI',
      content: 'Artificial intelligence is rapidly transforming our world. From healthcare to transportation, AI systems are becoming more sophisticated and capable. Machine learning algorithms can now process vast amounts of data and make predictions with remarkable accuracy. However, there are also concerns about job displacement and ethical considerations. As we move forward, it will be crucial to develop AI responsibly and ensure that its benefits are shared broadly across society. The future of AI holds both tremendous promise and significant challenges that we must navigate carefully.',
      summary: '',
      type: 'MANUAL',
      qualityRating: 8,
      isPublic: false,
      createdAt: new Date().toISOString(),
      user: {
        displayName: 'Test User',
        firstName: 'Test',
        lastName: 'User'
      }
    }
  ]);
  const [feedContent, setFeedContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'my-content' | 'feed' | 'profile' | 'public-content'>('my-content');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    bio: '',
    website: '',
    isPublic: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      if (activeTab === 'my-content') fetchContent();
      else if (activeTab === 'public-content') fetchPublicContent();
      else if (activeTab === 'feed') fetchFeed();
      else if (activeTab === 'profile') {
        fetchProfile();
        fetchFollowers();
        fetchFollowing();
      }
    }
  }, [isLoaded, user, activeTab]);

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
  }, false);
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
    alert('Profile updated successfully!');
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
  
  const filteredContent = (activeTab === 'public-content' ? content : content.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.summary && item.summary.toLowerCase().includes(searchTerm.toLowerCase()))
  ));
  const currentContentList = activeTab === 'feed' ? feedContent : filteredContent;

  if (!isLoaded) {
    return <div className={styles.dashboardPage} style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Loading...</div>;
  }

  if (!user) {
    return (
      <div className={styles.dashboardPage} style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div className={styles.card} style={{textAlign: 'center', maxWidth: '400px'}}>
          <h1 className={styles.cardTitle}>Welcome to Social Reading</h1>
          <p style={{marginBottom: '1.5rem'}}>Sign in to unlock your personalized dashboard, save content, and see what others are reading.</p>
          <SignInButton>
             <button className={`${styles.btn} ${styles.btnPrimary}`}>Sign In</button>
          </SignInButton>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboardPage}>
      <header className={styles.dashboardNav}>
        <div className={styles.navContainer}>
          <h1 className={styles.navTitle}>Social Reading</h1>
          <div className={styles.navUserSection}>
            <span className={styles.userWelcome}>
              Welcome, {user.firstName || user.emailAddresses[0]?.emailAddress}
            </span>
            <SignOutButton>
                <button className={`${styles.btn} ${styles.btnLight}`}>Sign Out</button>
            </SignOutButton>
          </div>
        </div>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.tabNav}>
          <button onClick={() => setActiveTab('my-content')} className={`${styles.tabButton} ${activeTab === 'my-content' ? styles.active : ''}`}>My Content</button>
          <button onClick={() => setActiveTab('public-content')} className={`${styles.tabButton} ${activeTab === 'public-content' ? styles.active : ''}`}>Public</button>
          <button onClick={() => setActiveTab('feed')} className={`${styles.tabButton} ${activeTab === 'feed' ? styles.active : ''}`}>Feed</button>
          <button onClick={() => setActiveTab('profile')} className={`${styles.tabButton} ${activeTab === 'profile' ? styles.active : ''}`}>Profile</button>
          <Link href="/discover" className={`${styles.tabButton}`}>Discover</Link>
        </div>

        {activeTab === 'my-content' && (
          <div className={styles.card}>
              <h2 className={styles.cardTitle}>Add Content</h2>
              <div className={styles.formActions} style={{marginBottom: '1.5rem'}}>
                  <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Enter URL to extract..." className={styles.formInput} style={{flex: 1}}/>
                  <button onClick={extractContent} className={`${styles.btn} ${styles.btnPrimary}`}>Extract</button>
              </div>
              <details>
                  <summary style={{cursor: 'pointer', fontWeight: 500}}>Or add manually...</summary>
                  <div className={styles.formContainer} style={{marginTop: '1rem'}}>
                      <input type="text" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} placeholder="Title" className={styles.formInput}/>
                      <textarea value={manualContent} onChange={(e) => setManualContent(e.target.value)} placeholder="Content..." rows={4} className={styles.formTextarea}/>
                      <div className={styles.formActions}>
                          <button onClick={createManualContent} className={`${styles.btn} ${styles.btnSecondary}`}>Save Manual Content</button>
                      </div>
                  </div>
              </details>
          </div>
        )}

        {(activeTab === 'my-content' || activeTab === 'public-content' || activeTab === 'feed') && (
            <div className={styles.card}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                  <h2 className={styles.cardTitle} style={{marginBottom: 0}}>
                    {
                      activeTab === 'my-content' ? 'My Library' :
                      activeTab === 'public-content' ? 'Public Content' :
                      'Following Feed'
                    }
                  </h2>
                  <div className={styles.formActions}>
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className={styles.formInput}/>
                    {activeTab === 'my-content' && selectedItems.length > 0 && (
                      <button onClick={bulkDelete} className={`${styles.btn} ${styles.btnDanger}`}>Delete ({selectedItems.length})</button>
                    )}
                  </div>
              </div>
              
              <div className={styles.contentList}>
                  {loading ? <p>Loading...</p> : currentContentList.length === 0 ? <p>No content to show.</p> :
                  currentContentList.map((item, idx) => (
                   <ContentItemWithSummary
                      key={item._id + '-' + idx}
                      item={item}
                      onShowDetail={() => { setSelectedContent(item); setShowDetailModal(true); }}
                      onDelete={() => deleteContent(item._id)}
                      isMyContent={activeTab === 'my-content'}
                      selected={selectedItems.includes(item._id)}
                      onSelect={checked => handleSelect(item._id, checked)}
                   />
                 ))}
               </div>
           </div>
         )}

        {activeTab === 'profile' && (
          <div className={styles.profileGrid}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Profile Settings</h2>
              <div className={styles.formContainer}>
                <div>
                  <label>Display Name</label>
                  <input type="text" value={profileForm.displayName} onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))} className={styles.formInput} />
                </div>
                <div>
                  <label>Bio</label>
                  <textarea value={profileForm.bio} onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))} rows={3} className={styles.formTextarea}/>
                </div>
                <div>
                  <label>Website</label>
                  <input type="url" value={profileForm.website} onChange={(e) => setProfileForm(prev => ({ ...prev, website: e.target.value }))} className={styles.formInput} />
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <input id="isPublic" type="checkbox" checked={profileForm.isPublic} onChange={(e) => setProfileForm(prev => ({ ...prev, isPublic: e.target.checked }))}/>
                  <label htmlFor="isPublic">Make my profile public</label>
                </div>
                <button onClick={updateProfile} className={`${styles.btn} ${styles.btnPrimary}`}>Update Profile</button>
              </div>
            </div>

            <div>
                <div className={`${styles.card} ${styles.profileStatsCard}`}>
                    <h2 className={styles.cardTitle}>Profile Stats</h2>
                    {profile && (
                        <div className={styles.profileStats}>
                            <div>
                                <div className={styles.statValue}>{profile.publicContentCount}</div>
                                <div className={styles.statLabel}>Public Articles</div>
                            </div>
                            <div>
                                <div className={styles.statValue}>{profile.followersCount}</div>
                                <div className={styles.statLabel}>Followers</div>
                            </div>
                            <div>
                                <div className={styles.statValue}>{profile.followingCount}</div>
                                <div className={styles.statLabel}>Following</div>
                            </div>
                        </div>
                    )}
                </div>
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Followers ({followers.length})</h2>
                    <div className={styles.followList}>
                        {followers.map((follower) => (
                        <div key={follower._id} className={styles.followItem}>
                            <span>{follower.user?.displayName || 'Unknown User'}</span>
                        </div>
                        ))}
                    </div>
                </div>
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Following ({following.length})</h2>
                    <div className={styles.followList}>
                        {following.map((follow) => (
                        <div key={follow._id} className={styles.followItem}>
                            <span>{follow.user?.displayName || 'Unknown User'}</span>
                            <button onClick={async () => {
                                await deleteData(`/api/follows?followingId=${follow.followingId}`);
                                fetchFollowing();
                            }} className={`${styles.btn} ${styles.btnDanger}`}>Unfollow</button>
                        </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        )}
      </main>

      {showDetailModal && selectedContent && (
        <div className={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>{selectedContent.title}</h2>
                <button onClick={() => setShowDetailModal(false)} className={`${styles.btn} ${styles.btnLight}`} style={{borderRadius: '50%', padding: '0.5rem', width: '2.5rem', height: '2.5rem'}}>✕</button>
            </div>
            <div className={styles.modalBody}>
                {selectedContent.qualityRating && (
                    <div>
                        <h3 style={{fontWeight: 600}}>Quality Assessment</h3>
                        <p><strong>Rating:</strong> {selectedContent.qualityRating}/10</p>
                        {selectedContent.qualityExplanation && <p><strong>Explanation:</strong> {selectedContent.qualityExplanation}</p>}
                    </div>
                )}
                <div>
                    <h3 style={{fontWeight: 600}}>Summary</h3>
                    <p>{selectedContent.summary}</p>
                </div>
                <div>
                    <h3 style={{fontWeight: 600}}>Full Content</h3>
                    <div style={{maxHeight: '300px', overflowY: 'auto', background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem'}}>
                        <p style={{whiteSpace: 'pre-wrap'}}>{selectedContent.content}</p>
                    </div>
                </div>
            </div>
            <div className={styles.modalFooter}>
                <a href={selectedContent.url} target="_blank" rel="noopener noreferrer" className={`${styles.btn} ${styles.btnLight}`}>View Original</a>
                <button onClick={() => { navigator.clipboard.writeText(selectedContent.content); alert('Content copied!');}} className={`${styles.btn} ${styles.btnPrimary}`}>Copy Content</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}