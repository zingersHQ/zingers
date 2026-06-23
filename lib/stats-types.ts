// Shared analytics shapes — imported by both the server tracker (lib/server/track.ts)
// and the client dashboard, so neither side re-declares them. No "server-only"
// here on purpose: this file is pure types.

export interface DayStat {
  day: number; // UTC day number (ms / 86_400_000)
  date: string; // YYYY-MM-DD (UTC)
  events: Record<string, number>;
  dau: number;
}

export interface Analytics {
  shared: boolean; // false = in-memory store (not shared across instances)
  generatedAt: number;
  windowDays: number;
  today: Record<string, number>;
  totals: Record<string, number>; // summed across the window
  series: DayStat[]; // oldest → newest
  active: { dau: number; wau: number; mau: number };
  funnel: { label: string; key: string; value: number }[];
}
