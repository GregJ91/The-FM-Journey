const DAY = 86400000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function toDate(iso: string) {
  return new Date(iso + 'T00:00:00Z');
}

export function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, n: number) {
  return iso(new Date(toDate(date).getTime() + n * DAY));
}

export function diffDays(a: string, b: string) {
  return Math.round((toDate(a).getTime() - toDate(b).getTime()) / DAY);
}

export function weekday(date: string) {
  return toDate(date).getUTCDay();
}

export function month(date: string) {
  return toDate(date).getUTCMonth() + 1;
}

export function dayOfMonth(date: string) {
  return toDate(date).getUTCDate();
}

export function year(date: string) {
  return toDate(date).getUTCFullYear();
}

export function fmtDate(date: string, withDay = true) {
  const d = toDate(date);
  const s = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return withDay ? `${DAYS[d.getUTCDay()]} ${s}` : s;
}

export function fmtShort(date: string) {
  const d = toDate(date);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function monthName(m: number) {
  return MONTHS[m - 1];
}

export function ageOn(dob: string, date: string) {
  const b = toDate(dob);
  const d = toDate(date);
  let a = d.getUTCFullYear() - b.getUTCFullYear();
  if (d.getUTCMonth() < b.getUTCMonth() || (d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() < b.getUTCDate())) a--;
  return a;
}

/** Nearest date on/after `date` that falls on weekday `wd` */
export function nextWeekday(date: string, wd: number) {
  const cur = weekday(date);
  return addDays(date, (wd - cur + 7) % 7);
}

export function inTransferWindow(date: string) {
  const m = month(date);
  return m === 7 || m === 8 || m === 1;
}
