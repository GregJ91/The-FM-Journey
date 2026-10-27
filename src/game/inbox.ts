import type { GameState, Message } from './types';

export function sendMessage(g: GameState, m: Omit<Message, 'id' | 'date' | 'read'>) {
  g.inbox.unshift({ ...m, id: g.nextId++, date: g.date, read: false });
  if (g.inbox.length > 200) g.inbox.length = 200;
}

/** Unread messages that should stop Continue (routine reports are quiet). */
export function unreadImportant(g: GameState) {
  return g.inbox.filter((m) => !m.read && !m.quiet).length;
}

export function unreadCount(g: GameState) {
  return g.inbox.filter((m) => !m.read).length;
}
