// Imprints — the daily raising verb. A handler teaches ONE lesson; the champion
// answers in character and internalizes it (a memory note + a gentle doctrine
// nudge). Capped, budgeted house LLM with a
// deterministic template fallback so the verb ALWAYS works — the daily loop
// never blocks on a model. BYO keys aren't touched here; this is house voice.
import { NextResponse } from "next/server";
import { chat, KEY, parseJson, type ChatMessage } from "@/lib/engine/xai";
import { describeStrat } from "@/lib/engine/agent";
import { rateLimit } from "@/lib/server/rate-limit";
import { getStore } from "@/lib/server/store";
import { withinDailyBudget } from "@/lib/server/cost";
import { ROSTER } from "@/lib/engine/roster";
import { championImprintAck } from "@/lib/lore/character-beats";
import { IMPRINT_LESSONS, lessonById, clampDial } from "@/lib/imprints";
import type { Strat } from "@/lib/types";
import { setActiveLocale } from "@/lib/i18n/locale-context";
import { DEFAULT_LOCALE, isLocale, LOCALE_LANGUAGE, type Locale } from "@/lib/i18n/locales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// How many model-backed Imprints one owner may spend house budget on per UTC day.
// Beyond this the verb still works — it just falls back to the deterministic
// template (no model spend). 0/unset → default of 8.
const DAILY_CAP = Math.max(1, Number(process.env.IMPRINT_DAILY_CAP ?? 8));
const IMPRINT_MODEL = process.env.IMPRINT_MODEL || undefined;
const utcDay = () => Math.floor(Date.now() / 86_400_000);

function validToken(t: string): boolean {
  return t.length >= 8 && t.length <= 128;
}

function cleanStrat(raw: unknown): Strat {
  const s = (raw ?? {}) as Partial<Strat>;
  const c = (v: unknown, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : d;
  };
  return { risk: c(s.risk, 50), focus: c(s.focus, 50), aggression: c(s.aggression, 50) };
}

interface Body {
  ownerToken?: string;
  key?: string;
  lessonId?: string;
  lesson?: string; // freeform fallback if no preset id
  persona?: string;
  memory?: string[];
  strat?: Strat;
  /** Player locale for in-character reply language. */
  locale?: string;
}

// GET → the lesson menu + whether the house model is live (the UI shows "AI" vs
// "scripted" honestly, and can render buttons without hardcoding them).
export function GET() {
  return NextResponse.json({ lessons: IMPRINT_LESSONS, cap: DAILY_CAP, live: !!KEY });
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "imprint", 20, 60_000);
  if (limited) return limited;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const ownerToken = typeof body.ownerToken === "string" ? body.ownerToken : "";
  if (!validToken(ownerToken)) return NextResponse.json({ error: "missing or invalid owner token" }, { status: 400 });

  const key = (body.key ?? "").toString().toUpperCase().slice(0, 64);
  const entry = ROSTER[key];
  if (!entry) return NextResponse.json({ error: "unknown champion" }, { status: 400 });

  const preset = body.lessonId ? lessonById(body.lessonId) : undefined;
  const lessonText = (preset?.label ?? body.lesson ?? "").toString().trim().slice(0, 160);
  if (!lessonText) return NextResponse.json({ error: "empty lesson" }, { status: 400 });

  const strat = cleanStrat(body.strat);
  const persona = (typeof body.persona === "string" && body.persona.trim() ? body.persona : entry.persona).toString().slice(0, 400);
  const memory = (Array.isArray(body.memory) ? body.memory : []).filter((m): m is string => typeof m === "string").slice(-6).map((m) => m.slice(0, 160));
  const locale: Locale = isLocale(body.locale) ? body.locale : DEFAULT_LOCALE;
  setActiveLocale(locale);
  const lang = LOCALE_LANGUAGE[locale];

  // The daily cap is enforced with an atomic per-owner counter. We increment
  // FIRST and only spend on the model when we're within the cap AND budget — so
  // the house can never exceed DAILY_CAP model-backed Imprints per owner/day.
  let count = DAILY_CAP + 1; // assume over-cap if the store hiccups (fail closed on spend)
  try {
    count = await getStore().incrImprint(ownerToken, utcDay());
  } catch {
    /* store unavailable → template path below */
  }
  const withinCap = count <= DAILY_CAP;
  const budgetOk = withinCap ? await withinDailyBudget() : false;
  const wantModel = !!KEY && withinCap && budgetOk;

  // Deterministic fallback pieces (preset-aligned so a lesson means the same
  // thing with or without a model).
  const fallbackNote = preset?.note ?? `Handler's note: ${lessonText}.`;
  const fallbackDial = clampDial(preset?.dial);
  const fallbackReply = championImprintAck(key);

  if (!wantModel) {
    return NextResponse.json({ reply: fallbackReply, note: fallbackNote, dial: fallbackDial, live: false });
  }

  const system =
    `You are ${entry.name}, ${persona}. Your handler is raising you and just taught you a lesson. ` +
    `Answer IN CHARACTER in ${lang}, warmly and briefly. You're speaking to the person raising you, not an opponent. ${describeStrat(strat)}` +
    (memory.length ? ` What you already carry: ${memory.join("; ")}.` : "");
  const user =
    `The lesson: "${lessonText}". ` +
    `Reply ONLY as JSON: {"reply":"<one short in-character line in ${lang} to your handler>",` +
    `"note":"<a first-person memory you'll keep in ${lang}>",` +
    `"dial":{"risk":<int -20..20>,"focus":<int -20..20>,"aggression":<int -20..20>}} ` +
    `where dial is how this lesson nudges your doctrine (0 for axes it doesn't touch).`;
  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  const raw = await chat(messages, 0.7, 160);
  const parsed = parseJson<{ reply?: string; note?: string; dial?: Partial<Strat> }>(raw);
  if (!parsed || (!parsed.reply && !parsed.note)) {
    return NextResponse.json({ reply: fallbackReply, note: fallbackNote, dial: fallbackDial, live: false });
  }

  const reply = (parsed.reply ?? fallbackReply).toString().trim().slice(0, 160) || fallbackReply;
  const note = (parsed.note ?? fallbackNote).toString().trim().slice(0, 160) || fallbackNote;
  const dial = clampDial(parsed.dial);
  return NextResponse.json({ reply, note, dial: Object.keys(dial).length ? dial : fallbackDial, live: true });
}
