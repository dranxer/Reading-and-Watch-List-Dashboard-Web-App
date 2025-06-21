'use client';

import { SignedIn, SignedOut, UserButton, SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <div className="dashboard-container fade-in">
      <div className="dashboard-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 className="dashboard-title">Reading Tracker</h1>
          <div>
            <SignedOut>
              <div className="nav-links">
                <SignInButton mode="modal">
                  <button className="nav-link">Sign In</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="nav-link">Sign Up</button>
                </SignUpButton>
              </div>
            </SignedOut>
            <SignedIn>
              <div className="nav-links">
                <Link href="/dashboard" className="nav-link">
                  📊 Dashboard
                </Link>
                <UserButton afterSignOutUrl="/" />
              </div>
            </SignedIn>
          </div>
        </div>
        
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '600', marginBottom: '1rem', color: '#333' }}>
            Your Intellectual Journey Tracker
          </h2>
          <p style={{ fontSize: '1.2rem', color: '#666', lineHeight: '1.6', maxWidth: '600px', margin: '0 auto' }}>
            Transform how you consume content with AI-powered summaries and intelligent reading insights.
          </p>
        </div>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="content-card">
          <div className="card-meta">
            <span className="card-type">🚀</span>
            <span>Browser Extension</span>
          </div>
          <h3 className="card-title">Smart Content Extraction</h3>
          <p className="card-summary">
            Our browser extension automatically extracts and summarizes articles as you browse, 
            saving you time while preserving the key insights.
          </p>
          <div className="card-actions">
            <button className="btn btn-primary">
              📥 Install Extension
            </button>
          </div>
        </div>

        <div className="content-card">
          <div className="card-meta">
            <span className="card-type">🤖</span>
            <span>AI Summaries</span>
          </div>
          <h3 className="card-title">AI-Powered Summaries</h3>
          <p className="card-summary">
            Get intelligent summaries of your reading material using advanced AI models, 
            helping you retain more information in less time.
          </p>
          <div className="card-actions">
            <SignedIn>
              <Link href="/dashboard" className="btn btn-primary">
                View Summaries
              </Link>
            </SignedIn>
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="btn btn-primary">Get Started</button>
              </SignUpButton>
            </SignedOut>
          </div>
        </div>

        <div className="content-card">
          <div className="card-meta">
            <span className="card-type">📊</span>
            <span>Analytics</span>
          </div>
          <h3 className="card-title">Reading Analytics</h3>
          <p className="card-summary">
            Track your reading habits, discover patterns, and optimize your learning 
            with detailed analytics and insights about your content consumption.
          </p>
          <div className="card-actions">
            <SignedIn>
              <Link href="/dashboard" className="btn btn-primary">
                View Analytics
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="btn btn-primary">Sign In</button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '4rem' }}>
        <SignedOut>
          <div className="empty-state" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="empty-icon">🎯</div>
            <h2 className="empty-title">Ready to transform your reading?</h2>
            <p className="empty-description">
              Join thousands of readers who are already using AI-powered summaries 
              to read smarter and learn faster.
            </p>
            <div className="card-actions" style={{ justifyContent: 'center' }}>
              <SignUpButton mode="modal">
                <button className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}>
                  Start Your Journey
                </button>
              </SignUpButton>
              <SignInButton mode="modal">
                <button className="btn btn-secondary" style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}>
                  Sign In
                </button>
              </SignInButton>
            </div>
          </div>
        </SignedOut>
        
        <SignedIn>
          <div className="empty-state" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="empty-icon">🎉</div>
            <h2 className="empty-title">Welcome back!</h2>
            <p className="empty-description">
              Continue your reading journey and discover new insights from your saved content.
            </p>
            <div className="card-actions" style={{ justifyContent: 'center' }}>
              <Link href="/dashboard" className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}>
                Go to Dashboard
              </Link>
            </div>
          </div>
        </SignedIn>
      </div>
    </div>
  );
}
