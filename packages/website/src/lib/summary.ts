/**
 * Building a 5–6 line summary that stays faithful to the page.
 *
 * The local model (small, so it downloads quickly) writes a one-sentence overview; the key points
 * under it are the most informative sentences of the page itself, picked by how many of the page's
 * recurring words they cover. Picked sentences are quoted, never rewritten, so they cannot be wrong.
 */

const STOP = new Set(('the and for with that this from into about what which their there have has are was were will ' +
  'would can could should also more most than then them they these those such only just very much many some other its ' +
  'it is be been being of to in on at by as an a or not no yes how why when where who whom whose your you we our one ' +
  'two his her he she him all any each so if but out up do does did done use used using get gets make makes made').split(' '));

/** Sentences of a text, keeping decimals and short abbreviations ("e.g.", "v1.2") intact. */
export function splitSentences(text: string): string[] {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  return clean
    .split(/(?<=[.!?])\s+(?=[\p{Lu}\d"“(])/u)
    .map(s => s.trim())
    .filter(Boolean);
}

const words = (s: string) => (s.toLowerCase().match(/\p{L}{3,}/gu) || []).filter(w => !STOP.has(w));

function overlap(a: string, b: string): number {
  const A = new Set(words(a)), B = new Set(words(b));
  if (!A.size || !B.size) return 0;
  let n = 0;
  A.forEach(w => { if (B.has(w)) n++; });
  return n / Math.min(A.size, B.size);
}

// Lines that are page furniture rather than content
const JUNK = /^(cookie|we use cookies|subscribe|sign (up|in)|log ?in|share|follow us|copyright|all rights|advertisement|read more|click here|skip to)/i;

/** Up to `max` informative sentences from `text`, in their original order, that don't repeat `avoid`. */
export function keyPoints(text: string, avoid: string[] = [], max = 4, budget = 460): string[] {
  const sents = splitSentences(text).filter(s =>
    s.length >= 40 && s.length <= 240 && !JUNK.test(s) && /\p{Ll}/u.test(s) && !/https?:\/\//.test(s));
  if (!sents.length) return [];

  // words that recur across the page say what it is about
  const df = new Map<string, number>();
  sents.forEach(s => new Set(words(s)).forEach(w => df.set(w, (df.get(w) || 0) + 1)));
  const scored = sents.map((s, i) => {
    const ws = Array.from(new Set(words(s)));
    const info = ws.reduce((acc, w) => acc + Math.log(1 + (df.get(w) || 0)), 0) / Math.sqrt(Math.max(ws.length, 1));
    const early = 0.25 * (1 - i / sents.length);
    const long = s.length > 170 ? 0.3 : 0;
    return { s, i, score: info + early - long };
  });

  const chosen: { s: string; i: number }[] = [];
  let used = 0;
  for (const c of scored.sort((a, b) => b.score - a.score)) {
    if (chosen.length >= max) break;
    if (used + c.s.length > budget && chosen.length >= 2) continue;
    if ([...avoid, ...chosen.map(x => x.s)].some(a => overlap(a, c.s) > 0.6)) continue;
    chosen.push(c);
    used += c.s.length;
  }
  return chosen.sort((a, b) => a.i - b.i).map(c => c.s);
}

/** One overview sentence followed by bullet points: about five or six lines in the card. */
export function composeSummary(lead: string, points: string[]): string {
  const head = lead.trim();
  const body = points.map(p => `• ${p}`).join('\n');
  return [head, body].filter(Boolean).join('\n');
}

/** The text a summary is made from: the description plus whatever page text was captured. */
export function summarySource(item: { title?: string; description?: string; content?: string }): string {
  const desc = String(item.description || '').trim();
  const body = String(item.content || '').trim();
  const text = body && desc && body.includes(desc.slice(0, 80)) ? body : [desc, body].filter(Boolean).join(' ');
  return text.replace(item.title || '', '').replace(/\s+/g, ' ').trim().slice(0, 4000);
}
