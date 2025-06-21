import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface ContentItem {
  _id: ObjectId;
  createdAt: Date;
  userId: string;
  url: string;
  title: string;
  content?: string;
  summary?: string;
  type: 'ARTICLE' | 'VIDEO';
}

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    // This should not happen due to our middleware, but it's a good safeguard.
    return <div style={{ padding: '2rem' }}>Redirecting...</div>;
  }

  const client = await clientPromise;
  const db = client.db('reading-tracker');
  const userContentItems = await db.collection('contentItems')
    .find({ userId: userId })
    .sort({ createdAt: -1 })
    .toArray() as ContentItem[];

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Your Dashboard</h1>
        <Link href="/">Home</Link>
      </header>
      
      <div>
        {userContentItems.length === 0 ? (
          <p>You haven't saved any articles yet. Install the extension and browse some articles to get started!</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {userContentItems.map((item) => (
              <li key={item._id.toString()} style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #eee', borderRadius: '8px' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{item.title}</h2>
                <p style={{ margin: '0 0 1rem 0', color: '#555' }}>{item.summary}</p>
                <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0070f3', textDecoration: 'none' }}>
                  Read Original &rarr;
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 