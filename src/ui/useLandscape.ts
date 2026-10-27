import { useEffect, useState } from 'react';

/** Wide screens (a phone held sideways, a tablet or a desktop) get the landscape layout. */
export const LANDSCAPE_QUERY = '(orientation: landscape) and (min-width: 640px)';

export function useLandscape() {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(LANDSCAPE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(LANDSCAPE_QUERY);
    const f = () => setOn(mq.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);
  return on;
}
