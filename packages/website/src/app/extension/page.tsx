'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ExtensionPage() {
  const [downloading, setDownloading] = useState(false);
  
  const downloadExtension = async () => {
    try {
      setDownloading(true);
      
      // Create download link and trigger download
      const response = await fetch('/api/download-extension');
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'readwatch-tracker-extension.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again or contact support.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1rem 0'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
            📚 ReadWatch Tracker
          </h1>
          <nav style={{ display: 'flex', gap: '2rem' }}>
            <Link href="/" style={{ color: '#6b7280', textDecoration: 'none' }}>
              Dashboard
            </Link>
            <Link href="/discover" style={{ color: '#6b7280', textDecoration: 'none' }}>
              Discover
            </Link>
            <Link href="/extension" style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}>
              Extension
            </Link>
          </nav>
        </div>
      </header>

      <main style={{ padding: '4rem 2rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem', color: '#1f2937' }}>
            🔗 ReadWatch Tracker Extension
          </h1>
          
          <p style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '3rem' }}>
            Automatically track and analyze your reading and watching habits across the web.
          </p>

          {/* Features */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '2rem', 
            marginBottom: '3rem' 
          }}>
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: '#1f2937' }}>
                Auto-Detection
              </h3>
              <p style={{ color: '#6b7280' }}>
                Automatically detects articles, videos, and podcasts you consume
              </p>
            </div>
            
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: '#1f2937' }}>
                AI Analysis
              </h3>
              <p style={{ color: '#6b7280' }}>
                Analyzes content quality and generates smart summaries
              </p>
            </div>
            
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: '#1f2937' }}>
                Smart Insights
              </h3>
              <p style={{ color: '#6b7280' }}>
                Track your learning journey with detailed analytics
              </p>
            </div>
          </div>

          {/* Installation Instructions */}
          <div style={{ 
            backgroundColor: 'white', 
            padding: '2rem', 
            borderRadius: '12px', 
            marginBottom: '2rem', 
            textAlign: 'left',
            border: '1px solid #e2e8f0'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
              📋 Installation Instructions
            </h2>
            
            <ol style={{ 
              listStyle: 'decimal', 
              paddingLeft: '1.5rem', 
              color: '#374151', 
              lineHeight: '1.8',
              fontSize: '1rem'
            }}>
              <li>Click the "Download Extension" button below to get the extension files</li>
              <li>Extract the downloaded ZIP file to a folder on your computer</li>
              <li>Open Chrome and go to <code style={{ 
                backgroundColor: '#f3f4f6', 
                padding: '0.25rem 0.5rem', 
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}>chrome://extensions/</code></li>
              <li>Enable "Developer mode" toggle in the top right corner</li>
              <li>Click "Load unpacked" button</li>
              <li>Select the extracted extension folder</li>
              <li>The ReadWatch Tracker extension will appear in your toolbar</li>
              <li>📌 Pin the extension to your toolbar for easy access</li>
              <li>🎉 Visit any article or video page to start tracking!</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={downloadExtension}
              disabled={downloading}
              style={{
                fontSize: '1.125rem',
                padding: '1rem 2rem',
                background: downloading ? '#9ca3af' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: downloading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                opacity: downloading ? 0.7 : 1
              }}
            >
              {downloading ? '⏳ Downloading...' : '📥 Download Extension'}
            </button>
            
            <Link 
              href="/"
              style={{
                fontSize: '1.125rem',
                padding: '1rem 2rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                display: 'inline-block'
              }}
            >
              ← Back to Dashboard
            </Link>
          </div>

          {/* Download Info */}
          <div style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            backgroundColor: '#f0f9ff', 
            borderRadius: '8px', 
            border: '1px solid #bae6fd' 
          }}>
            <p style={{ color: '#0369a1', fontSize: '0.875rem', margin: 0 }}>
              📦 <strong>Download Info:</strong> The ZIP file contains all necessary extension files including manifest.json, background scripts, and popup interface.
            </p>
          </div>

          {/* Sync Info */}
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            backgroundColor: '#eff6ff', 
            borderRadius: '8px', 
            border: '1px solid #bfdbfe' 
          }}>
            <p style={{ color: '#1e40af', fontSize: '0.875rem', margin: 0 }}>
              💡 <strong>Sync Note:</strong> The extension automatically syncs with your ReadWatch Tracker account. 
              Make sure you're signed in here first to see your tracked content on the dashboard!
            </p>
          </div>

          {/* Status Check */}
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            backgroundColor: '#f0fdf4', 
            borderRadius: '8px', 
            border: '1px solid #bbf7d0' 
          }}>
            <p style={{ color: '#15803d', fontSize: '0.875rem', margin: 0 }}>
              ✅ <strong>Server Status:</strong> Running at localhost:3000 - Ready to sync with extension!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
} 