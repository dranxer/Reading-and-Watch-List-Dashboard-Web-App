import Link from 'next/link';

export default function Navigation() {
  return (
    <nav className="nav">
      <div className="container">
        <div className="nav-content">
          <Link href="/" className="nav-logo">
            ReadingTracker
          </Link>
          
          <div className="nav-links">
            <Link href="/discover" className="nav-link">
              Discover
            </Link>
            <Link href="/extension" className="nav-link">
              Extension
            </Link>
            <Link href="/login" className="nav-link">
              Login
            </Link>
            <Link href="/signup" className="button button-primary">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
} 