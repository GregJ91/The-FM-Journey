import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

// No-scroll panels: a Fit body takes whatever height its panel gives it. If the content doesn't fit, the
// longest list or table inside is split into pages that do fit, with ‹ › buttons, instead of scrolling.

const ROW_PARENTS = 'tbody, .list, .feed, .pane-list, .inbox-rows';

const PAGER_H = 34;

/** Top of an element in layout space (unaffected by CSS transforms such as the sideways-phone portrait lock). */
function layoutTop(el: HTMLElement) {
  let y = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
  return y;
}

/** Page breaks for the rows of `box` so that each page fits the panel (`fit` is the whole Fit, pager included). */
function measure(fit: HTMLElement, body: HTMLElement, box: HTMLElement): number[] {
  const rows = Array.from(box.children).filter((el) => el.tagName !== 'STYLE') as HTMLElement[];
  if (rows.length < 2) return [0];
  const total = fit.clientHeight;
  if (body.scrollHeight <= total + 1) return [0];
  const avail = total - PAGER_H;
  const top = layoutTop(body);
  const lastRow = rows[rows.length - 1];
  const first = layoutTop(rows[0]) - top;
  const last = layoutTop(lastRow) + lastRow.offsetHeight - top;
  // Room for rows = what's left after everything that isn't a row (headings, notes under the list)
  const other = body.scrollHeight - (last - first);
  const room = Math.max(rows[0].offsetHeight, avail - other);
  const starts = [0];
  let used = 0;
  rows.forEach((r, i) => {
    const h = r.offsetHeight;
    if (used + h > room && used > 0) { starts.push(i); used = 0; }
    used += h;
  });
  return starts;
}

export function Fit({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const id = 'fit' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const [starts, setStarts] = useState<number[]>([0]);
  const [page, setPage] = useState(0);
  const [tick, setTick] = useState(0);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    // The biggest list/table inside this panel gets paged
    const boxes = Array.from(body.querySelectorAll(ROW_PARENTS)) as HTMLElement[];
    const box = boxes.sort((a, b) => b.children.length - a.children.length)[0];
    body.querySelectorAll('[data-fit]').forEach((el) => { if (el !== box) el.removeAttribute('data-fit'); });
    const inner = innerRef.current!;
    if (!box) {
      // Nothing to page: shrink the panel's content a little so it fits rather than being cut off
      if (starts.length !== 1) setStarts([0]);
      inner.style.zoom = '1';
      const natural = inner.scrollHeight;
      inner.style.zoom = String(zoom);
      const z = natural > body.clientHeight + 1 ? Math.max(0.5, Math.floor((body.clientHeight / natural) * 100) / 100) : 1;
      if (Math.abs(z - zoom) > 0.005) setZoom(z);
      return;
    }
    if (zoom !== 1) setZoom(1);
    box.setAttribute('data-fit', id);
    body.classList.add('fit-measuring');
    const next = measure(body.parentElement!, body, box);
    body.classList.remove('fit-measuring');
    if (next.join() !== starts.join()) setStarts(next);
  });

  // Re-measure when the panel is resized or its content changes
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    let raf = 0;
    const again = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setTick((t) => t + 1)); };
    const ro = new ResizeObserver(again);
    ro.observe(body);
    const mo = new MutationObserver(again);
    mo.observe(body, { childList: true, subtree: true, characterData: true });
    return () => { ro.disconnect(); mo.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  void tick;

  const pages = starts.length;
  const p = Math.min(page, pages - 1);
  const from = starts[p];
  const to = p + 1 < pages ? starts[p + 1] : Infinity;
  const sel = `#${id}:not(.fit-measuring) [data-fit="${id}"] > *`;
  const css = pages > 1
    ? `${sel}:nth-child(-n+${from}){display:none!important}${Number.isFinite(to) ? `${sel}:nth-child(n+${to + 1}){display:none!important}` : ''}`
    : '';
  return (
    <div className={`fit ${className}`} style={style}>
      {css && <style>{css}</style>}
      <div className="fit-b" id={id} ref={bodyRef}><div className="fit-z" ref={innerRef} style={zoom !== 1 ? { zoom } : undefined}>{children}</div></div>
      {pages > 1 && (
        <div className="fit-pager">
          <button className="btn sm" disabled={p === 0} onClick={() => setPage(p - 1)}>‹</button>
          <span>{p + 1} / {pages}</span>
          <button className="btn sm" disabled={p === pages - 1} onClick={() => setPage(p + 1)}>›</button>
        </div>
      )}
    </div>
  );
}
