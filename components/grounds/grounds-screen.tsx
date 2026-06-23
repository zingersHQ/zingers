"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Crown, Globe, Mountain, Swords, Moon, Ban, X, Swords as FightIcon, ArrowUpRight, ArrowUp, Check, Gem, Flame, Scale } from "lucide-react";
import type { AgentConfig, BattleEnd, Champion, CreatureType, Recipe, RosterEntry, Style, TowerAgent, WarState } from "@/lib/types";
import { TYPE_COLOR, levelFor, tierFor, doctrine, blankStyle, accrue, dominant, skillLevel, skillCount, blank } from "@/lib/evolve/progression";
import { ratingOf } from "@/lib/evolve/elo";
import { sideParams } from "@/lib/recipe-params";
import { appearanceOf } from "@/lib/evolve/appearance";
import { useChampions, TRAIN_COST, FRAGMENT_BUY, FRAGMENT_SELL } from "@/store/champions";
import { GROUNDS_WIN_REWARD, HOME_WIN_BONUS } from "@/lib/economy";
import { useBout } from "@/components/arena/use-bout";
import { ChampionAvatar } from "@/components/champion-avatar";
import { FirstRun } from "@/components/intro/first-run";
import { STORAGE } from "@/lib/brand";
import { getOwnerToken, getHandle } from "@/lib/owner";
import { track } from "@/lib/track";
import type { GroundChampion, MatchView, NearTarget } from "@/components/grounds/world";
import { WORLDS, DEFAULT_WORLD, worldById, CONCORD_GATES, REGION_WORLDS } from "@/components/grounds/worlds";
import { worldGoals, type WorldGoal, type GoalKind } from "@/components/grounds/goals";
import { regionGrowth } from "@/lib/lore/growth";
import { currentSeason } from "@/lib/lore/season";
import { FOUNDING_REGIONS, FORCES as FORCE_LORE, wheelNeighbors } from "@/lib/lore/canon";
import { ForcesChain } from "@/components/lore/forces-wheel";
import { trainerLevel, forceMeta } from "@/lib/evolve/trainer";
import { daylightBiome } from "@/components/grounds/biomes";
import { useTheme } from "@/lib/theme";
import { landmarksOf, discoveryNodes, dayKey } from "@/components/grounds/landmarks";
import { Compass, type Pose } from "@/components/grounds/compass";
import { TrainerBadge } from "@/components/grounds/trainer-badge";
import { roundReward, gauntletQueue, tribunalDraw } from "@/lib/scenarios/registry";
import { GauntletBriefing, GauntletInterstitial, GauntletResult, type GauntletRun } from "@/components/grounds/gauntlet";
import { TribunalBriefing, TribunalMatchBanner } from "@/components/grounds/tribunal";
import { RenderBoundary, RenderNotice, gpuStatus } from "@/components/grounds/render-guard";
import { AmbientToggle } from "@/components/grounds/ambience";
import { ThemeToggle } from "@/components/theme-toggle";
import { setMood } from "@/lib/ambience-bus";
import { GuardianGame } from "@/components/guardian/game";
import { SeasonBanner } from "@/components/lore/season-banner";
import { GameDock } from "@/components/game-dock";
import { Celebration, Confetti, outcomeSfx } from "@/components/grounds/celebration";
import { ArrivalSequence } from "@/components/grounds/arrival";
import { ClanSheet } from "@/components/grounds/clan-sheet";
import { DailySheet } from "@/components/grounds/daily-sheet";
import { DOCK_H } from "@/lib/play-nav";

const World = dynamic(() => import("@/components/grounds/world"), {
  ssr: false,
  loading: () => (
    <div className="mono" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--muted)" }}>
      summoning the grounds…
    </div>
  ),
});

// Ladder agents reuse a roster creature key for moves/body — when you own that
// same creature, match visuals need the agent's unique ladder id so both sides
// don't collapse into one champion.
function ladderChampion(agent: TowerAgent): Champion {
  const c = blank();
  c.battles = agent.battles;
  c.wins = Math.round(agent.battles * 0.5);
  c.losses = agent.battles - c.wins;
  c.xp = agent.battles * 60;
  c.rating = agent.rating;
  return c;
}

function matchOpponentKey(creatureKey: string, ladderId: string | null): string {
  return ladderId ?? creatureKey;
}

function battleActorToMatchKey(actor: string, owned: string, creatureKey: string, ladderId: string | null): string {
  return actor === owned ? owned : matchOpponentKey(creatureKey, ladderId);
}

export default function GroundsScreen() {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [towerAgents, setTowerAgents] = useState<TowerAgent[]>([]);
  const [altitude, setAltitude] = useState(0);
  const [peakAltitude, setPeakAltitude] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [near, setNear] = useState<NearTarget>(null);
  const [overlay, setOverlay] = useState<"none" | "train" | "arena" | "result" | "gauntlet" | "tribunal" | "guardian" | "broker" | "daily">("none");
  const [opponent, setOpponent] = useState<string | null>(null);
  // ladder id of the opponent when challenging a specific perched agent — so the
  // hit lands on THAT champion. null = a central-arena pick → its house champion.
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [duelMeta, setDuelMeta] = useState<{ name: string; handle?: string } | null>(null);
  const [keeperLevel, setKeeperLevel] = useState<number | null>(null);
  const [matchView, setMatchView] = useState<MatchView | null>(null);
  const [betSide, setBetSide] = useState<"me" | "opp" | null>(null);
  const [betAmt, setBetAmt] = useState(50);
  const [result, setResult] = useState<{
    won: boolean;
    crowns: number;
    betWon: boolean | null;
    ladders: string[]; // the progression ladders this bout advanced, named
    ratingDelta: number;
    leveledTo: number | null;
    learned: string | null;
    globalDelta: number | null; // signed swing on the shared ladder (null if unranked)
    globalRating: number | null; // player's new ladder rating
    home: boolean; // win earned under your Clan's region (home advantage paid)
  } | null>(null);
  const [worldId, setWorldId] = useState(DEFAULT_WORLD.id);
  const world = useMemo(() => worldById(worldId), [worldId]);
  const theme = useTheme();
  // In light mode the 3D world drops into a daylight skin (same place, lit like
  // noon). Scene topology/layout is untouched, so landmarks + caches still align.
  const biome = useMemo(
    () => (theme === "light" ? daylightBiome(world.biome) : world.biome),
    [world.biome, theme],
  );
  const scenario = world.scenario;
  const isHub = world.kind === "hub";
  // The Amphitheatre: a spectator venue. Like the hub, it has no playable region
  // machinery (Tower / Keepers / training / caches / goals) — you go there to watch.
  const spectator = !!world.spectator;
  const [gRun, setGRun] = useState<GauntletRun | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  // mid-claim: a champion was picked but the arrival cinematic is still running,
  // so we hold off mounting the world UI until the veil lifts.
  const [claiming, setClaiming] = useState<string | null>(null);
  const [showChronicle, setShowChronicle] = useState(false);
  const [goalCoach, setGoalCoach] = useState(false);
  // The first-ranked-win Clan invite — deferred so the choice arrives when
  // "join a team" actually means something. Shown once.
  const [clanInvite, setClanInvite] = useState(false);
  const clanInviteSeen = useRef(false);
  const [isTouch, setIsTouch] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [worldMenu, setWorldMenu] = useState(false);
  const [gpu, setGpu] = useState<ReturnType<typeof gpuStatus> | null>(null);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [war, setWar] = useState<WarState | null>(null);
  const warLeader = war?.leader ?? null;

  // Fetch the live war standings + the Reader's OWN authoritative contribution
  // (`mine`, when a token is present). Called on mount and after every ranked
  // bout so the badge reflects what actually counted, not the optimistic mirror.
  const loadWar = useCallback(() => {
    const tok = getOwnerToken();
    fetch(`/api/war${tok ? `?token=${encodeURIComponent(tok)}` : ""}`)
      .then((r) => r.json())
      .then((d: WarState) => setWar(d))
      .catch(() => {});
  }, []);

  const store = useChampions();
  const { progress, getRecipe, owned, setOwned, crowns, fragments, nodes: nodeLedger } = store;
  const bout = useBout();

  // ── World growth: how built-up the current region is, blended from the live
  // season + your Reader rank (+ the Force war, once a server aggregate exists).
  const season = useMemo(() => currentSeason(), []);
  const readerLevel = useMemo(() => trainerLevel(store.trainerXp).level, [store.trainerXp]);
  const growth = useMemo(() => {
    if (!world.region) return null;
    const bias = FOUNDING_REGIONS.find((r) => r.id === world.region)?.bias ?? "LOGIC";
    return regionGrowth({
      regionId: world.region,
      regionBias: bias,
      seasonNumber: season.n,
      featuredRegionId: season.region.id,
      readerLevel,
      warLeader,
    });
  }, [world.region, season, readerLevel, warLeader]);
  // which region world is this season's spotlight — marked on the Concord gate
  const featuredWorld = useMemo(
    () => REGION_WORLDS.find((w) => w.region === season.region.id)?.id ?? null,
    [season],
  );

  // ── The Tribunal (scenario: "tribunal") ────────────────────────────────────
  // The case of the day: a deterministic proposition that becomes the bout's real
  // topic, so the flagship arena argues an assigned case instead of a random one.
  // Stable per region+day; the player's stance locks to the chosen respondent.
  const isTribunal = scenario.id === "tribunal";
  const tribunalSeed = useMemo(() => `${world.id}:s${season.n}:${dayKey()}`, [world.id, season]);
  const tribunalProp = useMemo(() => tribunalDraw(tribunalSeed, tribunalSeed).proposition, [tribunalSeed]);

  // ── World goals: the three standing objectives (peak/depth/secret) for this
  // region this season. Cleared goals (per-season ledger) drop off the map; the
  // compass still lists them so you can see what's left.
  const allGoals = useMemo<WorldGoal[]>(
    () => (isHub || spectator ? [] : worldGoals(biome, season.n, growth?.featured ?? false)),
    [isHub, spectator, biome, season, growth?.featured],
  );
  const doneGoals = useMemo(
    () => (store.goals.season === season.n ? store.goals.done : []),
    [store.goals, season],
  );
  const liveGoals = useMemo(
    () => allGoals.filter((g) => !doneGoals.includes(g.id)),
    [allGoals, doneGoals],
  );

  // ── exploration: districts (compass + fast-travel) and discovery caches ──────
  const landmarks = useMemo(() => landmarksOf(biome), [biome]);
  const allNodes = useMemo(() => discoveryNodes(biome, dayKey()), [biome]);
  const claimedToday = useMemo(
    () => (nodeLedger.day === dayKey() ? nodeLedger.claimed : []),
    [nodeLedger],
  );
  // the Concord is a built, neutral hub — no wild caches there
  const liveNodes = useMemo(
    () => (isHub || spectator ? [] : allNodes.filter((n) => !claimedToday.includes(n.id))),
    [isHub, spectator, allNodes, claimedToday],
  );
  const poseRef = useRef<Pose>({ x: 0, z: 34, heading: Math.PI });
  const travelRef = useRef<((x: number, z: number) => void) | null>(null);
  const onPose = useCallback((x: number, z: number, heading: number) => {
    poseRef.current = { x, z, heading };
  }, []);
  const [nodeFlash, setNodeFlash] = useState<{ crowns: number; fragments: number } | null>(null);
  const nodeFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [goalFlash, setGoalFlash] = useState<{ label: string; goalKind: GoalKind; crowns: number; fragments: number; trainerXp: number; seasonPoints: number } | null>(null);
  const goalFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pledgeFlash, setPledgeFlash] = useState<{ name: string; motto: string; color: string } | null>(null);
  const pledgeFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The Clan decision surface — opened by the Trainer chip or by walking under
  // a Concord clan flag (preselecting that Force).
  const [clanOpen, setClanOpen] = useState(false);
  const [clanPreselect, setClanPreselect] = useState<CreatureType | null>(null);
  const [clanPreview, setClanPreview] = useState<CreatureType | null>(null);
  const counters = useRef({ pa: 0, pb: 0, ha: 0, hb: 0 });
  const historyRef = useRef(bout.history);
  historyRef.current = bout.history;

  useEffect(() => {
    setMounted(true);
    setGpu(gpuStatus());
    track("explore"); // entered the 3D Grounds (behaviour analytics)
    if (typeof window !== "undefined" && (window.matchMedia?.("(pointer: coarse)").matches || "ontouchstart" in window || navigator.maxTouchPoints > 0)) {
      setIsTouch(true);
    }
    if (typeof window !== "undefined" && window.matchMedia) {
      const mq = window.matchMedia("(max-width: 640px)");
      const sync = () => setIsMobile(mq.matches);
      sync();
      mq.addEventListener("change", sync);
    }
    try {
      const seen = localStorage.getItem(STORAGE.intro) || localStorage.getItem(STORAGE.introLegacy);
      if (!seen) setShowIntro(true);
    } catch {}
    try {
      setShowChronicle(localStorage.getItem(STORAGE.chronicleDismissed) !== "1");
    } catch {
      setShowChronicle(true);
    }
    try {
      setGoalCoach(localStorage.getItem(STORAGE.goalCoach) !== "1");
    } catch {}
    try {
      clanInviteSeen.current = localStorage.getItem(STORAGE.clanInvite) === "1";
    } catch {}
  }, []);

  const dismissClanInvite = useCallback(() => {
    try {
      localStorage.setItem(STORAGE.clanInvite, "1");
    } catch {}
    clanInviteSeen.current = true;
    setClanInvite(false);
  }, []);

  const dismissChronicle = useCallback(() => {
    try {
      localStorage.setItem(STORAGE.chronicleDismissed, "1");
    } catch {}
    setShowChronicle(false);
  }, []);

  const dismissGoalCoach = useCallback(() => {
    try {
      localStorage.setItem(STORAGE.goalCoach, "1");
    } catch {}
    setGoalCoach(false);
  }, []);

  useEffect(() => {
    let live = true;
    setRosterError(null);
    fetch("/api/roster")
      .then((r) => {
        if (!r.ok) throw new Error(`roster ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (!live) return;
        if (!Array.isArray(d.creatures) || d.creatures.length === 0) throw new Error("empty roster");
        setRoster(d.creatures);
      })
      .catch((e) => {
        if (live) setRosterError(e instanceof Error ? e.message : "failed to load roster");
      });
    fetch("/api/grounds").then((r) => r.json()).then((d) => live && setTowerAgents(d.agents ?? [])).catch(() => {});
    loadWar();
    return () => {
      live = false;
    };
  }, [reloadKey, loadWar]);

  const closeIntro = useCallback(() => {
    try {
      localStorage.setItem(STORAGE.intro, "1");
    } catch {}
    setShowIntro(false);
  }, []);

  const onAltitude = useCallback((y: number) => {
    setAltitude(y);
    setPeakAltitude((p) => (y > p ? y : p));
  }, []);

  const byKey = useMemo(() => Object.fromEntries(roster.map((r) => [r.key, r])), [roster]);
  const champions: GroundChampion[] = useMemo(
    () => roster.map((r) => ({ key: r.key, type: r.type, name: r.name, champion: progress[r.key] || store.get(r.key) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roster, progress],
  );
  const matchBKey = matchOpponentKey(opponent ?? "", opponentId);
  const matchChampions = useMemo(() => {
    if (!opponentId) return champions;
    const agent = towerAgents.find((a) => a.id === opponentId);
    if (!agent) return champions;
    return [
      ...champions,
      { key: agent.id, type: agent.type, name: agent.name, champion: ladderChampion(agent) },
    ];
  }, [champions, opponentId, towerAgents]);

  const inMatch = bout.phase === "live";
  const controlsEnabled = overlay === "none" && !inMatch && !result && !gRun && !clanOpen;

  // Swap the soundscape into the tense battle loop whenever a fight is on — the
  // live arena/gauntlet bout or the Guardian face-off — and back to calm after.
  useEffect(() => {
    const inBattle = inMatch || overlay === "guardian";
    setMood(inBattle ? "battle" : "grounds");
  }, [inMatch, overlay]);

  // Behaviour analytics: opening the Daily Tribunal shrine.
  useEffect(() => {
    if (overlay === "daily") track("daily");
  }, [overlay]);

  // open the nearby interaction (shared by the E key and the on-screen prompt).
  // The central arena routes to the world's scenario; perched-agent challenges
  // are always a single duel regardless of world.
  const interact = useCallback(async () => {
    if (overlay !== "none" || inMatch || result || gRun) return;
    if (near?.kind === "train") setOverlay("train");
    else if (near?.kind === "broker") setOverlay("broker");
    else if (near?.kind === "keeper") {
      setKeeperLevel(near.level);
      setOverlay("guardian");
    } else if (near?.kind === "arena") {
      setOpponent(null);
      setOpponentId(null);
      setDuelMeta(null);
      setOverlay(scenario.id === "gauntlet" ? "gauntlet" : scenario.id === "tribunal" ? "tribunal" : "arena");
    } else if (near?.kind === "challenge") {
      setOpponent(near.key);
      setOpponentId(near.id);
      setDuelMeta({ name: near.name, handle: near.handle });
      setOverlay("arena");
    } else if (near?.kind === "node") {
      // optimistic flash on the local ledger gate; the crown credit settles via
      // the wallet inside claimNode (server-authoritative when online)
      if (await store.claimNode(near.id, { crowns: near.crowns, fragments: near.fragments })) {
        setNodeFlash({ crowns: near.crowns, fragments: near.fragments });
        if (nodeFlashTimer.current) clearTimeout(nodeFlashTimer.current);
        nodeFlashTimer.current = setTimeout(() => setNodeFlash(null), 2600);
      }
    } else if (near?.kind === "goal") {
      const reward = { crowns: near.crowns, fragments: near.fragments, trainerXp: near.trainerXp, seasonPoints: near.seasonPoints };
      if (await store.completeGoal(near.id, reward)) {
        setGoalFlash({ label: near.label, goalKind: near.goalKind, ...reward });
        setNear(null);
        if (goalFlashTimer.current) clearTimeout(goalFlashTimer.current);
        goalFlashTimer.current = setTimeout(() => setGoalFlash(null), 3200);
      }
    } else if (near?.kind === "force") {
      // Don't silently bind — open the Clan sheet preselected to this house so
      // the choice is explained and confirmed (and the season lock is enforced
      // in one place).
      setClanPreselect(near.type);
      setClanOpen(true);
    } else if (near?.kind === "venue") {
      // a Concord shrine. The Daily Tribunal opens its sheet; the Scrying Gallery
      // is watched in-world — the league fights on its dais — so nothing to open.
      if (near.venue === "daily") setOverlay("daily");
    } else if (near?.kind === "gate") {
      // step through a Vaultgate → travel to that region (the scene remounts via
      // its world key, so you land cleanly at the region's spawn)
      setNear(null);
      setWorldId(near.world);
    }
  }, [near, overlay, inMatch, result, gRun, scenario.id, store]);

  const fastTravel = useCallback((pos: [number, number, number]) => {
    travelRef.current?.(pos[0], pos[2]);
  }, []);

  useEffect(() => () => {
    if (nodeFlashTimer.current) clearTimeout(nodeFlashTimer.current);
    if (pledgeFlashTimer.current) clearTimeout(pledgeFlashTimer.current);
    if (goalFlashTimer.current) clearTimeout(goalFlashTimer.current);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key && e.key.toLowerCase() === "e") interact();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [interact]);

  // drive the in-world match visuals from streamed turns
  useEffect(() => {
    const t = bout.turn;
    if (!t || !opponent || !owned) return;
    const c = counters.current;
    if (t.actor === owned) {
      c.pa++;
      if (t.dmg > 0) c.hb++;
    } else {
      c.pb++;
      if (t.dmg > 0) c.ha++;
    }
    const bKey = matchOpponentKey(opponent, opponentId);
    setMatchView({
      aKey: owned,
      bKey,
      hpA: bout.hpA,
      hpB: bout.hpB,
      actor: battleActorToMatchKey(t.actor, owned, opponent, opponentId),
      punchA: c.pa,
      punchB: c.pb,
      hitA: c.ha,
      hitB: c.hb,
    });
  }, [bout.turn, bout.hpA, bout.hpB, opponent, opponentId, owned]);

  const startMatch = useCallback(async () => {
    if (!owned || !opponent) return;
    // Commit-reveal wager: stake is taken server-side BEFORE the bout so it can't
    // be forged after seeing the outcome. The nonce ties the stake to THIS bout.
    const betNonce = betSide
      ? (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)
      : "";
    if (betSide) {
      const placed = await store.commitBet(betAmt, betSide, betNonce);
      if (!placed) return; // not enough crowns (server-decided)
    }
    counters.current = { pa: 0, pb: 0, ha: 0, hb: 0 };
    setResult(null);
    const bKey = matchOpponentKey(opponent, opponentId);
    setMatchView({ aKey: owned, bKey, hpA: 100, hpB: 100, actor: null, punchA: 0, punchB: 0, hitA: 0, hitB: 0 });
    setOverlay("none");
    const ra = getRecipe(owned);
    const rb = getRecipe(opponent);
    // Ranked: a perched agent dents its own ladder champion (opponentId); a
    // central-arena pick maps to that creature's house champion. Either way the
    // server records the engine's verdict so this duel moves the one global rating.
    const tok = getOwnerToken();
    const oid = opponentId ?? `house-${opponent}`;
    const betParam = betSide && tok ? `&bet=${encodeURIComponent(betNonce)}` : "";
    // The region this world rewards — drives the Clan "home advantage" perk,
    // settled server-side off the player's authoritative pledge.
    const regionBias = world.region ? FOUNDING_REGIONS.find((r) => r.id === world.region)?.bias ?? null : null;
    const biasParam = regionBias ? `&bias=${regionBias}` : "";
    const rank = tok ? `&rank=1&tok=${encodeURIComponent(tok)}&oid=${encodeURIComponent(oid)}&h=${encodeURIComponent(getHandle())}${betParam}${biasParam}` : "";
    // The Tribunal argues an ASSIGNED case: the proposition becomes the bout's
    // real topic, the player holds their drawn stance, and the room's force-bias
    // is passed down — so holding your side + staying on topic move the score
    // (a central-arena hearing, never a perched-agent challenge).
    let tribunalParam = "";
    if (isTribunal && !opponentId && scenario.tribunal) {
      const { myStance } = tribunalDraw(tribunalSeed, `${tribunalSeed}:${opponent}`);
      tribunalParam =
        `&topic=${encodeURIComponent(tribunalProp)}&sa=${myStance}` +
        `&fav=${scenario.tribunal.favored}&pun=${scenario.tribunal.punished}`;
    }
    const url = `/api/battle?a=${owned}&b=${opponent}&${sideParams("a", ra)}&${sideParams("b", rb)}${tribunalParam}${rank}`;
    const homeAdvantage = !!store.force && !!regionBias && store.force === regionBias;
    bout.begin(url, (end: BattleEnd, ranked) => {
      const styles: Record<string, Style> = { [owned]: blankStyle(), [opponent]: blankStyle() };
      for (const turn of historyRef.current) accrue(turn.actor === owned ? styles[owned] : styles[opponent], turn);
      const winnerKey = end.winner;
      const loserKey = winnerKey === owned ? opponent : owned;
      const iWon = winnerKey === owned;

      // snapshot before applying, to show the evolution payoff
      const beforeC = store.get(owned);
      const beforeRating = ratingOf(beforeC);
      const beforeLevel = levelFor(beforeC.xp).level;
      const beforeSkill = skillLevel(beforeC);
      const beforeReader = trainerLevel(useChampions.getState().trainerXp).level;

      store.recordBattle(winnerKey, loserKey, styles);

      const afterC = store.get(owned);
      const afterRating = ratingOf(afterC);
      const afterLevel = levelFor(afterC.xp).level;
      const afterSkill = skillLevel(afterC);
      const afterReader = trainerLevel(useChampions.getState().trainerXp).level;
      const dom = dominant(afterC);
      // the MIND learns: opponent-specific memory + gentle doctrine auto-tune
      store.learnFromBout({ key: owned, opponentName: byKey[opponent]?.name || opponent, won: iWon, axisLabel: dom.axis.label });
      const learned = `Learned from ${byKey[opponent]?.name || opponent} ↗`;

      // Crowns are server-authoritative: the win reward AND the wager were settled
      // server-side and arrive in the ranked event. The client just mirrors the
      // returned balance; offline it optimistically credits the canonical amounts.
      let crownsDelta = 0;
      let betWon: boolean | null = null;
      if (ranked) {
        store.setBalance(ranked.balance);
        if (iWon) crownsDelta += ranked.crowns;
        // A ranked win may have fed the season war server-side — refresh standings
        // + the Reader's authoritative contribution so the badge updates live.
        if (iWon) loadWar();
        // First ranked win with no Clan yet → queue the (one-time) invite. It
        // surfaces after the result card closes, when "join a team" makes sense.
        if (iWon && !store.force && !clanInviteSeen.current) setClanInvite(true);
        if (ranked.bet) {
          betWon = ranked.bet.won;
          crownsDelta += ranked.bet.won ? ranked.bet.payout - ranked.bet.stake : -ranked.bet.stake;
        }
      } else {
        // offline fallback: no shared ladder, so settle locally
        let credit = 0;
        if (iWon) {
          const win = GROUNDS_WIN_REWARD + (homeAdvantage ? HOME_WIN_BONUS : 0);
          crownsDelta += win;
          credit += win;
        }
        if (betSide) {
          betWon = (betSide === "me" && iWon) || (betSide === "opp" && !iWon);
          if (betWon) {
            credit += betAmt * 2; // stake already debited at commit
            crownsDelta += betAmt;
          } else {
            crownsDelta -= betAmt;
          }
        }
        if (credit > 0) store.setBalance(useChampions.getState().crowns + credit);
      }
      // The four progression ladders a single bout feeds — named explicitly so a
      // new Reader learns the systems instead of seeing one opaque number move.
      // Compact progress pills for the result card — the rank delta is shown
      // separately (one pill, from the global ladder when ranked), so it isn't
      // duplicated here.
      const ladders: string[] = [];
      const xpGain = afterC.xp - beforeC.xp;
      if (xpGain) ladders.push(`+${xpGain} XP`);
      if (afterSkill > beforeSkill) ladders.push(`SL ${afterSkill}`);
      if (afterReader > beforeReader) ladders.push(`Reader L${afterReader}`);

      setResult({
        won: iWon,
        crowns: crownsDelta,
        betWon,
        ladders,
        ratingDelta: afterRating - beforeRating,
        leveledTo: afterLevel > beforeLevel ? afterLevel : null,
        learned,
        globalDelta: ranked ? (iWon ? ranked.delta : -ranked.delta) : null,
        globalRating: ranked ? ranked.mine : null,
        home: iWon && (ranked ? !!ranked.home : homeAdvantage),
      });
      setOverlay("result");
      outcomeSfx(iWon);
    });
  }, [owned, opponent, opponentId, betSide, betAmt, store, getRecipe, bout, world.region, isTribunal, tribunalProp, tribunalSeed, scenario.tribunal]);

  function closeMatch() {
    bout.stop();
    setMatchView(null);
    setResult(null);
    setOverlay("none");
    setOpponent(null);
    setOpponentId(null);
    setDuelMeta(null);
    setBetSide(null);
  }

  // ── The Gauntlet (scenario: "gauntlet") ────────────────────────────────────
  // A press-your-luck chain of duels. Each cleared bout banks an escalating pot
  // (held at risk); the player then cashes out or presses on. One loss ends the
  // run for a consolation fraction. Every bout is a real Arena battle, so ELO,
  // XP and body evolution accrue per fight exactly as in a duel.
  const gCfg = scenario.gauntlet ?? null;

  const finishRound = useCallback(
    (end: BattleEnd, run: GauntletRun, oppKey: string) => {
      if (!owned || !gCfg) return;
      const styles: Record<string, Style> = { [owned]: blankStyle(), [oppKey]: blankStyle() };
      for (const turn of historyRef.current) accrue(turn.actor === owned ? styles[owned] : styles[oppKey], turn);
      const iWon = end.winner === owned;
      const loserKey = iWon ? oppKey : owned;
      store.recordBattle(end.winner, loserKey, styles);
      const dom = dominant(store.get(owned));
      store.learnFromBout({ key: owned, opponentName: byKey[oppKey]?.name || oppKey, won: iWon, axisLabel: dom.axis.label });

      if (!iWon) {
        const consolation = Math.floor(run.pot * gCfg.consolationFrac);
        if (consolation > 0) store.awardGauntlet(consolation);
        setGRun({ ...run, phase: "over", pot: consolation, lastWon: false });
        return;
      }
      const pot = run.pot + roundReward(gCfg, run.idx + 1);
      const streak = run.streak + 1;
      const last = run.idx + 1 >= run.queue.length;
      if (last) {
        const total = pot + Math.round(pot * gCfg.clearBonus);
        store.awardGauntlet(total);
        setGRun({ ...run, phase: "over", pot: total, streak, lastWon: true, cashedOut: true });
      } else {
        setGRun({ ...run, phase: "cleared", pot, streak, lastWon: true });
      }
    },
    [owned, gCfg, store, byKey],
  );

  const runRound = useCallback(
    (run: GauntletRun) => {
      if (!owned) return;
      const oppKey = run.queue[run.idx];
      setOpponent(oppKey);
      counters.current = { pa: 0, pb: 0, ha: 0, hb: 0 };
      setMatchView({ aKey: owned, bKey: oppKey, hpA: 100, hpB: 100, actor: null, punchA: 0, punchB: 0, hitA: 0, hitB: 0 });
      const ra = getRecipe(owned);
      const rb = getRecipe(oppKey);
      const url = `/api/battle?a=${owned}&b=${oppKey}&${sideParams("a", ra)}&${sideParams("b", rb)}`;
      bout.begin(url, (end: BattleEnd) => finishRound(end, run, oppKey));
    },
    [owned, getRecipe, bout, finishRound],
  );

  const startGauntlet = useCallback(() => {
    if (!owned || !gCfg) return;
    const queue = gauntletQueue(owned, roster.map((r) => r.key), store.get, gCfg.maxRounds);
    if (!queue.length) return;
    setResult(null);
    setOverlay("none");
    const run: GauntletRun = { phase: "fighting", queue, idx: 0, streak: 0, pot: 0, cashedOut: false, lastWon: false };
    setGRun(run);
    runRound(run);
  }, [owned, gCfg, roster, store, runRound]);

  const pressOn = useCallback(() => {
    if (!gRun || gRun.phase !== "cleared") return;
    const next: GauntletRun = { ...gRun, idx: gRun.idx + 1, phase: "fighting" };
    setGRun(next);
    runRound(next);
  }, [gRun, runRound]);

  const cashOut = useCallback(() => {
    if (!gRun || gRun.phase !== "cleared") return;
    store.awardGauntlet(gRun.pot);
    setGRun({ ...gRun, phase: "over", cashedOut: true });
  }, [gRun, store]);

  const closeGauntlet = useCallback(() => {
    bout.stop();
    setGRun(null);
    setMatchView(null);
    setOpponent(null);
  }, [bout]);

  const showMatch = inMatch || overlay === "result";
  const pickingChampion = mounted && !owned && roster.length > 0;
  const showDock = !showIntro && !showMatch && overlay === "none" && !gRun && !pickingChampion;
  const dockPad = showDock ? DOCK_H + 8 : 0;
  // the bottom-docked compass bar reserves vertical space so the touch controls,
  // proximity prompt and coachmark always stack cleanly above it (regions only).
  const compassReserve = !isHub && owned ? (isMobile ? 76 : 92) : 0;
  // Keep the world HUD (season banner, music, crowns, altitude) tucked away
  // until the first-run tutorial and champion claim are done — otherwise its
  // zIndex pokes through on top of those higher-priority overlays.
  const showHud = mounted && !showIntro && !pickingChampion;
  const [hudDim, setHudDim] = useState(false);

  useEffect(() => {
    if (!showHud || showMatch || overlay !== "none" || gRun) {
      setHudDim(false);
      return;
    }
    let idle: ReturnType<typeof setTimeout>;
    const wake = () => {
      setHudDim(false);
      clearTimeout(idle);
      idle = setTimeout(() => setHudDim(true), 7000);
    };
    idle = setTimeout(() => setHudDim(true), 7000);
    window.addEventListener("mousemove", wake, { passive: true });
    window.addEventListener("keydown", wake);
    window.addEventListener("touchstart", wake, { passive: true });
    return () => {
      clearTimeout(idle);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("touchstart", wake);
    };
  }, [showHud, showMatch, overlay, gRun]);

  return (
    <main className="fill-shell fill-shell--immersive" style={{ position: "relative", overflow: "hidden" }}>
      {mounted && gpu && !gpu.ok && (
        <RenderNotice
          title="3D isn't available in this browser"
          body={
            <>
              The Grounds needs WebGL, which your browser couldn&apos;t start. In Chrome or Brave, open{" "}
              <b>Settings → System</b> and turn on <b>&ldquo;Use graphics acceleration when available&rdquo;</b>, then restart the
              browser. If it&apos;s already on, check <span className="mono">chrome://gpu</span>.
            </>
          }
          detail={gpu.reason ? `webgl: ${gpu.reason}` : undefined}
        />
      )}

      {mounted && gpu?.ok && rosterError && (
        <RenderNotice
          title="Couldn’t load the roster"
          body="The world is ready, but the champion data failed to load. This is usually a temporary network hiccup."
          detail={rosterError}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      )}

      {mounted && gpu?.ok && !rosterError && roster.length > 0 && (
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <RenderBoundary
            onError={() => track("error")}
            fallback={(error, reset) => (
              <RenderNotice
                title="The Grounds couldn’t render"
                body={
                  gpu?.software
                    ? "Your browser is rendering 3D in software mode (hardware acceleration is off or your GPU is blocklisted), which can’t handle this scene. Enable graphics acceleration in your browser settings and reload."
                    : "Something went wrong while drawing the 3D scene. Reloading usually fixes it."
                }
                detail={`${gpu?.renderer ? gpu.renderer + " · " : ""}${error.message}`}
                onRetry={() => {
                  reset();
                  setReloadKey((k) => k + 1);
                }}
              />
            )}
          >
            <World
              key={world.id}
              champions={showMatch ? matchChampions : champions}
              ownedKey={owned}
              onNear={setNear}
              match={showMatch ? matchView : null}
              controlsEnabled={controlsEnabled}
              biome={biome}
              spectator={spectator}
              towerAgents={isHub || spectator ? [] : towerAgents}
              nodes={liveNodes}
              goals={isHub ? [] : liveGoals}
              gates={isHub ? CONCORD_GATES : []}
              pledged={store.force}
              choosingClan={clanOpen}
              clanPreview={clanOpen ? clanPreview : null}
              tier={growth?.tier ?? 0}
              featured={growth?.featured ?? false}
              featuredWorld={isHub ? featuredWorld : null}
              onAltitude={onAltitude}
              onPose={onPose}
              travelRef={travelRef}
              touchBottomInset={isTouch ? dockPad + compassReserve : 0}
            />
          </RenderBoundary>
        </div>
      )}

      {/* HUD — sits above the WebGL canvas and touch layer */}
      {showHud && (
      <div className={`grounds-hud${hudDim ? " is-dim" : ""}`} style={{ position: "absolute", top: 14, left: 58, zIndex: 100, pointerEvents: "none", maxWidth: isMobile ? "calc(100vw - 130px)" : 400 }}>
        {!showMatch && overlay === "none" && owned && !gRun && (
          <div style={{ pointerEvents: "auto", position: "relative", marginBottom: isMobile ? 6 : 10 }}>
            {worldMenu && (
              <div className="panel pop" style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, padding: 8, display: "flex", flexDirection: "column", gap: 6, width: 240, maxWidth: "calc(100vw - 32px)", zIndex: 2 }}>
                <span className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--muted2)", padding: "0 2px" }}>CHOOSE A WORLD</span>
                {WORLDS.map((w) => {
                  const ac = w.biome.lights.arenaPoint;
                  const on = w.id === worldId;
                  return (
                    <button
                      key={w.id}
                      onClick={() => { setWorldId(w.id); setWorldMenu(false); }}
                      className="panel"
                      style={{ ["--ac" as string]: ac, textAlign: "left", padding: "6px 10px", cursor: "pointer", borderColor: on ? ac : "var(--line)", background: on ? "rgba(255,255,255,.04)" : "transparent" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 9, background: ac, boxShadow: `0 0 8px ${ac}` }} />
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{w.name}</span>
                        <span className="mono" style={{ marginLeft: "auto", fontSize: 8, letterSpacing: 1, color: ac, border: `1px solid ${ac}`, borderRadius: 5, padding: "1px 5px" }}>{w.scenario.name}</span>
                      </div>
                      <div className="mono" style={{ fontSize: 9, color: "var(--muted2)", marginTop: 3 }}>{w.scenario.blurb}</div>
                    </button>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              onClick={() => setWorldMenu((v) => !v)}
              className="panel"
              aria-label="Choose a world"
              aria-expanded={worldMenu}
              style={{
                ["--ac" as string]: world.biome.lights.arenaPoint,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: isMobile ? "8px 11px" : "8px 12px",
                cursor: "pointer",
                borderColor: worldMenu ? world.biome.lights.arenaPoint : "var(--line)",
                touchAction: "manipulation",
                width: "fit-content",
                maxWidth: "100%",
              }}
            >
              <Globe size={16} color={world.biome.lights.arenaPoint} strokeWidth={2} />
              <span style={{ fontSize: isMobile ? 13 : 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{world.name}</span>
            </button>
          </div>
        )}

        {!showMatch && overlay === "none" && owned && !gRun && (
          <div style={{ marginBottom: isMobile ? 6 : 10 }}>
            <TrainerBadge isMobile={isMobile} war={war} onOpenClan={() => { setClanPreselect(null); setClanOpen(true); }} />
          </div>
        )}

        {(owned || !isMobile) && overlay === "none" && !showMatch && !gRun && (
          <p className="grounds-hud__hint mono" style={{ fontSize: isMobile ? 10 : 11, color: "var(--muted)", margin: "4px 0 0", letterSpacing: isMobile ? 0.5 : 1, lineHeight: 1.45, pointerEvents: "none" }}>
            {owned
              ? isHub
                ? isMobile
                  ? "Walk to a Vaultgate to travel · tap the prompt when near"
                  : "THE CONCORD · VAULTGATE → TRAVEL · E TO ACT · M FOR MENU"
                : spectator
                  ? isMobile
                    ? "The Amphitheatre · watch the league · tap the herald for today's case"
                    : "THE AMPHITHEATRE · THE LEAGUE FIGHTS ITSELF · WALK TO THE HERALD FOR TODAY'S CASE · M TO LEAVE"
                  : isMobile
                    ? "Walk to glowing spots · tap the prompt when near"
                    : scenario.id === "gauntlet"
                      ? "WALK TO THE ARENA · E TO ENTER THE GAUNTLET · CLIMB THE TOWER"
                      : "WASD · SPACE / DOUBLE-JUMP TO FLY · X TO DROP · CLIMB · E NEAR NPCs · M FOR MENU"
              : "Claim a champion to enter the world"}
          </p>
        )}
        {!isMobile && overlay === "none" && !showMatch && showChronicle && (
          <div style={{ marginTop: 12, width: 380, maxWidth: "calc(100vw - 32px)", pointerEvents: "auto" }}>
            <SeasonBanner compact onClose={dismissChronicle} />
          </div>
        )}
      </div>
      )}
      {showHud && (
      <div className={`grounds-hud${hudDim ? " is-dim" : ""}`} style={{ position: "absolute", top: 14, right: 16, display: "flex", alignItems: "center", gap: 8, zIndex: 100, pointerEvents: "auto" }}>
        {overlay === "none" && !showMatch && !gRun && <ThemeToggle variant="compact" />}
        {overlay === "none" && !showMatch && !gRun && <AmbientToggle compact={isMobile} />}
        <div className="panel" style={{ padding: isMobile ? "7px 11px" : "8px 14px", display: "flex", alignItems: "center", gap: isMobile ? 6 : 8 }}>
          <Crown size={isMobile ? 15 : 17} color="var(--gold)" strokeWidth={2} />
          <span style={{ fontWeight: 700, fontSize: isMobile ? 15 : 18, color: "var(--gold)" }}>{crowns}</span>
          {!isMobile && <span className="mono" style={{ fontSize: 9, color: "var(--muted2)", letterSpacing: 1 }}>CROWNS</span>}
        </div>
      </div>
      )}

      {/* altitude / tower HUD — on mobile we keep only the altitude readout */}
      {showHud && !showMatch && overlay === "none" && !isHub && towerAgents.length > 0 && (
        <div className={`grounds-hud panel${hudDim ? " is-dim" : ""}`} style={{ position: "absolute", top: isMobile ? 56 : 64, right: 16, padding: isMobile ? "7px 11px" : "10px 14px", minWidth: isMobile ? 0 : 140, pointerEvents: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Mountain size={isMobile ? 14 : 16} color={altitude > 1 ? "#39e0ff" : "var(--muted2)"} strokeWidth={2} />
            <span style={{ fontWeight: 700, fontSize: isMobile ? 16 : 22, color: altitude > 1 ? "#39e0ff" : "var(--muted)" }}>{Math.max(0, altitude).toFixed(1)}</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--muted2)" }}>m</span>
            {!isMobile && <span className="mono" style={{ fontSize: 9, color: "var(--muted2)", letterSpacing: 1, marginLeft: "auto" }}>ALTITUDE</span>}
          </div>
          {!isMobile && (
            <>
              <div className="mono" style={{ fontSize: 9, color: "var(--muted2)", marginTop: 4 }}>
                peak {Math.max(0, peakAltitude).toFixed(1)}m
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8, fontSize: 9, alignItems: "center" }} className="mono">
                <span style={{ display: "flex", alignItems: "center", gap: 3, color: "#36d39a" }}><Swords size={12} strokeWidth={2} /> {towerAgents.filter((a) => a.status === "awaiting").length}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 3, color: "#6a6bff" }}><Moon size={12} strokeWidth={2} /> {towerAgents.filter((a) => a.status === "hibernating").length}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 3, color: "#7b7b88" }}><Ban size={12} strokeWidth={2} /> {towerAgents.filter((a) => a.status === "disabled").length}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* the compass — a heading tape docked at the bottom (regions only; the
          Concord's gates guide you directly, so no compass is shown in the hub) */}
      {showHud && !showMatch && overlay === "none" && owned && !gRun && !isHub && (
        <div
          className={`grounds-hud${hudDim ? " is-dim" : ""}`}
          style={{ position: "absolute", left: 0, right: 0, bottom: isMobile ? 12 : 16, display: "flex", justifyContent: "center", padding: isMobile ? "0 12px" : "0 16px", zIndex: 100, pointerEvents: "none" }}
        >
          <Compass landmarks={landmarks} goals={allGoals} goalsDone={doneGoals} poseRef={poseRef} onTravel={fastTravel} fragments={fragments} nodesLeft={liveNodes.length} isMobile={isMobile} />
        </div>
      )}

      {/* cache-claimed celebration */}
      {nodeFlash && (
        <Celebration
          tone="good"
          accent={nodeFlash.fragments > 0 ? "#39e0ff" : "#f0a93a"}
          kicker={nodeFlash.fragments > 0 ? "FRAGMENT SECURED" : "CACHE CLAIMED"}
          title={nodeFlash.fragments > 0 ? "Memory fragment" : "Crown cache"}
        >
          {nodeFlash.crowns > 0 && <span style={{ color: "var(--gold)", display: "inline-flex", alignItems: "center", gap: 4 }}>+{nodeFlash.crowns} <Crown size={15} strokeWidth={2} /></span>}
          {nodeFlash.fragments > 0 && <span style={{ color: "#39e0ff", display: "inline-flex", alignItems: "center", gap: 4 }}><Gem size={15} strokeWidth={2} /> +{nodeFlash.fragments}</span>}
        </Celebration>
      )}

      {/* one-time objectives coachmark */}
      {goalCoach && owned && !claiming && !isHub && !showMatch && overlay === "none" && !gRun && liveGoals.length > 0 && (
        <div style={{ position: "absolute", bottom: (isMobile ? 96 : 70) + compassReserve, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 59, padding: "0 16px" }}>
          <div className="panel pop" style={{ ["--ac" as string]: "var(--gold)", pointerEvents: "auto", display: "flex", alignItems: "center", gap: 12, padding: "9px 13px", maxWidth: 460, borderColor: "var(--gold)" }}>
            <span style={{ fontSize: 15, color: "var(--gold)", flexShrink: 0 }}>▲▼◆</span>
            <span style={{ fontSize: 12, lineHeight: 1.35 }}>
              <strong>Objectives.</strong> Reach the peak, descend the rift, find the secret — they&apos;re in your compass, and pay out.
            </span>
            <button onClick={dismissGoalCoach} className="btn" style={{ ["--ac" as string]: "var(--gold)", fontSize: 11, padding: "4px 10px", flexShrink: 0 }}>Got it</button>
          </div>
        </div>
      )}

      {/* first-ranked-win Clan invite — one-time, surfaces after the result
          card closes (deferred so the choice arrives when it means something) */}
      {clanInvite && owned && !store.force && !showMatch && overlay === "none" && !result && !gRun && !clanOpen && (
        <div style={{ position: "absolute", bottom: (isMobile ? 96 : 70) + compassReserve + 64, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 59, padding: "0 16px" }}>
          <div className="panel pop" style={{ ["--ac" as string]: "#c77dff", pointerEvents: "auto", display: "flex", alignItems: "center", gap: 12, padding: "9px 13px", maxWidth: 480, borderColor: "#c77dff" }}>
            <span style={{ fontSize: 16, color: "#c77dff", flexShrink: 0 }}>⚑</span>
            <span style={{ fontSize: 12, lineHeight: 1.35 }}>
              <strong>First ranked win!</strong> Pick a Clan to fight for — your wins build its season war, and home turf pays extra.
            </span>
            <button onClick={() => { dismissClanInvite(); setClanPreselect(null); setClanOpen(true); }} className="btn btn-primary" style={{ ["--ac" as string]: "#c77dff", fontSize: 11, padding: "4px 11px", flexShrink: 0 }}>Choose</button>
            <button onClick={dismissClanInvite} className="btn" style={{ ["--ac" as string]: "var(--line2)", fontSize: 11, padding: "4px 9px", flexShrink: 0 }}>Later</button>
          </div>
        </div>
      )}

      {/* goal-cleared celebration (peak / depth / secret) */}
      {goalFlash && (
        <Celebration
          tone="epic"
          accent={goalFlash.goalKind === "secret" ? "#c77dff" : goalFlash.goalKind === "depth" ? "#39e0ff" : "#f0a93a"}
          kicker={goalFlash.goalKind === "secret" ? "SECRET UNCOVERED" : goalFlash.goalKind === "depth" ? "RIFT CONQUERED" : "SUMMIT REACHED"}
          title={goalFlash.label}
        >
          {goalFlash.crowns > 0 && <span style={{ color: "var(--gold)", display: "inline-flex", alignItems: "center", gap: 4 }}>+{goalFlash.crowns} <Crown size={15} strokeWidth={2} /></span>}
          {goalFlash.fragments > 0 && <span style={{ color: "#39e0ff", display: "inline-flex", alignItems: "center", gap: 4 }}><Gem size={15} strokeWidth={2} /> +{goalFlash.fragments}</span>}
          {goalFlash.trainerXp > 0 && <span style={{ color: "#cfcbe8" }}>+{goalFlash.trainerXp} XP</span>}
          {goalFlash.seasonPoints > 0 && store.force && <span style={{ color: "#c77dff" }}>+{goalFlash.seasonPoints} war</span>}
        </Celebration>
      )}

      {/* the Clan decision surface — one place to choose / review / lock */}
      {clanOpen && (
        <ClanSheet
          preselect={clanPreselect}
          suggested={owned ? byKey[owned]?.type ?? null : null}
          war={war}
          onClose={() => { setClanOpen(false); setClanPreview(null); }}
          onSelectionChange={setClanPreview}
          onPledged={(f) => {
            const fm = forceMeta(f);
            setPledgeFlash({ name: fm.house, motto: fm.motto, color: TYPE_COLOR[f] });
            if (pledgeFlashTimer.current) clearTimeout(pledgeFlashTimer.current);
            pledgeFlashTimer.current = setTimeout(() => setPledgeFlash(null), 2800);
          }}
        />
      )}

      {/* clan-joined celebration */}
      {pledgeFlash && (
        <Celebration
          tone="pledge"
          accent={pledgeFlash.color}
          kicker="CLAN JOINED"
          title={pledgeFlash.name}
          subtitle={pledgeFlash.motto}
        />
      )}

      {/* menu — single visible button, top-left (M to toggle) */}
      <GameDock hidden={!showDock} />

      {/* onboarding: choose your champion */}
      {mounted && !owned && roster.length > 0 && !claiming && <Onboarding roster={roster} get={store.get} onPick={setClaiming} />}

      {/* arrival cinematic: claim → wipe → reveal → welcome (hides the figure pop-in) */}
      {mounted && claiming && byKey[claiming] && (
        <ArrivalSequence
          key={claiming}
          ckey={claiming}
          type={byKey[claiming].type}
          name={byKey[claiming].name}
          champion={store.get(claiming)}
          onEnter={() => setOwned(claiming)}
          onDone={() => setClaiming(null)}
        />
      )}

      {/* first-run tutorial / elevator pitch */}
      {mounted && showIntro && <FirstRun onClose={closeIntro} />}

      {/* proximity action — centered above the touch controls so it never
          overlaps the jump / sprint cluster. Tap on touch, E on desktop. */}
      {owned && near && overlay === "none" && !inMatch && !result && !gRun && !(near.kind === "venue" && near.venue === "league") && (
        <div
          style={{
            position: "absolute",
            bottom: (isTouch ? 132 : 96) + dockPad + compassReserve,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            padding: "0 16px",
            pointerEvents: "none",
            zIndex: 35,
          }}
        >
          <button
            onClick={interact}
            className="btn btn-primary pop"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "13px 22px",
              fontSize: 15,
              fontWeight: 700,
              maxWidth: "min(78vw, 360px)",
              whiteSpace: "nowrap",
              cursor: "pointer",
              touchAction: "manipulation",
              pointerEvents: "auto",
              ["--ac" as string]: "var(--gold)",
            }}
          >
            <FightIcon size={18} strokeWidth={2.2} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {near.kind === "gate"
                ? `Enter ${near.label}`
                : near.kind === "venue"
                ? near.venue === "daily"
                  ? "Read today's Tribunal"
                  : "Enter the Scrying Gallery"
                : near.kind === "force"
                ? store.force === near.type
                  ? `Your Clan · ${near.name}`
                  : `Clan of ${near.name}`
                : near.kind === "train"
                ? "Train your champion"
                : near.kind === "broker"
                ? "Trade with the Broker"
                : near.kind === "keeper"
                  ? `Talk to ${near.name}`
                  : near.kind === "challenge"
                    ? `Challenge ${near.name}`
                    : near.kind === "node"
                      ? near.nodeKind === "fragment"
                        ? `Claim fragment ×${near.fragments}`
                        : `Claim cache · +${near.crowns} Crowns`
                      : near.kind === "goal"
                        ? `Claim ${near.label}`
                        : scenario.id === "gauntlet"
                          ? "Enter the Gauntlet"
                          : scenario.id === "tribunal"
                            ? "Enter the Tribunal"
                            : "House sparring pit"}
            </span>
            {!isTouch && <kbd className="mono" style={{ fontSize: 11, opacity: 0.8, border: "1px solid currentColor", borderRadius: 5, padding: "1px 6px" }}>E</kbd>}
          </button>
        </div>
      )}

      {/* training overlay */}
      {overlay === "train" && owned && byKey[owned] && (
        <TrainOverlay ckey={owned} entry={byKey[owned]} onClose={() => setOverlay("none")} />
      )}

      {/* guardian duel overlay — opened from the Shrine in the world */}
      {overlay === "guardian" && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "var(--overlay)", backdropFilter: "blur(7px)", zIndex: 50, padding: 16 }}>
          <div className="panel pop" style={{ ["--ac" as string]: "#c77dff", width: "min(720px, 96vw)", maxHeight: "90vh", overflow: "auto", padding: 20 }}>
            <GuardianGame embedded startLevel={keeperLevel ?? undefined} onClose={() => { setOverlay("none"); setKeeperLevel(null); }} />
          </div>
        </div>
      )}

      {/* arena spar (central pit) or locked tower duel */}
      {overlay === "broker" && <BrokerOverlay onClose={() => setOverlay("none")} />}

      {/* Concord venues — the meta games, now walk-up shrines in the hub */}
      {overlay === "daily" && <DailySheet onClose={() => setOverlay("none")} />}

      {overlay === "arena" && owned && (
        <ChallengeOverlay
          owned={owned}
          ownedEntry={byKey[owned]}
          roster={roster}
          get={store.get}
          opponent={opponent}
          setOpponent={(k) => { setOpponent(k); setOpponentId(null); setDuelMeta(null); }}
          locked={!!opponentId}
          duelMeta={duelMeta}
          betSide={betSide}
          setBetSide={setBetSide}
          betAmt={betAmt}
          setBetAmt={setBetAmt}
          crowns={crowns}
          onClose={() => { setOverlay("none"); setDuelMeta(null); }}
          onFight={startMatch}
        />
      )}

      {/* gauntlet briefing — entering the chain */}
      {overlay === "gauntlet" && owned && byKey[owned] && gCfg && (
        <GauntletBriefing
          ownedEntry={byKey[owned]}
          roster={roster}
          get={store.get}
          cfg={gCfg}
          onStart={startGauntlet}
          onClose={() => setOverlay("none")}
        />
      )}

      {/* tribunal briefing — assigned-stance hearing on the case of the day */}
      {overlay === "tribunal" && owned && byKey[owned] && scenario.tribunal && (
        <TribunalBriefing
          ownedEntry={byKey[owned]}
          roster={roster}
          get={store.get}
          cfg={scenario.tribunal}
          seed={tribunalSeed}
          opponent={opponent}
          setOpponent={(k) => { setOpponent(k); setOpponentId(null); setDuelMeta(null); }}
          betSide={betSide}
          setBetSide={setBetSide}
          betAmt={betAmt}
          setBetAmt={setBetAmt}
          crowns={crowns}
          onClose={() => setOverlay("none")}
          onFight={startMatch}
        />
      )}

      {/* gauntlet between-rounds: press your luck or cash out */}
      {gRun?.phase === "cleared" && gCfg && (
        <GauntletInterstitial run={gRun} byKey={byKey} get={store.get} cfg={gCfg} onPressOn={pressOn} onCashOut={cashOut} />
      )}

      {/* gauntlet run resolved */}
      {gRun?.phase === "over" && <GauntletResult run={gRun} onClose={closeGauntlet} />}

      {/* the case on the wall while a Tribunal hearing runs */}
      {showMatch && matchView && isTribunal && !opponentId && !result && (
        <TribunalMatchBanner
          proposition={tribunalProp}
          myStance={tribunalDraw(tribunalSeed, `${tribunalSeed}:${opponent ?? "_"}`).myStance}
          isMobile={isMobile}
        />
      )}

      {/* live match reasoning overlay */}
      {showMatch && matchView && (
        <MatchHud bout={bout} owned={owned!} opponent={matchBKey} foeMeta={duelMeta} foeType={towerAgents.find((a) => a.id === opponentId)?.type} byKey={byKey} get={store.get} result={result} onClose={closeMatch} isMobile={isMobile} />
      )}

    </main>
  );
}

// The Broker's exchange — convert Crowns ↔ Fragments at a spread. A mind that
// deals: fragments fund free training, so this is the liquid bridge between the
// betting economy (Crowns) and champion power (Fragments).
function BrokerOverlay({ onClose }: { onClose: () => void }) {
  const crowns = useChampions((s) => s.crowns);
  const fragments = useChampions((s) => s.fragments);
  const buyFragment = useChampions((s) => s.buyFragment);
  const sellFragment = useChampions((s) => s.sellFragment);
  const col = "#39e0ff";
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "var(--overlay)", backdropFilter: "blur(7px)", zIndex: 50, padding: 16 }}>
      <div className="panel pop" style={{ ["--ac" as string]: col, width: "min(420px, 95vw)", padding: 24, borderColor: col }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 10, background: `${col}1c`, color: col }}>
            <Gem size={20} strokeWidth={2.2} />
          </span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>The Broker</div>
            <div className="mono" style={{ fontSize: 10, color: col, letterSpacing: 0.5 }}>a mind that deals in fragments</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "grid", placeItems: "center", lineHeight: 0 }}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", display: "flex", justifyContent: "center", gap: 16, margin: "16px 0" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Crown size={14} color="var(--gold)" strokeWidth={2} /> {crowns}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: col }}><Gem size={14} strokeWidth={2} /> {fragments}</span>
        </div>

        <button
          className="btn"
          style={{ ["--ac" as string]: col, width: "100%", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: crowns < FRAGMENT_BUY ? 0.5 : 1 }}
          disabled={crowns < FRAGMENT_BUY}
          onClick={() => buyFragment()}
        >
          <Gem size={15} strokeWidth={2.2} color={col} />
          Buy 1 fragment · {FRAGMENT_BUY} Crowns
        </button>
        <button
          className="btn"
          style={{ ["--ac" as string]: "var(--gold)", width: "100%", fontSize: 13, marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: fragments < 1 ? 0.5 : 1 }}
          disabled={fragments < 1}
          onClick={() => sellFragment()}
        >
          <Crown size={15} strokeWidth={2.2} color="var(--gold)" />
          Sell 1 fragment · +{FRAGMENT_SELL} Crowns
        </button>
        <p className="mono" style={{ fontSize: 9.5, color: "var(--muted2)", textAlign: "center", marginTop: 12, letterSpacing: 0.5, lineHeight: 1.5 }}>
          Fragments fund free training sessions. Find them free out in the wilds — the Broker is just the quick way.
        </p>
      </div>
    </div>
  );
}

function Onboarding({ roster, get, onPick }: { roster: RosterEntry[]; get: (k: string) => Champion; onPick: (k: string) => void }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "var(--overlay)", backdropFilter: "blur(6px)", zIndex: 40, padding: 20 }}>
      <div className="panel" style={{ padding: 26, width: "min(760px, 95vw)", maxHeight: "90vh", overflow: "auto", textAlign: "center" }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: 2, color: "var(--muted2)" }}>
          STEP 1 · CLAIM YOUR CHAMPION
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 700, margin: "8px 0 4px" }}>Pick the agent you&apos;ll train.</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 14px" }}>
          It becomes yours. Each champion fights in one Force — the wheel below decides what beats what.
        </p>

        {/* the one lesson that matters before you choose: each Force beats the next */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, margin: "0 0 18px" }}>
          <ForcesChain />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {roster.map((r) => {
            const c = get(r.key);
            const col = TYPE_COLOR[r.type];
            const lf = levelFor(c.xp);
            const nb = wheelNeighbors(r.type);
            const prey = FORCE_LORE[nb.prey];
            const pred = FORCE_LORE[nb.predator];
            return (
              <button key={r.key} className="panel" onClick={() => onPick(r.key)} style={{ ["--ac" as string]: col, padding: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, cursor: "pointer" }}>
                <ChampionAvatar ckey={r.key} type={r.type} champion={c} size={84} />
                <div style={{ fontWeight: 700 }}>{r.name}</div>
                <div className="mono" style={{ fontSize: 10, color: col }}>
                  {FORCE_LORE[r.type].inWorld} · L{lf.level} {tierFor(lf.level).name}
                </div>
                <div style={{ fontSize: 12, fontStyle: "italic" }}>{doctrine(c, lf.level)}</div>
                <div className="mono" style={{ display: "flex", gap: 9, fontSize: 9, color: "var(--muted2)", marginTop: 1 }}>
                  <span>beats <span style={{ color: prey.hex }}>{prey.sigil}</span></span>
                  <span>loses to <span style={{ color: pred.hex }}>{pred.sigil}</span></span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Dial({ label, value, onChange, color, hints }: { label: string; value: number; onChange: (v: number) => void; color: string; hints: [string, string] }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span className="mono" style={{ color }}>
          {value}
        </span>
      </div>
      <input type="range" min={0} max={100} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: color }} />
      <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--muted2)" }}>
        <span>{hints[0]}</span>
        <span>{hints[1]}</span>
      </div>
    </div>
  );
}

function TrainOverlay({ ckey, entry, onClose }: { ckey: string; entry: RosterEntry; onClose: () => void }) {
  const store = useChampions();
  const champ = store.get(ckey);
  const recipe = store.getRecipe(ckey);
  const col = TYPE_COLOR[entry.type];
  const app = appearanceOf(champ);
  const lf = levelFor(champ.xp);
  const [persona, setPersonaLocal] = useState(recipe.persona ?? "");
  const [flash, setFlash] = useState<{ xp: number; leveledTo: number | null } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  const reflectTrain = (before: typeof champ) => {
    const after = store.get(ckey);
    const beforeLevel = levelFor(before.xp).level;
    const afterLevel = levelFor(after.xp).level;
    setFlash({ xp: after.xp - before.xp, leveledTo: afterLevel > beforeLevel ? afterLevel : null });
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 2400);
  };

  const doTrain = async () => {
    const before = store.get(ckey);
    if (!(await store.trainChampion(ckey))) return;
    reflectTrain(before);
  };

  const doTrainFragment = () => {
    const before = store.get(ckey);
    if (!store.trainWithFragment(ckey)) return;
    reflectTrain(before);
  };

  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "var(--overlay)", backdropFilter: "blur(7px)", zIndex: 50, padding: 16 }}>
      <div className="panel pop" style={{ ["--ac" as string]: col, width: "min(560px, 95vw)", maxHeight: "90vh", overflow: "auto", padding: 24, borderColor: col }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <ChampionAvatar ckey={ckey} type={entry.type} champion={champ} size={84} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Train {entry.name}</div>
            <div className="mono" style={{ fontSize: 11, color: col }}>
              {entry.type} · L{lf.level} {tierFor(lf.level).name} · {doctrine(champ, lf.level)}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "grid", placeItems: "center", lineHeight: 0 }}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", margin: "18px 0 10px" }}>
          DOCTRINE · how it fights (free to tune anytime)
        </div>
        <Dial label="Aggression" value={recipe.strat.aggression} color="#ff6b4a" hints={["patient / counter", "relentless"]} onChange={(v) => store.setStrat(ckey, { ...recipe.strat, aggression: v })} />
        <Dial label="Focus" value={recipe.strat.focus} color="#b07bff" hints={["just hit", "set up combos"]} onChange={(v) => store.setStrat(ckey, { ...recipe.strat, focus: v })} />
        <Dial label="Risk" value={recipe.strat.risk} color="#f5d020" hints={["play safe", "swing big"]} onChange={(v) => store.setStrat(ckey, { ...recipe.strat, risk: v })} />

        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", margin: "18px 0 8px" }}>
          PERSONA · its voice (optional)
        </div>
        <textarea
          value={persona}
          onChange={(e) => setPersonaLocal(e.target.value)}
          onBlur={() => store.setPersona(ckey, persona)}
          placeholder={entry.persona}
          rows={2}
          style={{ width: "100%", background: "var(--panel2)", border: "1px solid var(--line2)", borderRadius: 10, color: "var(--ink)", padding: 10, fontFamily: "inherit", fontSize: 13, resize: "vertical" }}
        />

        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", margin: "18px 0 8px" }}>
          BRAIN · who controls it in the arena
        </div>
        <AgentPicker ckey={ckey} recipe={recipe} />

        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, margin: "16px 0" }}>
          <span>stature ×{(app.h / 1.7).toFixed(2)}</span>
          <span>build ×{app.width.toFixed(2)}</span>
          <span>head ×{app.headScale.toFixed(2)}</span>
          <span>fists ×{app.handScale.toFixed(2)}</span>
          <span>level {lf.level}</span>
          <span>{champ.wins}W / {champ.losses}L</span>
        </div>

        <button
          className="btn btn-primary"
          style={{ ["--ac" as string]: "var(--good)", width: "100%", fontSize: 14, opacity: store.crowns < TRAIN_COST ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          disabled={store.crowns < TRAIN_COST}
          onClick={doTrain}
        >
          <ArrowUp size={16} strokeWidth={2.4} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            Train session: {TRAIN_COST} <Crown size={14} color="var(--gold)" strokeWidth={2} />
          </span>
        </button>
        {store.fragments > 0 && (
          <button
            className="btn"
            style={{ ["--ac" as string]: "#39e0ff", width: "100%", fontSize: 13, marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            onClick={doTrainFragment}
          >
            <Gem size={15} strokeWidth={2.2} color="#39e0ff" />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              Free session · spend 1 fragment ({store.fragments})
            </span>
          </button>
        )}
        {store.fragments === 0 && (
          <p className="mono" style={{ fontSize: 10, color: "var(--muted2)", textAlign: "center", marginTop: 8, letterSpacing: 0.5 }}>
            Fragments fund free sessions — clear world goals &amp; caches in the wilds.
          </p>
        )}
        {flash && (
          <div className="pop" style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
            <span className="chip" style={{ borderColor: "var(--good)", color: "var(--good)" }}>✦ Trained · +{flash.xp} XP</span>
            {flash.leveledTo && <span className="chip" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>★ LEVEL UP → L{flash.leveledTo}</span>}
          </div>
        )}
        {store.crowns < TRAIN_COST && <p style={{ color: "var(--bad)", fontSize: 12, textAlign: "center", marginTop: 8 }}>Not enough Crowns. Win a fight in the Arena.</p>}
      </div>
    </div>
  );
}

function AgentPicker({ ckey, recipe }: { ckey: string; recipe: Recipe }) {
  const setAgent = useChampions((s) => s.setAgent);
  const [cfg, setCfg] = useState<AgentConfig>(recipe.agent ?? { provider: "grok" });
  const update = (next: AgentConfig) => {
    setCfg(next);
    setAgent(ckey, next.provider === "grok" ? { provider: "grok" } : next);
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--panel2)",
    border: "1px solid var(--line2)",
    borderRadius: 8,
    color: "var(--ink)",
    padding: "8px 10px",
    fontFamily: "inherit",
    fontSize: 12,
  };
  const tab = (id: AgentConfig["provider"], label: string) => (
    <button
      type="button"
      onClick={() => update({ ...cfg, provider: id })}
      className={cfg.provider === id ? "btn btn-primary" : "btn"}
      style={{ ["--ac" as string]: "#6a6bff", fontSize: 12 }}
    >
      {label}
    </button>
  );
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        {tab("grok", "House · Grok")}
        {tab("openai", "Any model")}
        {tab("http", "My agent")}
      </div>
      {cfg.provider === "grok" && (
        <p className="mono" style={{ fontSize: 10, color: "var(--muted2)", margin: 0 }}>
          The built-in house brain. Zero config. It just fights.
        </p>
      )}
      {cfg.provider === "openai" && (
        <div style={{ display: "grid", gap: 6 }}>
          <input placeholder="model: e.g. gpt-4o-mini" value={cfg.model ?? ""} onChange={(e) => update({ ...cfg, model: e.target.value })} style={inputStyle} />
          <input placeholder="base URL: default https://api.openai.com/v1" value={cfg.baseUrl ?? ""} onChange={(e) => update({ ...cfg, baseUrl: e.target.value })} style={inputStyle} />
          <input placeholder="API key" type="password" value={cfg.apiKey ?? ""} onChange={(e) => update({ ...cfg, apiKey: e.target.value })} style={inputStyle} />
          <span className="mono" style={{ fontSize: 9, color: "var(--muted2)" }}>Any OpenAI-compatible endpoint: GPT, Llama, local Ollama, OpenRouter.</span>
        </div>
      )}
      {cfg.provider === "http" && (
        <div style={{ display: "grid", gap: 6 }}>
          <input placeholder="https://your-agent.example.com/act" value={cfg.endpoint ?? ""} onChange={(e) => update({ ...cfg, endpoint: e.target.value })} style={inputStyle} />
          <span className="mono" style={{ fontSize: 9, color: "var(--muted2)" }}>We POST the AgentView JSON each turn; your server replies with move, line, why.</span>
        </div>
      )}
    </div>
  );
}

function ChallengeOverlay(props: {
  owned: string;
  ownedEntry: RosterEntry;
  roster: RosterEntry[];
  get: (k: string) => Champion;
  opponent: string | null;
  setOpponent: (k: string) => void;
  locked?: boolean;
  duelMeta?: { name: string; handle?: string } | null;
  betSide: "me" | "opp" | null;
  setBetSide: (s: "me" | "opp" | null) => void;
  betAmt: number;
  setBetAmt: (n: number) => void;
  crowns: number;
  onClose: () => void;
  onFight: () => void;
}) {
  const { owned, ownedEntry, roster, get, opponent, setOpponent, locked, duelMeta, betSide, setBetSide, betAmt, setBetAmt, crowns, onClose, onFight } = props;
  const opps = roster.filter((r) => r.key !== owned);
  const oppEntry = opponent ? roster.find((r) => r.key === opponent) : null;

  if (locked && opponent && oppEntry) {
    const col = TYPE_COLOR[oppEntry.type];
    const oppChamp = get(opponent);
    return (
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "var(--overlay)", backdropFilter: "blur(7px)", zIndex: 50, padding: 16 }}>
        <div className="panel pop" style={{ ["--ac" as string]: col, width: "min(520px, 95vw)", maxHeight: "90vh", overflow: "auto", padding: 24, borderColor: col }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Face to face</div>
            <button onClick={onClose} aria-label="Close" style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "grid", placeItems: "center", lineHeight: 0 }}>
              <X size={20} strokeWidth={2} />
            </button>
          </div>
          <p className="mono" style={{ fontSize: 11, color: "var(--muted)", margin: "8px 0 18px", lineHeight: 1.55 }}>
            Next on the ladder. Beat them to keep climbing.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 14, alignItems: "center", marginBottom: 18 }}>
            <div style={{ textAlign: "center" }}>
              <ChampionAvatar ckey={owned} type={ownedEntry.type} champion={get(owned)} size={72} />
              <div style={{ fontWeight: 700, marginTop: 8 }}>{ownedEntry.name}</div>
              <div className="mono" style={{ fontSize: 10, color: TYPE_COLOR[ownedEntry.type] }}>YOURS</div>
            </div>
            <div className="mono" style={{ fontSize: 18, color: "var(--muted2)", fontWeight: 700 }}>VS</div>
            <div style={{ textAlign: "center" }}>
              <ChampionAvatar ckey={opponent} type={oppEntry.type} champion={oppChamp} size={72} />
              <div style={{ fontWeight: 700, marginTop: 8 }}>{duelMeta?.name ?? oppEntry.name}</div>
              <div className="mono" style={{ fontSize: 10, color: col }}>
                {duelMeta?.handle ? `@${duelMeta.handle}` : "LADDER AGENT"} · L{levelFor(oppChamp.xp).level}
              </div>
            </div>
          </div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 8 }}>
            PLACE A BET (optional) · win 2× your stake
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <button className={betSide === "me" ? "btn btn-primary" : "btn"} style={{ ["--ac" as string]: "var(--good)" }} onClick={() => setBetSide(betSide === "me" ? null : "me")}>
              back {ownedEntry.name}
            </button>
            <button className={betSide === "opp" ? "btn btn-primary" : "btn"} style={{ ["--ac" as string]: "var(--bad)" }} onClick={() => setBetSide(betSide === "opp" ? null : "opp")}>
              back {duelMeta?.name ?? oppEntry.name}
            </button>
            {betSide && (
              <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                {[25, 50, 100].map((n) => (
                  <button key={n} className={betAmt === n ? "btn btn-primary" : "btn"} style={{ ["--ac" as string]: "var(--gold)", opacity: crowns < n ? 0.4 : 1, display: "inline-flex", alignItems: "center", gap: 3 }} disabled={crowns < n} onClick={() => setBetAmt(n)}>
                    {n} <Crown size={12} strokeWidth={2.2} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn btn-primary" style={{ ["--ac" as string]: "var(--gold)", width: "100%", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onFight}>
            <FightIcon size={18} strokeWidth={2.2} />
            Fight {duelMeta?.name ?? oppEntry.name}
            {betSide && <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>(staking {betAmt} <Crown size={13} strokeWidth={2.2} />)</span>}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "var(--overlay)", backdropFilter: "blur(7px)", zIndex: 50, padding: 16 }}>
      <div className="panel pop" style={{ ["--ac" as string]: "var(--gold)", width: "min(620px, 95vw)", maxHeight: "90vh", overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>House sparring pit</div>
          <button onClick={onClose} aria-label="Close" style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "grid", placeItems: "center", lineHeight: 0 }}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, lineHeight: 1.55 }}>
          Practice against a <b>House First Mind</b> in the plaza pit. Ranked ladder fights only happen on the Tower — climb to each agent.
        </div>
        <div className="mono" style={{ fontSize: 11, color: "var(--muted2)", marginTop: 6 }}>
          You field <b style={{ color: TYPE_COLOR[ownedEntry.type] }}>{ownedEntry.name}</b>.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "16px 0" }}>
          {opps.map((r) => {
            const col = TYPE_COLOR[r.type];
            const on = opponent === r.key;
            const c = get(r.key);
            return (
              <button
                key={r.key}
                onClick={() => setOpponent(r.key)}
                className="panel"
                style={{ ["--ac" as string]: col, padding: "8px 12px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderColor: on ? col : "var(--line)", textAlign: "left", width: "100%" }}
              >
                <ChampionAvatar ckey={r.key} type={r.type} champion={c} size={40} />
                <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                <div className="mono" style={{ marginLeft: "auto", display: "flex", alignItems: "baseline", gap: 12, fontSize: 11, flexShrink: 0 }}>
                  <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4, color: col, fontWeight: 700 }}>
                    <span style={{ fontSize: 8, letterSpacing: 1, color: "var(--muted2)" }}>SL</span>
                    {skillLevel(c)}
                  </span>
                  <span style={{ color: "var(--muted)" }}>{skillCount(c)} skills</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* betting */}
        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 8 }}>
          PLACE A BET (optional) · win 2× your stake
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <button className={betSide === "me" ? "btn btn-primary" : "btn"} style={{ ["--ac" as string]: "var(--good)" }} onClick={() => setBetSide(betSide === "me" ? null : "me")}>
            back {ownedEntry.name}
          </button>
          <button className={betSide === "opp" ? "btn btn-primary" : "btn"} style={{ ["--ac" as string]: "var(--bad)" }} disabled={!oppEntry} onClick={() => setBetSide(betSide === "opp" ? null : "opp")}>
            back {oppEntry?.name ?? "opponent"}
          </button>
          {betSide && (
            <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
              {[25, 50, 100].map((n) => (
                <button key={n} className={betAmt === n ? "btn btn-primary" : "btn"} style={{ ["--ac" as string]: "var(--gold)", opacity: crowns < n ? 0.4 : 1, display: "inline-flex", alignItems: "center", gap: 3 }} disabled={crowns < n} onClick={() => setBetAmt(n)}>
                  {n} <Crown size={12} strokeWidth={2.2} />
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="btn btn-primary" style={{ ["--ac" as string]: "var(--gold)", width: "100%", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} disabled={!opponent} onClick={onFight}>
          <FightIcon size={18} strokeWidth={2.2} />
          {opponent ? "Fight!" : "pick an opponent"}
          {betSide && <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>(staking {betAmt} <Crown size={13} strokeWidth={2.2} />)</span>}
        </button>
      </div>
    </div>
  );
}

// The live tug-of-war. Side A fills from the left; the bar surges with every
// hard bar and drifts back in a lull — so the turning point is something you
// watch happen, not just read about after.
function MomentumMeter({ momentum, surge, aName, bName, aColor, bColor, isMobile }: {
  momentum: number;
  surge: "a" | "b" | null;
  aName?: string;
  bName?: string;
  aColor: string;
  bColor: string;
  isMobile: boolean;
}) {
  const frac = Math.max(0.02, Math.min(0.98, (momentum + 100) / 200)); // 0 = all B, 1 = all A
  return (
    <div style={{ marginTop: 8, width: isMobile ? "86vw" : 420, maxWidth: "94vw", marginInline: "auto", pointerEvents: "none" }}>
      <div className="mono" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 9, letterSpacing: 1, marginBottom: 3, gap: 8 }}>
        <span style={{ color: aColor, fontWeight: surge === "a" ? 800 : 600, textShadow: "0 1px 4px #000", opacity: surge === "b" ? 0.55 : 1, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 3 }}>
          {surge === "a" && <Flame size={11} strokeWidth={2.4} />}{aName}
        </span>
        <span style={{ color: surge ? "var(--gold)" : "var(--muted2)", letterSpacing: 1.5, whiteSpace: "nowrap" }}>{surge ? "ON A ROLL" : "MOMENTUM"}</span>
        <span style={{ color: bColor, fontWeight: surge === "b" ? 800 : 600, textShadow: "0 1px 4px #000", opacity: surge === "a" ? 0.55 : 1, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 3 }}>
          {bName}{surge === "b" && <Flame size={11} strokeWidth={2.4} />}
        </span>
      </div>
      <div style={{ position: "relative", height: 9, borderRadius: 5, overflow: "hidden", background: bColor, boxShadow: surge ? `0 0 14px -3px ${surge === "a" ? aColor : bColor}` : "none" }}>
        <div style={{ position: "absolute", inset: 0, width: `${Math.round(frac * 100)}%`, background: aColor, transition: "width .55s cubic-bezier(.25,1,.4,1)" }} />
        <div style={{ position: "absolute", left: "50%", top: -2, bottom: -2, width: 2, background: "rgba(255,255,255,.6)", transform: "translateX(-1px)" }} />
      </div>
    </div>
  );
}

function MatchHud(props: {
  bout: ReturnType<typeof useBout>;
  owned: string;
  opponent: string;
  foeMeta?: { name: string; handle?: string } | null;
  foeType?: CreatureType;
  byKey: Record<string, RosterEntry>;
  get: (k: string) => Champion;
  result: { won: boolean; crowns: number; betWon: boolean | null; ladders: string[]; ratingDelta: number; leveledTo: number | null; learned: string | null; globalDelta: number | null; globalRating: number | null; home: boolean } | null;
  onClose: () => void;
  isMobile: boolean;
}) {
  const { bout, owned, opponent, foeMeta, foeType, byKey, get, result, onClose, isMobile } = props;
  const t = bout.turn;
  const a = byKey[owned];
  const b = byKey[opponent];
  const aName = a?.name ?? owned;
  const bName = foeMeta?.name ?? b?.name ?? opponent;
  const bColor = foeType ? TYPE_COLOR[foeType] : b ? TYPE_COLOR[b.type] : "var(--muted2)";
  const [copied, setCopied] = useState(false);
  const share = () => {
    const c = get(owned);
    const lvl = levelFor(c.xp).level;
    const p = new URLSearchParams({
      sl: String(skillLevel(c)),
      sk: String(skillCount(c)),
      lv: String(lvl),
      t: tierFor(lvl).name,
      d: doctrine(c, lvl),
      w: String(c.wins),
      l: String(c.losses),
    });
    const url = `${window.location.origin}/c/${owned}?${p.toString()}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: isMobile ? 56 : 70,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          padding: "0 16px",
          pointerEvents: "none",
          zIndex: 40,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "min(640px, 94vw)" }}>
          <div className="mono" style={{ fontSize: isMobile ? 11 : 12, color: "var(--gold)", letterSpacing: 1 }}>
            {aName} <span style={{ color: "var(--muted2)" }}>vs</span> {bName}
          </div>
          {bout.start && (
            <div style={{ fontStyle: "italic", color: "var(--ink)", marginTop: 2, fontSize: isMobile ? 13 : 15, textShadow: "0 2px 8px #000", lineHeight: 1.35 }}>
              &ldquo;{bout.start.topic}&rdquo;
            </div>
          )}
          {t && !result && (
            <MomentumMeter
              momentum={t.momentum}
              surge={t.surge ?? null}
              aName={aName}
              bName={bName}
              aColor={a ? TYPE_COLOR[a.type] : "var(--gold)"}
              bColor={bColor}
              isMobile={isMobile}
            />
          )}
        </div>
      </div>

      {t && !result && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            padding: isMobile ? "0 10px max(12px, env(safe-area-inset-bottom))" : "0 16px max(24px, env(safe-area-inset-bottom))",
            pointerEvents: "none",
            zIndex: 40,
          }}
        >
          <div
            className="panel pop"
            key={t.round}
            style={{
              width: "min(640px, 100%)",
              maxHeight: isMobile ? "38vh" : "none",
              overflowY: isMobile ? "auto" : "visible",
              padding: isMobile ? 12 : 16,
              pointerEvents: "auto",
              ["--ac" as string]: TYPE_COLOR[t.actor_type],
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span className="chip" style={{ borderColor: TYPE_COLOR[t.actor_type], color: TYPE_COLOR[t.actor_type] }}>
                {t.actor_name} → {t.move}
              </span>
              {t.info.crit && <span className="chip" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>★ HIGHLIGHT</span>}
              {t.info.se && <span className="chip" style={{ borderColor: "var(--good)", color: "var(--good)" }}>SUPER EFFECTIVE</span>}
              {t.dmg > 0 && <span className="mono" style={{ color: "var(--bad)", fontWeight: 700 }}>−{t.dmg}</span>}
            </div>
            <div style={{ fontStyle: "italic", fontSize: isMobile ? 14 : 15, margin: "8px 0 6px", lineHeight: 1.4, overflowWrap: "anywhere" }}>
              &ldquo;{t.line}&rdquo;
            </div>
            <div className="mono" style={{ fontSize: isMobile ? 10 : 11, color: "var(--muted)", lineHeight: 1.45, overflowWrap: "anywhere" }}>
              why › {t.why} <span style={{ color: "var(--muted2)", display: "inline-flex", alignItems: "center", gap: 4 }}>· <Scale size={11} strokeWidth={2} /> {t.ruling} (q={t.q.toFixed(2)})</span>
            </div>
          </div>
        </div>
      )}

      {result && (() => {
        const ac = result.won ? "var(--good)" : "var(--bad)";
        const hl = bout.end?.highlights?.[0];
        const hlLabel = hl ? (hl.kind === "ko" ? "THE FINISH" : hl.kind === "crit" ? "HARDEST BAR" : "TURNING POINT") : "";
        const rankDelta = result.globalDelta ?? result.ratingDelta;
        return (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "var(--overlay)", zIndex: 55, padding: 16 }}>
          {result.won && <Confetti accent="#f0a93a" count={70} originTop="34%" />}
          <div className={`panel ${result.won ? "cel-reveal" : "cel-shake"}`} style={{ ["--ac" as string]: ac, position: "relative", padding: 22, width: "min(380px, 92vw)", maxHeight: "90vh", overflow: "auto", textAlign: "center", boxShadow: `0 0 80px -30px ${ac}` }}>
            {/* header */}
            <div className="glow" style={{ fontSize: 28, fontWeight: 800, color: ac, letterSpacing: 1 }}>
              {result.won ? "VICTORY" : "DEFEAT"}
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              {bout.end?.winner_name} wins · {bout.end?.rounds} rounds
            </div>

            {/* the signature moment */}
            {hl && (
              <div style={{ margin: "14px 0", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.04)", border: "1px solid var(--line2)", textAlign: "left" }}>
                <div className="mono" style={{ fontSize: 8.5, letterSpacing: 1.5, color: "var(--gold)" }}>{hlLabel} · R{hl.round}</div>
                <div style={{ fontStyle: "italic", fontSize: 13.5, marginTop: 4, lineHeight: 1.4 }}>&ldquo;{hl.line}&rdquo;</div>
                <div className="mono" style={{ fontSize: 9.5, color: "var(--muted2)", marginTop: 3 }}>— {hl.actor_name}</div>
              </div>
            )}

            {/* reward — crowns + wager, one line */}
            {(result.crowns !== 0 || result.betWon !== null) && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, margin: "12px 0" }}>
                {result.crowns !== 0 && (
                  <span style={{ fontSize: 24, fontWeight: 800, color: result.crowns >= 0 ? "var(--gold)" : "var(--bad)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {result.crowns >= 0 ? "+" : ""}{result.crowns} <Crown size={20} strokeWidth={2.2} />
                  </span>
                )}
                {result.betWon !== null && (
                  <span className="chip" style={{ borderColor: result.betWon ? "var(--good)" : "var(--bad)", color: result.betWon ? "var(--good)" : "var(--bad)" }}>
                    bet {result.betWon ? "won" : "lost"}
                  </span>
                )}
                {result.home && (
                  <span className="chip" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>
                    home advantage · +{HOME_WIN_BONUS}
                  </span>
                )}
              </div>
            )}

            {/* one tidy progress strip — XP, skills, rank, reader, level-up */}
            <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 4 }}>
              {result.leveledTo && (
                <span className="chip" style={{ borderColor: "var(--gold)", color: "var(--gold)", fontSize: 11 }}>LEVEL UP · L{result.leveledTo}</span>
              )}
              {result.ladders.map((l) => (
                <span key={l} className="chip" style={{ borderColor: "var(--line)", color: "var(--muted)", fontSize: 11 }}>{l}</span>
              ))}
              {rankDelta !== null && rankDelta !== undefined && (
                <span className="chip" style={{ borderColor: "var(--line)", color: rankDelta >= 0 ? "var(--good)" : "var(--bad)", fontSize: 11 }}>
                  Ladder {rankDelta >= 0 ? "+" : ""}{rankDelta}
                </span>
              )}
            </div>
            {result.learned && (
              <div className="mono" style={{ fontSize: 10, color: "var(--muted2)", fontStyle: "italic", marginTop: 9 }}>{result.learned}</div>
            )}

            {/* actions */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
              <button className="btn" style={{ ["--ac" as string]: "var(--gold)", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={share}>
                {copied ? <Check size={15} strokeWidth={2.4} /> : <ArrowUpRight size={15} strokeWidth={2.2} />}
                {copied ? "link copied" : "share card"}
              </button>
              <button className="btn btn-primary" style={{ ["--ac" as string]: ac }} onClick={onClose}>
                back to The Grounds
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </>
  );
}
