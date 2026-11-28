'use client';
import { useState } from 'react';
export function ShareList({ list, onSaved }: { list: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [publicView, setPublicView] = useState(!!list.isPublic);
  const [collaborative, setCollaborative] = useState(!!list.isCollaborative);
  const [emails, setEmails] = useState<string>((list.collaboratorEmails || []).join(', '));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return <><button type="button" className="btn" onClick={() => setOpen(!open)}>Share</button>{open && <section aria-label={`Share ${list.name}`} style={{ padding: 12, border: '1px solid var(--line)' }}>
    <p>Anyone with the link can read a public list. Invited Google accounts can edit when collaboration is enabled.</p>
    <label><input type="checkbox" checked={publicView} onChange={e => setPublicView(e.target.checked)} /> Public list</label><br />
    <label><input type="checkbox" checked={collaborative} onChange={e => setCollaborative(e.target.checked)} /> Allow invited people to add and remove items</label><br />
    <label>Invited emails<input aria-label="Invited emails" value={emails} onChange={e => setEmails(e.target.value)} placeholder="friend@gmail.com, colleague@company.com" /></label>
    <p>Share this link yourself; no email is sent. Invitations support Gmail and Google Workspace accounts.</p>
    <button className="btn" disabled={busy} onClick={async () => { setBusy(true); setMessage(''); try {
      const response = await fetch(`/api/lists/${list.id}/share`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isPublic: publicView, isCollaborative: collaborative, collaboratorEmails: emails.split(',').map(s => s.trim()).filter(Boolean) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage('Sharing saved.'); onSaved();
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not save'); } finally { setBusy(false); } }}>Save sharing</button>
    <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(`${location.origin}/lists/${list.id}`); setMessage('Link copied.'); } catch { setMessage(`${location.origin}/lists/${list.id}`); } }}>Copy link</button>
    <button className="btn" onClick={() => setOpen(false)}>Close</button><p role="status">{message}</p>
  </section>}</>;
}
