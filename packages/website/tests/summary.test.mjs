// node --experimental-strip-types --test tests/summary.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  summarySource, proseText, firstSentence, keyPoints, composeSummary, splitSentences, looksClean,
} from '../src/lib/summary.ts';
import { fixtures, BANNED } from './summary-fixtures.mjs';

// What the dashboard does when the local model is unavailable (the model only replaces the first line)
export function summarize(item) {
  const source = summarySource(item);
  const desc = String(item.description || '');
  const lead = firstSentence(desc) || firstSentence(source) || String(item.title || '');
  const points = keyPoints(source, [lead, ...(item.content ? splitSentences(desc.slice(0, 220)) : [])]);
  return { lead, points, text: composeSummary(lead, points), leadText: proseText(desc) || proseText(source) };
}

const SHOW = process.env.SHOW === '1';

for (const f of fixtures) {
  test(f.name, () => {
    const t0 = performance.now();
    const { lead, points, text, leadText } = summarize(f.item);
    const ms = performance.now() - t0;
    if (SHOW) console.log(`\n## ${f.name} (${text.length} chars, ${ms.toFixed(1)} ms)\n${text}`);

    assert.ok(ms < 100, `took ${ms} ms`);
    assert.ok(points.length >= f.minPoints, `only ${points.length} key points`);
    assert.ok(points.length <= 4, 'too many key points');
    assert.ok(text.length <= 700, `summary too long: ${text.length}`);

    const lines = text.split('\n');
    assert.equal(new Set(lines).size, lines.length, 'a line is repeated');
    if (f.item.title === undefined && !f.item.content) assert.equal(text, '');

    // Nothing from the page around the article, and every line reads as a sentence
    const hasProse = !!leadText;
    for (const line of hasProse ? lines : lines.slice(1)) {
      const s = line.replace(/^• /, '');
      assert.doesNotMatch(s, BANNED, `junk in: ${s}`);
      assert.match(s, /^[“"(]?[\p{Lu}\d\p{Lo}]/u, `does not start like a sentence: ${s}`);
      assert.match(s, /[.!।]["”’')]?$/u, `does not end like a sentence: ${s}`);
      const max = line.startsWith('• ') ? 240 : 320;
      assert.ok(s.length >= 30 && s.length <= max, `odd length (${s.length}): ${s}`);
    }
    for (const p of points) assert.ok(!lines[0] || p !== lines[0], 'key point repeats the overview');
    // What the model reads must be clean prose too
    if (leadText) assert.doesNotMatch(leadText, BANNED, `model input has junk: ${leadText.slice(0, 120)}`);
    assert.ok(leadText.length <= 600);
  });
}

test('overview lines from the model are checked', () => {
  for (const ok of [
    'Raft is a consensus algorithm that uses leader election, log replication and safety.',
    'One-hour introduction to large language models, training, and security risks.',
    'APIs are infrastructure for Stripe, keeping old versions working for years.',
  ]) assert.ok(looksClean(ok), ok);
  for (const bad of [
    'Member-only story Programming Interview Priorities of a PRIORITY QUEUE LastBrainCell Follow 4 min read',
    'Use priority_queue<int> pq; pq.push(3) to add values.',
    'Check out the code at https://github.com/example/repo for details.',
    'Press enter or click to view image in full size Deleting 3 with two children.',
    'In this video we will learn about trees #dsa #coding',
    'summary of the text above',
    'Short.',
    '',
  ]) assert.ok(!looksClean(bad), bad);
});

test('cleaning is stable when run twice', () => {
  for (const f of fixtures) {
    const src = summarySource(f.item);
    assert.deepEqual(keyPoints(src), keyPoints(proseText(src, 100000)), f.name);
  }
});

test('random and hostile input never throws or stalls', () => {
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const pieces = ['The ', 'a ', 'Tree', '. ', '? ', '! ', ': ', '(', ')', '[1]', '·', '•', '|', '#tag ', '@x ', '12:30 ', 'min read ',
    'Press enter or click to view image in full size ', '\n', '\n\n', 'Follow ', 'é', 'बाइनरी ', '🚀', '“', '”', 'U.S. ', 'e.g. ',
    'node ', 'value ', 'insert ', 'is stored in memory ', 'and ', 'Because ', '{', '}', '<T>', 'push(E) ', 'https://x.io ', 'A', 'z'];
  for (let n = 0; n < 300; n++) {
    let text = '';
    const len = Math.floor(rnd() * 3000);
    while (text.length < len) text += pieces[Math.floor(rnd() * pieces.length)];
    const t0 = performance.now();
    const { text: out } = summarize({ title: n % 3 ? 'The Tree' : '', description: n % 5 ? '' : text.slice(0, 300), content: text });
    const ms = performance.now() - t0;
    assert.ok(ms < 250, `case ${n} took ${ms.toFixed(0)} ms`);
    assert.ok(out.length <= 700);
  }
  // the size the dashboard can be handed: a whole long page
  const huge = 'Caching keeps data close to where it is used. '.repeat(400) + 'x'.repeat(50000) + ' (((((((((( '.repeat(2000);
  const t0 = performance.now();
  summarize({ title: 'Huge', content: huge });
  assert.ok(performance.now() - t0 < 1000);
});
