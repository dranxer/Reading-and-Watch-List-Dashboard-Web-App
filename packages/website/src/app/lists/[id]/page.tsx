'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { GoogleSignIn } from '@/lib/authClient';
export default function SharedList({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch(`/api/lists/${encodeURIComponent(id)}/share`).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setData(body);
    }).catch(e => setError(e.message));
  }, [id]);
  return <main className="main-container"><Link href="/">← Your library</Link><GoogleSignIn />{error ? <p role="alert">{error}. Sign in with the account invited by the owner.</p> : !data ? <p>Loading list…</p> : <><h1>{data.data.name}</h1><p>{data.data.description}</p><p>{data.data.role === 'editor' ? 'Shared with you — add items from your library.' : `${data.contents.length} items`}</p>{data.contents.map((item: any) => <article className="feature-card" key={item.id}><h2>{/^https?:\/\//i.test(item.url || '') ? <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a> : item.title}</h2><p>{item.description}</p></article>)}</>}</main>;
}
