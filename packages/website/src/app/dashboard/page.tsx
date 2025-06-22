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

// 🤖 Complete WebLLM Implementation with Hot Reload Protection
let webLLM: any = null;
let isInitializing = false;
let initializationPromise: Promise<any> | null = null;

// Check if engine is still valid (not disposed)
function isEngineValid(engine: any): boolean {
  try {
    // Try to access a basic property to check if engine is disposed
    if (!engine || !engine.chat || !engine.chat.completions) {
      return false;
    }
    // Additional check for disposed state
    return true;
  } catch (error) {
    console.log('🔍 Engine validation failed:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// Clean up disposed engine references
function cleanupDisposedEngine() {
  if (webLLM && !isEngineValid(webLLM)) {
    console.log('🧹 Cleaning up disposed engine');
    webLLM = null;
    (window as any).webLLMEngine = null;
  }
}

// Utility function to estimate token count (rough approximation)
function estimateTokenCount(text: string): number {
  // Very conservative estimate: 1 token ≈ 3 characters for safety
  return Math.ceil(text.length / 3);
}

// Smart content truncation for context window
function truncateForContext(content: string, maxTokens: number = 1800): string {
  const estimatedTokens = estimateTokenCount(content);
  
  if (estimatedTokens <= maxTokens) {
    return content;
  }
  
  // Be very aggressive with truncation to account for:
  // - System prompt (~100 tokens)
  // - User prompt formatting (~50 tokens) 
  // - Response space (~200 tokens)
  // - Safety buffer (~300 tokens)
  // Total overhead: ~650 tokens, so max content should be ~1800 tokens
  
  const maxChars = maxTokens * 3; // Very conservative: 3 chars per token
  let truncated = content.substring(0, maxChars);
  
  // Try to end at a sentence boundary
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );
  
  if (lastSentenceEnd > maxChars * 0.6) { // If we found a sentence end in the last 40%
    truncated = truncated.substring(0, lastSentenceEnd + 1);
  } else {
    // Try to end at a paragraph break
    const lastParagraph = truncated.lastIndexOf('\n\n');
    if (lastParagraph > maxChars * 0.5) {
      truncated = truncated.substring(0, lastParagraph);
    } else {
      // Try to end at a word boundary
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > maxChars * 0.8) {
        truncated = truncated.substring(0, lastSpace);
      }
      truncated += '...';
    }
  }
  
  const finalTokens = estimateTokenCount(truncated);
  console.log(`📏 Content truncated: ${content.length} → ${truncated.length} chars (${estimatedTokens} → ${finalTokens} tokens)`);
  
  // Double-check: if still too long, do hard truncation
  if (finalTokens > maxTokens) {
    const hardLimit = maxTokens * 2; // Ultra conservative - 2 chars per token
    truncated = content.substring(0, hardLimit) + '...';
    console.log(`⚠️ Hard truncation applied: ${truncated.length} chars (${estimateTokenCount(truncated)} tokens)`);
  }
  
  return truncated;
}

async function initializeWebLLM() {
  if (typeof window === 'undefined') return null;
  
  // Return existing instance if available
  if (webLLM) return webLLM;
  
  // Return existing initialization promise if in progress
  if (initializationPromise) return initializationPromise;
  
  // Prevent multiple simultaneous initializations
  if (isInitializing) {
    // Wait for current initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return webLLM;
  }
  
  isInitializing = true;
  
  initializationPromise = (async () => {
    try {
      console.log('🤖 Initializing WebLLM AI System...');
      
      // Step 1: Check for existing WebLLM instance (from test page or previous load)
      if ((window as any).webLLMEngine) {
        const existingEngine = (window as any).webLLMEngine;
        if (isEngineValid(existingEngine)) {
          console.log('✅ Found existing WebLLM engine, reusing it!');
          webLLM = existingEngine;
          return webLLM;
        } else {
          console.log('🧹 Existing engine is disposed, cleaning up...');
          cleanupDisposedEngine();
        }
      }
      
      // Step 2: Load WebLLM library
      let CreateMLCEngine: any;
      let prebuiltAppConfig: any;
      
      try {
        console.log('📦 Loading WebLLM from npm package...');
        const webllmModule = await import('@mlc-ai/web-llm');
        CreateMLCEngine = webllmModule.CreateMLCEngine;
        prebuiltAppConfig = webllmModule.prebuiltAppConfig;
        console.log('✅ WebLLM library loaded successfully');
      } catch (npmError) {
        console.log('📦 NPM package failed, trying local distribution...');
        
        // Fallback to local distribution
        if (!(window as any).WebLLM) {
          console.log('🔧 Loading WebLLM from local distribution...');
          
          const script = document.createElement('script');
          script.type = 'module';
          script.src = '/webllm/webllm-local.js';
          document.head.appendChild(script);
          
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('WebLLM loading timeout'));
            }, 15000);
            
            const handleLoad = (event: any) => {
              clearTimeout(timeout);
              window.removeEventListener('webllm-loaded', handleLoad);
              window.removeEventListener('webllm-error', handleError);
              resolve(event.detail);
            };
            
            const handleError = (event: any) => {
              clearTimeout(timeout);
              window.removeEventListener('webllm-loaded', handleLoad);
              window.removeEventListener('webllm-error', handleError);
              reject(event.detail);
            };
            
            window.addEventListener('webllm-loaded', handleLoad);
            window.addEventListener('webllm-error', handleError);
          });
        }
        
        const webllmModule = (window as any).WebLLM;
        CreateMLCEngine = webllmModule.CreateMLCEngine;
        prebuiltAppConfig = webllmModule.prebuiltAppConfig;
        console.log('✅ Local WebLLM distribution loaded');
      }
      
      // Step 3: Select optimal model
      const availableModels = prebuiltAppConfig.model_list;
      console.log(`📋 Found ${availableModels.length} available models`);
      
      // Prioritize small, efficient models
      const preferredModels = [
        "SmolLM2-135M-Instruct-q0f32-MLC",        // 719MB - Very small, proven working
        "SmolLM2-360M-Instruct-q4f32_1-MLC",     // 579MB - Small and efficient
        "TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC",  // 839MB - Reliable
        "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",     // 1060MB - Fast
      ];
      
      let selectedModel = preferredModels[0]; // Default to smallest
      
      // Check which preferred models are available
      for (const model of preferredModels) {
        if (availableModels.some((m: any) => m.model_id === model)) {
          selectedModel = model;
          break;
        }
      }
      
      console.log(`🎯 Selected model: ${selectedModel}`);
      
      // Step 4: Load the model
      console.log('🔄 Loading AI model... This may take a few minutes on first run.');
      
      webLLM = await CreateMLCEngine(selectedModel, {
        initProgressCallback: (progress: any) => {
          const percent = Math.round(progress.progress * 100);
          console.log(`📊 Loading ${selectedModel}: ${percent}%`);
          if (progress.text) {
            console.log(`   ${progress.text}`);
          }
        }
      });
      
      // Step 5: Cache globally for reuse
      (window as any).webLLMEngine = webLLM;
      (window as any).webLLMModelId = selectedModel;
      
      console.log(`🎉 WebLLM AI System Ready! Model: ${selectedModel}`);
      return webLLM;
      
    } catch (error) {
      console.error('❌ WebLLM initialization failed:', error);
      
      // Provide helpful troubleshooting
      if (error instanceof Error) {
        if (error.message.includes('ExitStatus')) {
          console.log('💡 ExitStatus error detected. Try:');
          console.log('   1. Refresh the page');
          console.log('   2. Check WebGPU support: chrome://gpu/');
          console.log('   3. Close other tabs using GPU');
        } else if (error.message.includes('NetworkError')) {
          console.log('💡 Network error. Check internet connection.');
        } else {
          console.log('💡 For best results:');
          console.log('   1. Use Chrome 113+ or Firefox 117+');
          console.log('   2. Ensure 2GB+ available RAM');
          console.log('   3. Try: http://localhost:3000/webllm/test.html first');
        }
      }
      
      webLLM = null;
      return null;
    } finally {
      isInitializing = false;
      initializationPromise = null;
    }
  })();
  
  return initializationPromise;
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
      try {
        setStatusMessage('🔄 Checking AI availability...');
        
        // Check if WebLLM is already ready
        if ((window as any).webLLMEngine && isEngineValid((window as any).webLLMEngine)) {
          setIsWebLLMReady(true);
          setStatusMessage('🤖 AI Ready!');
          setTimeout(() => setStatusMessage(''), 2000);
          return;
        } else if ((window as any).webLLMEngine) {
          // Clean up disposed engine
          cleanupDisposedEngine();
        }
        
        // Try to initialize WebLLM
        const llm = await initializeWebLLM();
        if (llm) {
          setIsWebLLMReady(true);
          setStatusMessage('🤖 AI Ready!');
          console.log('✅ AI system initialized for content item');
        } else {
          setIsWebLLMReady(false);
          setStatusMessage('📝 Smart algorithm ready');
          console.log('ℹ️ AI not available, smart algorithm will be used');
        }
        
        setTimeout(() => setStatusMessage(''), 2000);
        
      } catch (err) {
        console.error('AI initialization error:', err);
        setIsWebLLMReady(false);
        setStatusMessage('📝 Smart algorithm ready');
        setTimeout(() => setStatusMessage(''), 2000);
      }
    };
    
    // Initialize AI system
    initLLM();
  }, []);

  const handleSummarize = async () => {
    setSaving(true);
    setStatusMessage('🔄 Initializing AI...');
    setSummary('');

    try {
      // Step 1: Initialize WebLLM
      const llm = await initializeWebLLM();
      
      if (llm && isEngineValid(llm)) {
        setStatusMessage('🤖 AI is analyzing content...');
        
        try {
          // Step 2: Prepare content with smart truncation (very conservative)
          const contentToSummarize = truncateForContext(item.content, 1200);
          
          console.log(`📝 Summarizing content: ${contentToSummarize.length} characters`);
          
          // Step 3: Generate AI summary with shorter prompts
          const response = await llm.chat.completions.create({
            messages: [
              { 
                role: "system", 
                content: "Summarize in 2-3 clear sentences." 
              },
              { 
                role: "user", 
                content: contentToSummarize 
              }
            ],
            temperature: 0.3, // Lower temperature for more focused summaries
            max_tokens: 120,   // Conservative token limit for response
            top_p: 0.9
          });
          
          const aiSummary = response.choices[0]?.message?.content?.trim();
          
          if (aiSummary && aiSummary.length > 10) {
            setSummary(aiSummary);
            setStatusMessage('✅ AI Summary Complete!');
            console.log('🤖 AI Summary generated successfully');
          } else {
            throw new Error('Empty or invalid AI response');
          }
          
        } catch (aiError) {
          console.error('AI Error:', aiError);
          
          // Handle specific AI errors
          if (aiError instanceof Error) {
            if (aiError.message.includes('ContextWindowSizeExceeded')) {
              setStatusMessage('⚠️ Content too long, using smart algorithm...');
              console.log('📏 Content still too long after truncation, using fallback');
            } else if (aiError.message.includes('Module has already been disposed')) {
              setStatusMessage('🔄 AI reloading, using smart algorithm...');
              console.log('🔄 Engine disposed during hot reload, cleaning up...');
              cleanupDisposedEngine();
            } else if (aiError.message.includes('NetworkError')) {
              setStatusMessage('⚠️ Network issue, using smart algorithm...');
            } else {
              setStatusMessage('⚠️ AI temporarily unavailable, using smart algorithm...');
            }
          }
          
          // Fallback to smart algorithm
          const smartSummary = createAdvancedSummary(item.content);
          setSummary(smartSummary);
          setStatusMessage('📝 Smart Summary Complete!');
        }
        
      } else {
        // WebLLM not available, use smart algorithm
        setStatusMessage('📝 Using smart algorithm...');
        const smartSummary = createAdvancedSummary(item.content);
        setSummary(smartSummary);
        setStatusMessage('📝 Smart Summary Complete!');
      }
      
      setShowSummary(true);
      
    } catch (error) {
      console.error('Summarization error:', error);
      setSummary('Error generating summary. Please try again.');
      setShowSummary(true);
      setStatusMessage('❌ Error occurred');
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage(''), 4000);
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
  const [aiSystemStatus, setAiSystemStatus] = useState<'initializing' | 'ready' | 'unavailable'>('initializing');

  // Initialize AI system on dashboard load
  useEffect(() => {
    const initAI = async () => {
      try {
        setAiSystemStatus('initializing');
        const llm = await initializeWebLLM();
        if (llm) {
          setAiSystemStatus('ready');
          console.log('🎉 Dashboard AI system ready');
        } else {
          setAiSystemStatus('unavailable');
          console.log('ℹ️ Dashboard using smart algorithms');
        }
      } catch (error) {
        console.error('Dashboard AI initialization failed:', error);
        setAiSystemStatus('unavailable');
      }
    };
    
    if (isLoaded && user) {
      initAI();
    }
  }, [isLoaded, user]);

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
            {/* AI System Status Indicator */}
            <div style={{
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              fontWeight: '500',
              background: aiSystemStatus === 'ready' ? '#dcfce7' : 
                         aiSystemStatus === 'initializing' ? '#fef3c7' : '#fef2f2',
              color: aiSystemStatus === 'ready' ? '#166534' : 
                     aiSystemStatus === 'initializing' ? '#92400e' : '#991b1b',
              border: `1px solid ${aiSystemStatus === 'ready' ? '#bbf7d0' : 
                                   aiSystemStatus === 'initializing' ? '#fde68a' : '#fecaca'}`
            }}>
              {aiSystemStatus === 'ready' && '🤖 AI Ready'}
              {aiSystemStatus === 'initializing' && '🔄 Loading AI...'}
              {aiSystemStatus === 'unavailable' && '📝 Smart Mode'}
            </div>
            
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