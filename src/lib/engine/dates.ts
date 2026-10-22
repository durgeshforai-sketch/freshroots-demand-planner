// Date helpers on YYYY-MM-DD strings, all in UTC to avoid timezone drift.

export const parseDay = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00Z`);
export const fmtDay = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(s: string, n: number): string {
  const d = parseDay(s);
  d.setUTCDate(d.getUTCDate() + n);
  return fmtDay(d);
}

/** Monday of the week containing `s`. */
export function weekStartOf(s: string): string {
  const d = parseDay(s);
  return addDays(s, -((d.getUTCDay() + 6) % 7));
}

/** Monday of the latest complete Mon–Sun week strictly before `runDate`. */
export function latestCompleteWeekStart(runDate: string): string {
  return addDays(weekStartOf(runDate), -7);
}

/** Inclusive date-range overlap. */
export const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  aStart <= bEnd && bStart <= aEnd;
