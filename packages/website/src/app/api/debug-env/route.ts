import { NextResponse } from 'next/server';

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;

  const html = `
    <body style="font-family: sans-serif; padding: 2rem;">
      <h1>Environment Variable Debug</h1>
      <p>This page checks if your Next.js application can see the DATABASE_URL environment variable from your .env.local file.</p>
      <hr>
      <p>Value of <strong>DATABASE_URL</strong>:</p>
      <pre style="background: #eee; padding: 1rem; border-radius: 8px; word-wrap: break-word;"><code>${dbUrl ? dbUrl : 'VARIABLE NOT FOUND'}</code></pre>
      <hr>
      <h2>Next Steps:</h2>
      <ul>
        <li>If you see your full database URL above, the file is correct, but the Prisma CLI can't see it. This points to a shell or terminal issue.</li>
        <li>If you see "VARIABLE NOT FOUND", your .env.local file is named incorrectly, in the wrong location, or has formatting/encoding errors.</li>
      </ul>
    </body>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
} 