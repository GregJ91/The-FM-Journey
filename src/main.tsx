import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { loadBadges } from './ui/badges';

loadBadges();

// Portrait only. Ask the browser to lock portrait (works in the installed app and full screen); if the phone is
// still sideways, a "turn your phone" screen covers the game (styles.css).
const lockPortrait = () => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.('portrait').catch(() => {});
lockPortrait();
window.addEventListener('pointerdown', lockPortrait, { once: true });
const hint = document.createElement('div');
hint.className = 'rotate-hint';
hint.innerHTML = '<div class="phone-ico"></div><h2>Turn your phone upright</h2><p>The FM Journey plays in portrait.</p><button class="btn primary" type="button">Switch to portrait</button>';
hint.querySelector('button')!.addEventListener('click', lockPortrait);
document.body.appendChild(hint);

// Offline support once installed to the home screen (production builds only)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
