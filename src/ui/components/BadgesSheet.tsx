import { useRef, useState } from 'react';
import { LEAGUE_DEFS } from '../../game/data/leagues';
import { getGame } from '../../store';
import { badgeCount, badgeFor, clearBadges, importBadgeFiles, removeBadge, setBadge, useBadgesVersion, type ClubRef } from '../badges';
import { useUI } from '../context';
import { Sheet } from './common';
import type { Club } from '../../game/types';

function allClubs(): ClubRef[] {
  const g = getGame();
  if (g) return Object.values(g.clubs).map((c) => ({ name: c.name, short: c.short }));
  return LEAGUE_DEFS.flatMap((l) => l.clubs.map((line) => {
    const [name, short] = line.split('|');
    return { name, short };
  }));
}

/** Import a logo pack: pick many image files, matched to clubs by file name. */
export function BadgesSheet({ onClose }: { onClose: () => void }) {
  useBadgesVersion();
  const ui = useUI();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ matched: string[]; unmatched: string[] } | null>(null);
  const clubs = allClubs();
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const r = await importBadgeFiles([...files], clubs);
    setBusy(false);
    setResult(r);
    ui.toast(`${r.matched.length} badge${r.matched.length === 1 ? '' : 's'} added`);
  };
  return (
    <Sheet title="Club badges" onClose={onClose}>
      <div className="sheet-b col">
        <div className="help">
          Real club badges are trademarks, so the game can't include them. Like Football Manager logo packs, you can add your own:
          <br />1. Save badge images (PNG, JPG, SVG or WebP) named after each club, e.g. <b>Arsenal.png</b>, <b>manchester-united.png</b>, <b>Real Madrid.svg</b>.
          <br />2. Tap <b>Import badges</b> and select all of them at once.
          <br />They're matched to clubs automatically and stored on this device only.
        </div>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
        <button className="btn primary block" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Importing…' : '🛡️ Import badges'}</button>
        <div className="small bold muted">{badgeCount()} of {clubs.length} clubs have a badge.</div>
        {result && (
          <div className="card flat" style={{ marginBottom: 0 }}>
            <div className="bold">✅ Matched {result.matched.length}</div>
            {result.matched.length > 0 && <div className="small muted">{result.matched.slice(0, 30).join(', ')}{result.matched.length > 30 ? '…' : ''}</div>}
            {result.unmatched.length > 0 && (
              <>
                <div className="bold" style={{ marginTop: 8 }}>⚠️ Not matched {result.unmatched.length}</div>
                <div className="small muted">{result.unmatched.slice(0, 30).join(', ')}{result.unmatched.length > 30 ? '…' : ''}</div>
                <div className="small muted" style={{ marginTop: 4 }}>Rename these to the club's name as shown in the game, or set them one at a time from a club's page.</div>
              </>
            )}
          </div>
        )}
        {badgeCount() > 0 && <button className="btn coral block" onClick={() => { if (confirm('Remove all imported badges?')) clearBadges(); }}>Remove all badges</button>}
      </div>
    </Sheet>
  );
}

/** Per-club badge controls (used on a club's page). */
export function ClubBadgeButton({ club }: { club: Club }) {
  useBadgesVersion();
  const input = useRef<HTMLInputElement>(null);
  const ui = useUI();
  const has = !!badgeFor(club.name);
  return (
    <>
      <input ref={input} type="file" accept="image/*" hidden onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        try { await setBadge(club.name, f); ui.toast(`Badge set for ${club.name}`); } catch { ui.toast('That file is not an image', true); }
      }} />
      <div className="row">
        <button className="btn sm" onClick={() => input.current?.click()}>🛡️ {has ? 'Change badge' : 'Set badge'}</button>
        {has && <button className="btn sm" onClick={() => removeBadge(club.name)}>Use generated crest</button>}
      </div>
    </>
  );
}
