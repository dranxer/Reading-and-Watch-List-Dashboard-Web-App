export default function ExtensionPage() {
  const downloadExtension = () => {
    // Create a simple zip file download
    alert('Extension download would start here. For now, please manually load the extension from packages/extension folder.');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <main className="main-container">
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', padding: '4rem 1rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>
            🔗 ReadWatch Tracker Extension
          </h1>
          
          <p style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '3rem' }}>
            Automatically track and analyze your reading and watching habits across the web.
          </p>

          <div className="features-grid" style={{ marginBottom: '3rem' }}>
            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <h3 className="feature-title">Auto-Detection</h3>
              <p className="feature-description">Automatically detects articles, videos, and podcasts you consume</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3 className="feature-title">AI Analysis</h3>
              <p className="feature-description">Local AI analyzes content quality and generates smart summaries</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3 className="feature-title">Smart Insights</h3>
              <p className="feature-description">Track your learning journey with detailed analytics and trends</p>
            </div>
          </div>

          {/* Installation Instructions */}
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', marginBottom: '2rem', textAlign: 'left' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
              Installation Instructions
            </h2>
            
            <ol style={{ listStyle: 'decimal', paddingLeft: '1.5rem', color: '#374151', lineHeight: '1.8' }}>
              <li>Download the extension files</li>
              <li>Open Chrome and go to <code style={{ backgroundColor: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>chrome://extensions/</code></li>
              <li>Enable "Developer mode" in the top right</li>
              <li>Click "Load unpacked" and select the extension folder</li>
              <li>The ReadWatch Tracker extension will appear in your toolbar</li>
              <li>Visit any article or video page to start tracking!</li>
            </ol>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={downloadExtension}
              className="btn btn-primary"
              style={{ fontSize: '1.125rem', padding: '1rem 2rem' }}
            >
              📥 Download Extension
            </button>
            
            <a 
              href="/"
              className="btn btn-secondary"
              style={{ fontSize: '1.125rem', padding: '1rem 2rem', backgroundColor: '#f3f4f6', color: '#374151' }}
            >
              ← Back to App
            </a>
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
            <p style={{ color: '#1e40af', fontSize: '0.875rem', margin: 0 }}>
              💡 <strong>Note:</strong> The extension automatically syncs with your ReadWatch Tracker account. 
              Make sure you're signed in to see your tracked content!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
} 