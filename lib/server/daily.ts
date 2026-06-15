// The Daily Zinger — one marquee bout the whole world shares each day. Everything
// is derived deterministically from the UTC date, so every player gets the SAME
// matchup, topic and RNG seed. Run with mock=1 (the house banter bank), the
// streamed bout is byte-identical for everyone — which is what makes a Wordle-
// style "did you call it?" share grid honest.
import "server-only";
import { ROSTER, TOPICS } from "@/lib/engine/roster";
import { makeRng } from "@/lib/engine/xai";

const EPOCH_UTC = Date.UTC(2024, 0, 1); // Daily #1 baseline
const DAY_MS = 86_400_000;

export interface DailyPlan {
  day: number; // 1-indexed puzzle number
  date: string; // YYYY-MM-DD (UTC)
  aKey: string;
  bKey: string;
  topic: string;
  seed: number; // the bout RNG seed — same for everyone
}

export function dailyPlan(now: Date = new Date()): DailyPlan {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const day = Math.max(1, Math.floor((today - EPOCH_UTC) / DAY_MS) + 1);
  // a stable, well-mixed seed per day so the matchup feels varied day to day
  const rng = makeRng((day * 2654435761) >>> 0);
  const keys = Object.keys(ROSTER);
  const aKey = rng.choice(keys);
  let bKey = rng.choice(keys);
  for (let g = 0; bKey === aKey && g < 20; g++) bKey = rng.choice(keys);
  const topic = rng.choice(TOPICS);
  const seed = 1 + Math.floor(rng.random() * 2_000_000_000);
  return { day, date: new Date(today).toISOString().slice(0, 10), aKey, bKey, topic, seed };
}
