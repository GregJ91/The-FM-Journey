import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { loadBadges } from './ui/badges';

loadBadges();

// Portrait only: where the browser allows it (installed app), lock the screen; otherwise styles.css turns the
// portrait screen with the phone, using the screen angle to know which way it was turned.
function trackRotation() {
  const legacy = (window as Window & { orientation?: number }).orientation;
  const angle = ((screen.orientation?.angle ?? legacy ?? 0) + 360) % 360;
  document.documentElement.dataset.rot = String(angle);
}
trackRotation();
screen.orientation?.addEventListener?.('change', trackRotation);
window.addEventListener('orientationchange', trackRotation);
(screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.('portrait').catch(() => {});

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
