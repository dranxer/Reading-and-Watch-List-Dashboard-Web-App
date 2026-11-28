import http from 'node:http';
import https from 'node:https';
import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

export function isPublicAddress(address: string): boolean {
  try {
    const parsed = ipaddr.process(address);
    return parsed.range() === 'unicast';
  } catch { return false; }
}

/** Fetch public web pages with DNS pinned to a validated address, bounded reads and checked redirects. */
export async function publicFetch(input: string, init: RequestInit = {}, redirects = 0): Promise<Response> {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port))) throw new Error('Only public HTTP(S) URLs are supported');
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(a => !isPublicAddress(a.address))) throw new Error('Private network URLs are not allowed');
  const address = addresses[0];
  return new Promise<Response>((resolve, reject) => {
    const req = (url.protocol === 'https:' ? https : http).request(url, {
      method: 'GET',
      headers: { ...Object.fromEntries(new Headers(init.headers)), 'Accept-Encoding': 'identity' },
      lookup: ((_host: string, _options: unknown, callback: any) => {
        if ((_options as any)?.all) callback(null, [address]);
        else callback(null, address.address, address.family);
      }) as any,
    }, res => {
      const status = res.statusCode || 502;
      if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
        res.resume();
        if (redirects >= 4) { reject(new Error('Too many redirects')); return; }
        publicFetch(new URL(res.headers.location, url).href, init, redirects + 1).then(resolve, reject);
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > 5 * 1024 * 1024) req.destroy(new Error('Page exceeds 5 MB'));
        else chunks.push(chunk);
      });
      res.on('error', reject);
      res.on('end', () => {
        const headers = new Headers();
        for (const [key, value] of Object.entries(res.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
        resolve(new Response([204, 205, 304].includes(status) ? null : Buffer.concat(chunks), { status, headers }));
      });
    });
    const timer = setTimeout(() => req.destroy(new Error('Page request timed out')), 15000);
    req.on('close', () => clearTimeout(timer));
    req.on('error', reject);
    req.end();
  });
}
