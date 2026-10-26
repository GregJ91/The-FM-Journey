import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type Screen = 'home' | 'squad' | 'youth' | 'training' | 'transfers' | 'board' | 'competitions' | 'inbox' | 'club';

interface UIState {
  screen: Screen;
  go: (s: Screen, param?: number | string) => void;
  param: number | string | undefined;
  playerId: number | null;
  openPlayer: (id: number | null) => void;
  toast: (msg: string, bad?: boolean) => void;
  matchOpen: boolean;
  setMatchOpen: (v: boolean) => void;
}

const Ctx = createContext<UIState | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>('home');
  const [param, setParam] = useState<number | string | undefined>();
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [toasts, setToasts] = useState<{ id: number; msg: string; bad?: boolean }[]>([]);
  const [matchOpen, setMatchOpen] = useState(false);
  const go = useCallback((s: Screen, p?: number | string) => {
    setScreen(s);
    setParam(p);
    setPlayerId(null);
    document.querySelector('.content')?.scrollTo({ top: 0 });
  }, []);
  const toast = useCallback((msg: string, bad?: boolean) => {
    if (!msg) return;
    const id = Math.random();
    setToasts((t) => [...t.slice(-3), { id, msg, bad }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <Ctx.Provider value={{ screen, go, param, playerId, openPlayer: setPlayerId, toast, matchOpen, setMatchOpen }}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.bad ? 'bad' : ''}`}>{t.msg}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useUI() {
  const c = useContext(Ctx);
  if (!c) throw new Error('UIProvider missing');
  return c;
}
