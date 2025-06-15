import Link from 'next/link';

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <h1>Track Your Intellectual Journey</h1>
          <p>Automatically log and share what you read and watch, powered by local AI</p>
          <div>
            <Link href="/signup" className="button button-primary">
              Get Started
            </Link>
            <Link href="/extension" className="button button-secondary">
              Download Extension
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2>Key Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>Automatic Tracking</h3>
              <p>Browser extension automatically logs your reading and watching history</p>
            </div>
            <div className="feature-card">
              <h3>AI Summaries</h3>
              <p>Local LLM generates smart summaries of your content</p>
            </div>
            <div className="feature-card">
              <h3>Share & Discover</h3>
              <p>Follow others and discover interesting content</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
