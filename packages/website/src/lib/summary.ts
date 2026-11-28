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

// Sentences that are page furniture, bylines, tables or code rather than prose
const JUNK = /^(cookie|we use cookies|subscribe|sign (up|in)|log ?in|share|follow us|copyright|all rights|advertisement|read more|click here|skip to)/i;
const META = /\b\d+\s*min (read|listen)\b|\bmember-only\b|\bwritten by\b|·|\|/i;
const FOLLOW = /\d[\d.,]*[KkM]?\s+Followers\b|\sFollow\s/;
const CODE = /[<>{}=;\\]|\(\)|\b\w+\.\w+\(|`/;
const DANGLING = /\b(following|below|above) (table|figure|image|code|snippet|example|list|diagram)\b|\b(table|figure|code) below\b|\bas follows\b|:$/i;
function isProse(s: string): boolean {
  const ws = s.split(/\s+/).filter(Boolean);
  if (ws.length < 6) return false;
  const caps = ws.filter((w, i) => i > 0 && /^[“"(]?\p{Lu}/u.test(w)).length;
  return caps / ws.length <= 0.4 && !META.test(s) && !FOLLOW.test(s) && !CODE.test(s) && !DANGLING.test(s) && !JUNK.test(s);
}

// Captured text loses its line breaks, so a heading sticks to the next sentence ("Implementation A heap is…")
const HEADING = /^(?:(?:Introduction|Conclusion|Summary|Overview|Background|Motivation|Implementation|Applications?|Examples?|Results|Discussion|Final thoughts|TL;DR|Key takeaways)\b[^.!?]{0,40}?\s+|(?:\S+\s+){1,5}?)(?=(?:A|An|The|In|It|This|These|Each|With|When|If|For|To|Most|Many|We|You|Our|There)\s+\p{Ll})/u;
function dropHeading(s: string): string {
  const m = HEADING.exec(s);
  if (!m || !m[0]) return s;
  const lead = m[0].trim().split(/\s+/);
  // only when the words in front look like a heading: capitalised, no punctuation
  const looksLikeHeading = /^\p{Lu}/u.test(lead[0]) && !/[,.;:!?]$/.test(m[0].trim()) &&
    lead.filter(w => /^\p{Lu}/u.test(w)).length >= Math.ceil(lead.length / 2);
  return looksLikeHeading ? s.slice(m[0].length) : s;
}

/** Strips what pages put around an article: Medium-style bylines up top, "Written by"/"More from" below. */
export function cleanSource(text: string): string {
  let t = String(text || '').replace(/\s+/g, ' ').replace(/\s+([.,!?;:])(?=\s|$)/g, '$1').trim();
  const head = /^[\s\S]{0,700}?\b\d+\s*min read\b(?:\s*·\s*(?:[A-Z][a-z]{2,8}\.?\s+\d{1,2},\s*\d{4}|\d+\s*(?:[a-z]+)\s+ago|Just now))?(?:\s+\d[\d.,]*[KkMm]?)?(?:\s+(?:\d+\s+)?(?:Listen|Share|Save))*\s*/.exec(t);
  if (head) t = t.slice(head[0].length);
  const tail = /\s(Written by|More from|Recommended from Medium|See all from|Sign up to discover|Responses \(\d+\)|You may also like|Related (posts|articles))\b/.exec(t);
  if (tail && tail.index > 300) t = t.slice(0, tail.index);
  return t.trim();
}

/** Up to `max` informative sentences from `text`, in their original order, that don't repeat `avoid`. */
export function keyPoints(text: string, avoid: string[] = [], max = 4, budget = 380): string[] {
  const sents = splitSentences(text).map(dropHeading).filter(s =>
    s.length >= 40 && s.length <= 240 && isProse(s) && /\p{Ll}/u.test(s) && !/https?:\/\//.test(s));
  if (!sents.length) return [];

  // words that recur across the page say what it is about
  const df = new Map<string, number>();
  sents.forEach(s => new Set(words(s)).forEach(w => df.set(w, (df.get(w) || 0) + 1)));
  const scored = sents.map((s, i) => {
    const ws = Array.from(new Set(words(s)));
    const info = ws.reduce((acc, w) => acc + Math.log(1 + (df.get(w) || 0)), 0) / Math.sqrt(Math.max(ws.length, 1));
    const early = 0.25 * (1 - i / sents.length);
    const long = s.length > 150 ? 0.3 : 0;
    return { s, i, score: info + early - long };
  });

  const chosen: { s: string; i: number }[] = [];
  let used = 0;
  for (const c of scored.sort((a, b) => b.score - a.score)) {
    if (chosen.length >= max) break;
    if (used + c.s.length > budget && chosen.length >= 2) continue;
    if ([...avoid, ...chosen.map(x => x.s)].some(a => overlap(a, c.s) >= 0.5)) continue;
    chosen.push(c);
    used += c.s.length;
  }
  return chosen.sort((a, b) => a.i - b.i).map(c => c.s);
}

/** One overview sentence followed by two to four bullet points: about five or six lines in the card. */
export function composeSummary(lead: string, points: string[]): string {
  const head = splitSentences(lead)[0] || lead.trim();     // one overview sentence
  const body = points.map(p => `• ${p}`).join('\n');
  return [head, body].filter(Boolean).join('\n');
}

/** The text a summary is made from: the description plus whatever page text was captured. */
export function summarySource(item: { title?: string; description?: string; content?: string }): string {
  const desc = String(item.description || '').trim();
  const body = String(item.content || '').trim();
  const text = body && desc && body.includes(desc.slice(0, 80)) ? body : [desc, body].filter(Boolean).join(' ');
  return cleanSource(text.replace(item.title || '', '')).slice(0, 4000);
}

/** The first proper sentence of a text: the overview to fall back on when the model has none. */
export function firstSentence(text: string): string {
  return splitSentences(cleanSource(text)).map(dropHeading).find(s => s.length >= 30 && s.length <= 260 && isProse(s)) || '';
}
