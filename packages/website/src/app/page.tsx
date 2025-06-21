'use client';

import { SignedIn, SignedOut, UserButton, SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Reading Tracker</h1>
        <div>
          <SignedOut>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <SignInButton mode="modal">
                <button style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Sign Up</button>
              </SignUpButton>
            </div>
          </SignedOut>
          <SignedIn>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Link href="/dashboard">
                <button style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Dashboard</button>
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
        </div>
      </header>
      <main style={{ marginTop: '4rem' }}>
        <h2>Welcome to your intellectual journey tracker.</h2>
        <p>Sign up or sign in to start tracking the articles and videos you consume.</p>
      </main>
    </div>
  );
}
