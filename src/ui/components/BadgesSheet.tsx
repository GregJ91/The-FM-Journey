import { useMemo, useRef, useState } from 'react';
import { LEAGUE_DEFS } from '../../game/data/leagues';
import type { Club } from '../../game/types';
import { getGame } from '../../store';
import { assignFromTray, badgeCount, badgeFor, clearBadges, clearTray, discardTray, importBadgeFiles, removeBadge, setBadge, slug, trayItems, useBadgesVersion } from '../badges';
import { useUI } from '../context';
import { Sheet } from './common';

interface ClubOpt {
  name: string;
  short: string;
  league: string;
}

function allClubs(): ClubOpt[] {
  const g = getGame();
  if (g) {
    const mine = g.leagues.find((l) => l.clubIds.includes(g.userClubId))?.id;
    const out = g.leagues.flatMap((l) => l.clubIds.map((id) => ({ name: g.clubs[id].name, short: g.clubs[id].short, league: l.name, mineFirst: l.id === mine ? 0 : 1 })));
    return out.sort((a, b) => a.mineFirst - b.mineFirst).map(({ name, short, league }) => ({ name, short, league }));
  }
  return LEAGUE_DEFS.flatMap((l) => l.clubs.map((line) => {
    const [name, short] = line.split('|');
    return { name, short, league: l.name };
  }));
}

/** Import a logo pack: name-matched files are applied, the rest can be matched by tapping a club. */
export function BadgesSheet({ onClose }: { onClose: () => void }) {
  useBadgesVersion();
  const ui = useUI();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [matching, setMatching] = useState(false);
  const [result, setResult] = useState<{ matched: string[]; unmatched: string[]; skipped: string[] } | null>(null);
  const clubs = useMemo(allClubs, []);
  const tray = trayItems();

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const r = await importBadgeFiles([...files], clubs);
    setBusy(false);
    setResult(r);
    ui.toast(`${r.matched.length} matched by name${r.unmatched.length ? `, ${r.unmatched.length} to match by hand` : ''}`);
    if (r.unmatched.length && !r.matched.length) setMatching(true);
  };

  if (matching && tray.length) return <Matcher clubs={clubs} onClose={() => setMatching(false)} />;

  return (
    <Sheet title="Club badges" onClose={onClose}>
      <div className="sheet-b col">
        <div className="help">
          Real club badges are trademarks, so they aren't built in. Add your own:
          <br />• <b>Named files</b> (<b>Arsenal.png</b>, <b>Man Utd.png</b>, <b>FC Barcelona.svg</b>…) are matched automatically.
          <br />• <b>FM logo packs</b> (e.g. sortitoutsi's) name files by FM's club ID, like <b>1234.png</b>, so the game can't tell which club each one is. Pick the ones you want (your phone's picker shows thumbnails), then tap the right club for each.
          <br />Images are stored on this device only.
        </div>
        <input ref={input} type="file" accept="image/*,.png,.jpg,.jpeg,.svg,.webp" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
        <button className="btn primary block" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Importing…' : '🛡️ Import badge images'}</button>
        {tray.length > 0 && <button className="btn yellow block" onClick={() => setMatching(true)}>👆 Match {tray.length} badge{tray.length === 1 ? '' : 's'} to clubs</button>}
        <div className="small bold muted">{badgeCount()} of {clubs.length} clubs have a badge.</div>
        {result && (
          <div className="card flat" style={{ marginBottom: 0 }}>
            <div className="bold">✅ Matched by name: {result.matched.length}</div>
            {result.matched.length > 0 && <div className="small muted">{result.matched.slice(0, 24).join(', ')}{result.matched.length > 24 ? '…' : ''}</div>}
            {result.unmatched.length > 0 && <div className="bold" style={{ marginTop: 6 }}>👆 Waiting to be matched: {result.unmatched.length}</div>}
            {result.skipped.length > 0 && <div className="small muted" style={{ marginTop: 6 }}>Skipped {result.skipped.length} file(s) that weren't usable images.</div>}
          </div>
        )}
        {badgeCount() > 0 && <button className="btn coral block" onClick={() => { if (confirm('Remove all imported badges?')) clearBadges(); }}>Remove all badges</button>}
      </div>
    </Sheet>
  );
}

/** One unmatched image at a time: tap the club it belongs to. */
function Matcher({ clubs, onClose }: { clubs: ClubOpt[]; onClose: () => void }) {
  useBadgesVersion();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const tray = trayItems();
  const item = tray[Math.min(idx, tray.length - 1)];
  // every typed word must start a word of the club name ("man city" → Manchester City)
  const words = slug(q).split('-').filter(Boolean);
  const list = clubs.filter((c) => {
    if (!words.length) return true;
    const nameWords = slug(c.name).split('-');
    return slug(c.short) === words.join('-') || words.every((w) => nameWords.some((n) => n.startsWith(w)));
  }).slice(0, 60);
  if (!item) return null;
  const next = () => { setQ(''); setIdx((i) => (i + 1 < tray.length ? i + 1 : 0)); };
  return (
    <Sheet title={`Match badges · ${tray.length} left`} onClose={onClose}>
      <div className="sheet-b col">
        <div className="row" style={{ alignItems: 'center' }}>
          <img src={item.data} width={96} height={96} alt={item.file} style={{ background: 'var(--paper)', border: '2px solid var(--ink)', borderRadius: 14, padding: 6, flex: 'none' }} />
          <div style={{ minWidth: 0 }}>
            <div className="bold ellipsis">{item.file}</div>
            <div className="small muted">Which club is this?</div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn sm" onClick={next}>Skip</button>
              <button className="btn sm" onClick={() => discardTray(item.id)}>Discard</button>
            </div>
          </div>
        </div>
        <input className="input" placeholder="Search club…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="list">
          {list.map((c) => (
            <div key={c.name} className="li" onClick={() => { assignFromTray(item.id, c.name); setQ(''); }}>
              <div className="main">
                <div className="t">{c.name}</div>
                <div className="s">{c.league}{badgeFor(c.name) ? ' · has a badge (will replace)' : ''}</div>
              </div>
              <span className="muted">›</span>
            </div>
          ))}
          {!list.length && <div className="empty">No club matches "{q}".</div>}
        </div>
        <button className="btn block" onClick={() => { if (confirm('Discard all unmatched images?')) { clearTray(); onClose(); } }}>Discard all unmatched</button>
      </div>
    </Sheet>
  );
}

/** Per-club badge controls (used on a club's page and the Board). */
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
