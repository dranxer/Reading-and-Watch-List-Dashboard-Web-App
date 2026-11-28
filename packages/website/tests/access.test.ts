import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { isPublicAddress, publicFetch } from '../src/lib/publicFetch';
import { signSession, readSession } from '../src/lib/googleSession';

test('reject private, loopback, mapped, link-local and reserved addresses', async () => {
  for (const ip of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.169.254', '0.0.0.0', '::1', '::ffff:127.0.0.1', 'fc00::1', 'fe80::1']) assert.equal(isPublicAddress(ip), false, ip);
  assert.equal(isPublicAddress('8.8.8.8'), true);
  await assert.rejects(publicFetch('http://127.0.0.1/'));
  await assert.rejects(publicFetch('file:///etc/passwd'));
});
test('sessions reject forgery and preserve signed identity', async () => {
  process.env.AUTH_SECRET = 'test-only-secret-with-at-least-32-characters';
  const user = { userId: 'google_test', email: 'test@gmail.com', name: 'Test', picture: '', inviteEmail: 'test@gmail.com' };
  const token = await signSession(user);
  assert.deepEqual(await readSession(token), user);
  const parts = token.split('.');
  parts[1] = Buffer.from(JSON.stringify({ userId: 'google_attacker' })).toString('base64url');
  assert.equal(await readSession(parts.join('.')), null);
  assert.equal(await readSession('invalid'), null);
});
test('list ownership, invite revocation, privacy and content isolation', async () => {
  const old = process.cwd();
  const dir = mkdtempSync(path.join(tmpdir(), 'readwatch-access-'));
  process.chdir(dir);
  try {
    const { serverStorage: storage, listRole } = await import('../src/lib/serverStorage');
    await storage.setUserContent('owner', [{ id: 'owned', title: 'Owned' }]);
    await storage.setUserContent('other', [{ id: 'private', title: 'Private' }]);
    const list = await storage.createReadingList({ name: 'Private', description: '', ownerId: 'owner', isPublic: false, isCollaborative: true, collaborators: [], collaboratorEmails: ['invited@gmail.com'], contentIds: [] });
    assert.equal(await storage.updateReadingList(list.id, { isPublic: true }, 'other'), false);
    assert.equal(await storage.addToReadingList(list.id, 'private', 'other'), 'forbidden');
    assert.equal(await storage.addToReadingList(list.id, 'private', 'owner'), 'forbidden');
    assert.equal(await storage.addToReadingList(list.id, 'owned', 'owner'), 'added');
    assert.equal(await storage.addToReadingList(list.id, 'owned', 'owner'), 'exists');
    assert.equal(await storage.removeFromReadingList(list.id, 'owned', 'other'), false);
    assert.deepEqual(await storage.getListContents(list.id, 'other'), []);
    assert.equal((await storage.getListContents(list.id, 'other', 'invited@gmail.com')).length, 1);
    assert.equal((await storage.getUserLists('other', 'invited@gmail.com'))[0].collaboratorEmails?.length, 0);
    assert.equal(await storage.addToReadingList(list.id, 'private', 'other', 'invited@gmail.com'), 'added');
    await storage.updateReadingList(list.id, { collaboratorEmails: [] }, 'owner');
    assert.equal(listRole(await storage.getReadingList(list.id), 'other', 'invited@gmail.com'), null);
    assert.equal(await storage.deleteReadingList(list.id, 'other'), false);
    assert.equal(await storage.deleteReadingList(list.id, 'owner'), true);
  } finally { process.chdir(old); rmSync(dir, { recursive: true, force: true }); }
});
