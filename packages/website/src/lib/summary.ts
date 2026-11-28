/**
 * Building a 5–6 line summary that stays faithful to the page.
 *
 * The local model (small, so it downloads quickly) writes a one-sentence overview; the key points
 * under it are the most informative sentences of the page itself, picked by how many of the page's
 * recurring words they cover. Picked sentences are quoted, never rewritten, so they cannot be wrong.
 *
 * Page text captured by the extension is noisy: bylines, image captions, headings glued to the next
 * sentence, tables, code, link lists. Only sentences that read as prose are ever used.
 */

const STOP = new Set(('the and for with that this from into about what which their there have has are was were will ' +
  'would can could should also more most than then them they these those such only just very much many some other its ' +
  'it is be been being of to in on at by as an a or not no yes how why when where who whom whose your you we our one ' +
  'two his her he she him all any each so if but out up do does did done use used using get gets make makes made').split(' '));

const PARA = '¶';   // paragraph boundary
const IMG = '⧉';    // an image stood here; what follows may be its caption

// "Dr.", "U.S.", "e.g.", "P.F." and friends end with a full stop without ending the sentence
const ABBREV = /(?:^|[\s(])(?:(?:\p{Lu}\.){1,4}|(?:Dr|Prof|Mr|Mrs|Ms|St|Jr|Sr|vs|etc|Inc|Ltd|Co|No|Fig|Figs|approx|Eq|Vol|Ch|Sec|al|e\.g|i\.e|cf|viz)\.)$/u;

/** Sentences of a text, keeping decimals and abbreviations ("e.g.", "Dr.", "v1.2") intact. */
export function splitSentences(text: string): string[] {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const out: string[] = [];
  for (const piece of clean.split(/(?<=[.!?।。！？])\s+(?=[^\p{Ll}\s])/u)) {
    const prev = out[out.length - 1];
    if (prev && ABBREV.test(prev)) out[out.length - 1] = `${prev} ${piece}`;
    else out.push(piece.trim());
  }
  return out.filter(Boolean);
}

const words = (s: string) => (s.toLowerCase().match(/\p{L}{3,}/gu) || []).filter(w => !STOP.has(w));

function overlap(a: string, b: string): number {
  const A = new Set(words(a)), B = new Set(words(b));
  if (!A.size || !B.size) return 0;
  let n = 0;
  A.forEach(w => { if (B.has(w)) n++; });
  return n / Math.min(A.size, B.size);
}

// ---- what is not prose ------------------------------------------------------------------------------

// Image widgets and credits (replaced by IMG, so the caption after them can be cut)
const IMAGE_UI = /Press enter or click to view image in full size|Click (?:here )?to (?:enlarge|expand|zoom)|Zoom image will be displayed|(?:Image|Photo|Illustration) (?:by|courtesy of|credit:?|source:?) [^.¶⧉]{1,50}?(?= [\p{Lu}¶⧉]|$)|Photo by [^.¶⧉]{1,60}? on (?:Unsplash|Pexels|Pixabay)/giu;
// Other page furniture
const AFTER_UI = /Related Topics|More on this story|Top stories|Most read|Read more:|See also:|Recommended for you|Trending now/g;
const OTHER_UI = /Member-only story|Listen Share|Sign up to discover[^.]*\.|Open in app|Get unlimited access[^.]*\.|Skip to (?:main )?content|Jump to (?:navigation|search|content)|Table of contents|Advertisement|Sponsored|From Wikipedia, the free encyclopedia|"[^"]{1,60}" redirects here\.|For other uses, see [^.]*\.|This article is about [^.]*\.|[^.]{0,60}\(disambiguation\)\.?/gi;
const JUNK = /^(cookie|we use cookies|subscribe|sign (up|in)|log ?in|share|follow (us|me)|copyright|all rights|advertisement|read more|click (here|below)|skip to|related|previous|next)\b/i;
const META = /\b\d+\s*min (read|listen)\b|\bmember-only\b|\bwritten by\b|[·•|]|\bposted (on|by)\b|\bupdated on\b|\blast updated\b|\b\d+\s+(views|likes|comments|claps|subscribers|reactions)\b|\b\d+\s+(seconds?|minutes?|hours?|days?|weeks?|months?|years?) ago\b/i;
const FOLLOW = /\d[\d.,]*[KkM]?\s+Followers\b|\sFollow\s/;
const CODE = /[<>{}=;\\[\]`]|=>|\+\+|&&|\|\||\b[\w$]+\([^()\s]+(?:,\s*[^()]+)*\)|\/\*|\/\//;
const CALLS = /\b[\w$.]+\(\)/g;
const DANGLING = /\b(following|below|above) (table|figure|image|code|snippet|example|list|diagram|output|steps?)\b|\b(table|figure|code|image|diagram) (below|above)\b|\bas follows\b|:$|^(here('s| is| are)|as (shown|you can see)|see (the|below|above)|below (is|are)|above (is|are))\b/i;
const FLUFF = /\b(thanks for reading|happy (coding|learning)|hope (you|this|that)|let'?s (dive|get started|begin|start|see|look)|don'?t forget to|like and subscribe|leave a comment|feel free to|stay tuned|give it a clap|link in (the )?(bio|description)|check out (my|our|the) (channel|course|website)|cookies?|privacy policy|terms of (service|use)|free articles?|create an account|read the full (story|article)|already a member|become a member|sign in to|newsletter|unsubscribe)\b/i;
// A subordinate clause left on its own once the question before it was dropped: "Because the data lives in memory."
const FRAGMENT = /^(Because|Since|Although|Though|Whereas|Unless|Whether)\b[^,;]*[.!]$/;
const NOISE = /https?:\/\/|www\.|#\w|@\w|\b\d{1,2}:\d{2}\b|[\u{1F300}-\u{1FAFF}☀-➿]/u;

/** A sentence a person wrote as prose: starts and ends like one, no furniture, code or links. */
function isProse(s: string): boolean {
  const ws = s.split(/\s+/).filter(Boolean);
  if (ws.length < 6 || ws.length > 60) return false;
  if (!/^[“"(]?[\p{Lu}\p{Lo}\d]/u.test(s)) return false;
  if (!/[.!।。！]["”’')]?$/u.test(s)) return false;              // a statement, not a question or a fragment
  const cased = ws.filter(w => /^[“"(]?\p{L}/u.test(w) && /\p{Lu}|\p{Ll}/u.test(w));
  const caps = cased.filter((w, i) => i > 0 && /^[“"(]?\p{Lu}/u.test(w)).length;
  if (cased.length && caps / cased.length > 0.4) return false;      // title case, tag lists, table cells
  const digits = ws.filter(w => /\d/.test(w)).length;
  if (digits / ws.length > 0.25) return false;
  if ((s.match(CALLS) || []).length >= 3) return false;
  return !META.test(s) && !FOLLOW.test(s) && !CODE.test(s) && !DANGLING.test(s) && !JUNK.test(s) &&
    !FLUFF.test(s) && !NOISE.test(s) && !FRAGMENT.test(s);
}

/** Text safe to show as an overview line: no furniture, code or links. */
export function looksClean(s: string): boolean {
  const t = String(s || '').trim();
  return t.length >= 15 && t.length <= 300 && !META.test(t) && !FOLLOW.test(t) && !CODE.test(t) &&
    !NOISE.test(t) && !FLUFF.test(t) && !new RegExp(IMAGE_UI.source, 'iu').test(t) && !/^\p{Ll}/u.test(t);
}

// ---- repairing sentences that flattening broke ---------------------------------------------------------

// "…including: Insertion: To insert…" -> split before the label and drop it
const LABEL_AT = /\s(?=\p{Lu}[\p{L}'-]*(?:\s[\p{L}\d'-]+){0,2}:\s+[\p{Lu}\d])/u;
const LABEL = /^\p{Lu}[\p{L}'-]*(?:\s[\p{L}\d'-]+){0,2}:\s+(?=[\p{Lu}\d])/u;
function splitLabels(s: string): string[] {
  return s.split(LABEL_AT).map(p => p.replace(LABEL, '').trim()).filter(Boolean);
}

// A heading glued to the next sentence: "Implementation A heap is…"
const OPENERS = '(?:A|An|The|In|It|This|These|Those|Each|Every|With|When|If|For|To|Most|Many|We|You|Our|There|Unlike|While|Because|Since|After|Before|One|Some|All)';
const HEADING = new RegExp(`^((?:\\S+\\s+){1,6}?)(?=${OPENERS}\\s+\\p{Ll})`, 'u');
function dropHeading(s: string): string {
  const m = HEADING.exec(s);
  if (!m) return s;
  const head = m[1].trim(), hw = head.split(/\s+/);
  const looksLikeHeading = /^\p{Lu}/u.test(hw[0]) && !/[,.;:!?]$/.test(head) &&
    hw.filter(w => /^\p{Lu}|^\d/u.test(w)).length >= Math.ceil(hw.length / 2);
  return looksLikeHeading ? s.slice(m[0].length) : s;
}

// Right after an image the caption runs into the next sentence: "Figure 2: tree after insertion The tree…"
const RESTART = new RegExp(`^(.{3,120}?[\\p{Ll}\\d)])\\s+(?=${OPENERS}\\s+\\p{Ll})`, 'u');
function dropCaption(s: string): string {
  const m = RESTART.exec(s);
  if (m && !/[.!?]$/.test(m[1])) return s.slice(m[0].length);
  // a run of capitalised words (tags, a caption in title case) in front: let salvage find the sentence
  const first = s.split(/\s+/).slice(0, 5).filter(w => !/\.$/.test(w));
  return first.filter(w => /^\p{Lu}/u.test(w)).length >= 3 ? (salvage(s) || '') : s;
}

// A byline, tag list or heading in front of a sentence: "…LastBrainCell Follow 4 min read · May 12, 2020 24 Priority
// queue is…". The sentence starts after the last piece of page furniture (a date, count, tag, link or button word);
// without any, only a short heading in front is cut. Of the endings that read as a sentence, one opening like a
// sentence ("The …", "A …") wins; otherwise the one with the fewest stray capitals (glued headings).
const FURNITURE = /\d|[#@:·•|/]|^(Follow|Share|Listen|Save|ago|read|Read|More|Reply|Like|Subscribe|Menu|Home|Login)$|[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u;
const OPENER_RE = new RegExp(`^${OPENERS}\\s`, 'u');
const innerCaps = (s: string) => s.split(/\s+/).slice(1).filter(w => /^[“"(]?\p{Lu}/u.test(w)).length;
function salvage(s: string): string {
  if (CODE.test(s)) return '';
  const ws = s.split(/\s+/);
  const anchors = ws.map((w, i) => (FURNITURE.test(w) ? i : -1)).filter(i => i >= 0).reverse();
  // try after the last piece of furniture first (digits can sit inside the sentence too, so fall back to earlier ones)
  for (const anchor of anchors.length ? anchors : [-1]) {
    const from = Math.max(1, anchor + 1), to = anchor >= 0 ? ws.length - 6 : Math.min(ws.length - 6, 9);
    const found: string[] = [];
    for (let i = from; i < to; i++) {
      if (!/^\p{Lu}/u.test(ws[i]) || !/^\p{Ll}/u.test(ws[i + 1] || '')) continue;
      const rest = dropHeading(ws.slice(i).join(' '));
      if (isProse(rest)) found.push(rest);
    }
    if (found.length) {
      return found.find(f => OPENER_RE.test(f)) ||
        found.reduce((best, f) => (innerCaps(f) < innerCaps(best) ? f : best));
    }
  }
  return '';
}

// ---- cleaning ---------------------------------------------------------------------------------------

/** Removes what pages put around an article: bylines, captions, menus, footers, citation marks. */
export function cleanSource(text: string): string {
  let t = String(text || '').replace(/\r/g, '');
  if (t.includes('\n')) {
    // Line breaks kept: a short line without end punctuation is a heading, caption, button or tag
    t = t.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).map(l =>
      !l ? PARA : (/[.!?…।]["”’')\]]?$/u.test(l) || l.split(' ').length >= 16) ? l : PARA).join(' ');
  }
  t = t.replace(IMAGE_UI, ` ${IMG} `).replace(AFTER_UI, ` ${IMG} `).replace(OTHER_UI, ` ${PARA} `)
    .replace(/\[(?:\d+|[a-z]|citation needed|edit)\]/gi, '')
    .replace(/\s+/g, ' ').replace(/\s+([.,!?;:])(?=\s|$)/g, '$1').trim();
  // Medium-style byline: "… Author Follow 4 min read · May 12, 2020 24 …"
  const head = /^[\s\S]{0,700}?\b\d+\s*min read\b(?:\s*·\s*(?:[A-Z][a-z]{2,8}\.?\s+\d{1,2},\s*\d{4}|[A-Z][a-z]{2,8}\.?\s+\d{1,2}|\d+\s*[a-z]+\s+ago|Just now))?(?:\s+\d[\d.,]*[KkMm]?){0,2}(?:\s+(?:Listen|Share|Save))*\s*/.exec(t);
  if (head) t = t.slice(head[0].length);
  const tail = /\s(Written by|More from|Recommended from Medium|See all from|Responses \(\d+\)|You may also like|Related (?:posts|articles|reading)|Share this (?:article|post)|About the author|Leave a (?:comment|reply)|See also|References|External links|Further reading)\b(?![^.]{0,80}[a-z]{3,}[^.]{0,80}\.)/.exec(t);
  if (tail && tail.index > 300) t = t.slice(0, tail.index);
  return t.trim();
}

/** The sentences of a text that read as prose, in order. */
export function proseSentences(text: string): string[] {
  const out: string[] = [];
  for (const para of cleanSource(text).split(PARA)) {
    para.split(IMG).forEach((block, b) => {
      splitSentences(block).flatMap(splitLabels).forEach((raw, i) => {
        let s = dropHeading(b > 0 && i === 0 ? dropCaption(raw) : raw);
        if (s && !isProse(s)) s = salvage(s);
        if (s && s.length >= 30 && s.length <= 320 && !out.includes(s)) out.push(s);
      });
    });
  }
  return out;
}

/** Prose from the start of a text, up to `max` characters: what the model reads for the overview. */
export function proseText(text: string, max = 600): string {
  let out = '';
  for (const s of proseSentences(text)) {
    if (out && out.length + s.length + 1 > max) break;
    out = out ? `${out} ${s}` : s;
  }
  return out;
}

/** The first proper sentence of a text: the overview to fall back on when the model has none. */
export function firstSentence(text: string): string {
  return proseSentences(text)[0] || '';
}

/** Up to `max` informative sentences from `text`, in their original order, that don't repeat `avoid`. */
export function keyPoints(text: string, avoid: string[] = [], max = 4, budget = 380): string[] {
  const sents = proseSentences(text).filter(s => s.length >= 40 && s.length <= 240);
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

/** One overview sentence followed by up to four bullet points: about five or six lines in the card. */
export function composeSummary(lead: string, points: string[]): string {
  const head = splitSentences(lead)[0] || lead.trim();
  const body = points.filter(p => p !== head).map(p => `• ${p}`).join('\n');
  return [head, body].filter(Boolean).join('\n');
}

/** The raw text a summary is made from: the description plus whatever page text was captured. */
export function summarySource(item: { title?: string; description?: string; content?: string }): string {
  const desc = String(item.description || '').trim();
  const body = String(item.content || '').trim();
  let text = body && desc && body.includes(desc.slice(0, 80)) ? body : [desc, body].filter(Boolean).join('\n\n');
  // The page title printed above the article sticks to its first sentence: cut it where a sentence starts after it
  const title = String(item.title || '').trim();
  for (const t of new Set([title, title.split(/\s+[|–—·-]\s+/)[0]])) {
    if (t.length < 8) continue;
    const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(`${esc}(?=\\s+[\\p{Lu}"“])`, 'gu'), ` ${PARA} `);
  }
  return text.slice(0, 12000);
}
