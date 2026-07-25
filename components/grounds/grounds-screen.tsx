"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Crown, Globe, Mountain, Swords, Moon, Ban, X, Swords as FightIcon, ArrowUpRight, ArrowUp, Check, Gem, Flame, Scale, FastForward, FlaskConical, Rocket } from "lucide-react";
import type { AgentConfig, BattleEnd, Champion, CreatureType, Recipe, RosterEntry, Style, TowerAgent, WarState } from "@/lib/types";
import { TYPE_COLOR, levelFor, tierFor, doctrine, blankStyle, accrue, dominant, skillLevel, skillCount, blank } from "@/lib/evolve/progression";
import { ratingOf } from "@/lib/evolve/elo";
import { sideParams } from "@/lib/recipe-params";
import { appearanceOf } from "@/lib/evolve/appearance";
import { useChampions, TRAIN_COST, FRAGMENT_BUY, FRAGMENT_SELL, type EvolutionFlash } from "@/store/champions";
import { GROUNDS_WIN_REWARD, HOME_WIN_BONUS } from "@/lib/economy";
import { describeDial, imprintDayIndex, lessonsForSession } from "@/lib/imprints";
import type { Strat } from "@/lib/types";
import { TRIALS } from "@/lib/flags";
import { useBout } from "@/components/arena/use-bout";
import { ChampionAvatar } from "@/components/champion-avatar";
import { ChampionPortrait } from "@/components/render/champion-portrait";
import { FirstRun } from "@/components/intro/first-run";
import { FirstDuelHubCta, FirstDuelOverlay, type FirstDuelPhase } from "@/components/intro/first-duel";
import { DoctrineDial } from "@/components/shared/doctrine-dial";
import { STORAGE } from "@/lib/brand";
import { KEEPERS_PLAYABLE } from "@/lib/features";
import {
  firstDuelOpponent,
  firstDuelStarters,
  guestLoanerKey,
  isFirstDuelComplete,
  markFirstDuelComplete,
  FIRST_FIGHT_WORLD,
  previewRookieChampion,
  QUICK_START_STRAT,
} from "@/lib/first-duel";
import { noteGuestClimbDepth } from "@/lib/guest-climb";
import { ROSTER } from "@/lib/engine/roster";
import { practiceOpponentKeys } from "@/lib/scene-population";
import { warmGroundsChunk } from "@/lib/render/preload-grounds";
import { READER_COPY } from "@/lib/player-copy";
import { getOwnerToken, getHandle } from "@/lib/owner";
import { track } from "@/lib/track";
import type { GroundChampion, MatchView, NearTarget, WorldLife } from "@/components/grounds/world";
import { WORLDS, DEFAULT_WORLD, worldById, CONCORD_GATES, NAV_WORLDS, REGION_WORLDS, FIRST_GUIDE_WORLD } from "@/components/grounds/worlds";
import { saveWorldPose, loadWorldPose, saveLastWorld, loadLastWorld } from "@/components/grounds/world-persist";
import type { GameSession, VenueId } from "@/components/grounds/venues";
import {
  VENUES,
  CONCORD_VENUE_SPOTS,
  awayFromCircuitPortal,
  awayFromReturnPortal,
  regionEntrancePose,
  safeWildPose,
} from "@/components/grounds/venues";
import { AMPHI_SPAWN, AMPHI_SPAWN_HEADING } from "@/components/grounds/amphitheatre";
import { worldGoals, type WorldGoal, type GoalKind } from "@/components/grounds/goals";
import { regionGrowth } from "@/lib/lore/growth";
import { currentSeason, currentSeasonNumber } from "@/lib/lore/season";
import { seasonTurnBeat } from "@/lib/lore/saga";
import { PlayerHub } from "@/components/grounds/player-hub";
import { AmbienceEngine } from "@/components/grounds/ambience";
import { RivalCard } from "@/components/grounds/rival-card";
import {
  currentRival,
  loadRivalMemory,
  maybeEscalateRival,
  recordRivalDuel,
  rivalChallengeBeat,
  rivalResultBeat,
  rivalVoiceType,
  type Rival,
  type RivalMemory,
} from "@/lib/lore/rival";
import { FOUNDING_REGIONS, FORCES as FORCE_LORE, wheelNeighbors } from "@/lib/lore/canon";
import { ForcesChain } from "@/components/lore/forces-wheel";
import { trainerLevel, forceMeta, TRAINER_XP } from "@/lib/evolve/trainer";
import { daylightBiome, BIOMES } from "@/components/grounds/biomes";
import { useTheme } from "@/lib/theme";
import { landmarksOf, discoveryNodes, dayKey } from "@/components/grounds/landmarks";
import { Compass, type Pose } from "@/components/grounds/compass";
import { ObjectiveToasts } from "@/components/grounds/objective-toasts";
import { roundReward, gauntletQueue, tribunalDraw } from "@/lib/scenarios/registry";
import { GauntletBriefing, GauntletInterstitial, GauntletResult, type GauntletRun } from "@/components/grounds/gauntlet";
import { TribunalBriefing, TribunalMatchBanner } from "@/components/grounds/tribunal";
import { RenderBoundary, RenderNotice, clearGpuStatusCache, gpuStatus, resetWebglHardFailed, useWebglHardFailed } from "@/components/grounds/render-guard";
import { ControlsGuide } from "@/components/grounds/controls-guide";
import { SettingsOverlay } from "@/components/grounds/settings-overlay";
import { useSettings } from "@/store/settings";
import { startGamepad, getPad } from "@/lib/gamepad";
import { setSfxVolume, evolveStinger, jumpBeep, pledgeSfx, stopJet, jetFallSfx, badLuckSfx, rewardSfx } from "@/lib/sfx";
import { setCreatureVoiceVolume } from "@/lib/creature-voice";
import { setMood, resolveAmbienceMood, setAmbienceVolume, setAmbienceIntensity, ambienceFlourish, duckAmbience } from "@/lib/ambience-bus";
import { GuardianGame } from "@/components/guardian/game";
import { SeasonBanner } from "@/components/lore/season-banner";
import { Celebration, Confetti, outcomeSfx } from "@/components/grounds/celebration";
import { ArrivalSequence } from "@/components/grounds/arrival";
import { CharacterBeat } from "@/components/grounds/character-beat";
import { TravelVeil, type TravelCard } from "@/components/grounds/travel-veil";
import {
  championAfterFight,
  championGreeting,
  championImprintAskScript,
  championRankedFinale,
  championTypeForKey,
  championWakeScript,
  firstFlightScript,
  keeperColor,
  keeperCrackBeat,
  keeperIntro,
} from "@/lib/lore/character-beats";
import { primeCreature, speakCreatureType } from "@/lib/creature-voice";
import { companionReaction, type CompanionEvent } from "@/lib/lore/companion";
import { ClanSheet } from "@/components/grounds/clan-sheet";
import { ClanCinematic, type ClanCeremony } from "@/components/grounds/clan-cinematic";
import { CLAN_R, concordClanSpots } from "@/components/grounds/concord";
import { usePrefersReducedMotion } from "@/components/arena/juice";
import { DailySheet } from "@/components/grounds/daily-sheet";
import { CircuitHud, type CircuitPhase, type CircuitFailReason, type CircuitBoardEntry } from "@/components/grounds/circuit-hud";
import { ClimbProveGate } from "@/components/grounds/climb/prove-gate";
import {
  buildShareGhostPaths,
  challengeTipFurthestZ,
  climbChallengeMark,
  createClimbChallengeUrl,
  isChallengeTipSectorClear,
  resolveClimbChallengeFromLocation,
  type ClimbChallenge,
  type ClimbChallengeMark,
} from "@/lib/climb-challenge";
import {
  ALTITUDE_KEY_SECTOR,
  ascentCraftCrowns,
  ascentDepthXp,
  clearAscentSessionMods,
  lifeRestoreOnReachClear,
  needsAltitudeProve,
  setAscentSessionMods,
} from "@/lib/ascent-rules";
import { ChallengeOvertakeToast } from "@/components/grounds/climb/challenge-overtake-toast";
import {
  evaluateLadder,
  hitsRankLock,
  isBrokerOpen,
  isScoutOpen,
  isWorldOpen,
  reachLockCopy,
} from "@/lib/unlock-ladder";
import {
  earnedTraitsAvailable,
  loadoutLine,
  resolveFlightModifiers,
  resolveLoadout,
  wingInputFrom,
  type FlightModifiers,
  type WingTraitId,
} from "@/lib/wing-traits";
import {
  CLEAR_SKY,
  dailyFlightCondition,
  mergeRunMods,
  type RunMods,
} from "@/lib/conditions";
import { applyCareerToMods, readCareer } from "@/lib/career-friction";
import {
  EXPEDITION_CROWN_MULT,
  EXPEDITION_XP_MULT,
  isExpeditionOpen,
  isExpeditionRunBetter,
  loadExpeditionPersonalBest,
  saveExpeditionPersonalBest,
  thisWeekExpedition,
} from "@/lib/expeditions";
import { NextCard } from "@/components/director/next-card";
import {
  firstLightChestCrowns,
  HUNDRED_CHEST_CROWNS,
  SCOUT_CROWN_MULT,
  SCOUT_XP_MULT,
  scoutStartSector,
} from "@/lib/climb-campaign";
import { crownCacheCrowns, rollCrownCache, type CrownCache } from "@/components/grounds/climb/crown-cache";
import { consumeFlightTeach, goldPayoutLine } from "@/components/grounds/climb/flight-teach";
import { sectorModifier } from "@/components/grounds/climb/modifiers";
import { sectorFlightCruise } from "@/components/grounds/climb/flight-cruise";
import { ghostPathForSector, ghostPathHasSamples, type ClimbGhostSample, type ClimbGhostSectors } from "@/lib/climb-ghost";
import {
  desktopCircuitSector,
  DESKTOP_CIRCUIT_COUNT,
  toClimbCanonical,
  reachTheme,
  reachThemeByIndex,
} from "@/components/grounds/climb/desktop-adapter";
import { CIRCUIT_LIVES, formatCircuitMs } from "@/components/grounds/circuit";
import type { CircuitGhostPose } from "@/components/grounds/circuit-ghost";
import {
  loadCircuitPersonalBest,
  saveCircuitPersonalBest,
  isCircuitRunBetter,
  type CircuitPersonalBest,
} from "@/components/grounds/circuit-tracks";
import { sectorHazards } from "@/components/grounds/climb/hazards";
import { DOCK_H, PLAY_HREF } from "@/lib/play-nav";

const World = dynamic(() => import("@/components/grounds/world"), {
  ssr: false,
  // No copy — chunk load should feel like the sky opening, not a status line.
  loading: () => <div aria-hidden style={{ position: "absolute", inset: 0, background: "#08070f" }} />,
});

// Where a player drops into the Concord on their first landing — the outer
// threshold of the gate-ring (z out past the gates), so they arrive looking in
// across the plaza toward the Vaultgates. [x, z].
const CONCORD_SPAWN: [number, number] = [0, 52];

// Where you reappear when you return to the Concord: a few steps INTO the plaza
// from the very door you left through — a region's Vaultgate or a game's venue
// portal — facing inward across the seal. Reads as "you just walked out of that
// door," so the hub arrival mirrors the door you took to leave. Returns null if
// the origin has no Concord door (nothing to align to).
function concordDoorArrival(opts: { world?: string; venue?: VenueId }): { x: number; z: number; heading: number } | null {
  const STEP_IN = 5; // metres inside the arch — clear of it, standing in the plaza
  let angle: number;
  let dist: number;
  if (opts.venue) {
    const s = CONCORD_VENUE_SPOTS.find((v) => v.venue === opts.venue);
    if (!s) return null;
    angle = s.angle;
    dist = s.dist;
  } else if (opts.world) {
    const g = CONCORD_GATES.find((x) => x.world === opts.world);
    if (!g) return null;
    angle = g.angle;
    dist = g.dist;
  } else {
    return null;
  }
  const d = Math.max(2, dist - STEP_IN);
  const x = Math.cos(angle) * d;
  const z = Math.sin(angle) * d;
  // heading looks from the door back toward the Concord centre (the seal)
  return { x, z, heading: Math.atan2(-x, -z) };
}

// Minimum time the pre-picker "Summoning your champions…" beat stays on screen,
// so it's always readable even when the roster is already cached.
/** Brief hold so pick never flashes an empty roster — keep short (mobile-like). */
const MIN_SUMMON_MS = 900;

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

export default function GroundsScreen({
  gpuLite = false,
  /** `/ascent` door — open the Circuit venue (desktop body of the Ascent). */
  ascentEntry = false,
}: {
  gpuLite?: boolean;
  ascentEntry?: boolean;
}) {
  const router = useRouter();
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
  const [keeperIntroPending, setKeeperIntroPending] = useState<{ level: number; name: string; title: string } | null>(null);
  const [wakeKey, setWakeKey] = useState<string | null>(null);
  /** Desktop first-flight vignette after wake (mobile already has this in MobileAdopt). */
  const [flightKey, setFlightKey] = useState<string | null>(null);
  /** One-shot Imprint ask after first Concord → region land. */
  const [imprintTease, setImprintTease] = useState(false);
  const [companionLine, setCompanionLine] = useState<string | null>(null);
  const [companionEmote, setCompanionEmote] = useState<string | null>(null);
  const [companionAct, setCompanionAct] = useState(0);
  const companionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const companionEmoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactCooldown = useRef(0);
  const peakBand = useRef(0);
  const prevWorldId = useRef<string | null>(null);
  const prevNearKind = useRef<string | null>(null);
  const [pendingBeat, setPendingBeat] = useState<{ key: string; won: boolean; opponent: string; ranked: boolean } | null>(null);
  const [companionBeat, setCompanionBeat] = useState<{ key: string; kicker: string; lines: { speaker: string; text: string }[] } | null>(null);
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
  // Post-claim from /ascent must NOT reopen a leftover region — Concord + Grounds-gate guide only.
  const [worldId, setWorldId] = useState(() => {
    try {
      if (typeof window !== "undefined" && sessionStorage.getItem(STORAGE.postClaimGuide) === "1") {
        return "concord";
      }
    } catch {}
    return loadLastWorld() ?? DEFAULT_WORLD.id;
  });
  const world = useMemo(() => worldById(worldId), [worldId]);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  /** Mount Handler at this wilds pose after leaving a venue (Ascent portal exit). */
  const [wildResume, setWildResume] = useState<{ x: number; z: number; y?: number; heading?: number } | null>(null);
  const activeVenue = gameSession?.venue ?? null;
  const venueHostWorldId = gameSession?.hostWorldId ?? worldId;
  const inVenue = !!activeVenue;
  const theme = useTheme();
  // declared up here (not with the rest of the Circuit state below) because the
  // venue biome reads it to pick the current sector's Reach sky
  const [circuitSectorIdx, setCircuitSectorIdx] = useState(0);
  const biome = useMemo(() => {
    // The Circuit wears the CURRENT SECTOR's Reach sky (the shared Ascent skins,
    // docs/circuit-world.md §1) — the venue remounts per sector (its <World> key
    // carries the sector index), so this is the desktop sky-shift. Reach recipes
    // already pick day/night deliberately, so don't re-apply the OS light grade.
    if (activeVenue === "circuit") return reachTheme(circuitSectorIdx).biome;
    const skin = activeVenue === "amphitheatre" ? BIOMES[4] : world.biome;
    return theme === "light" ? daylightBiome(skin) : skin;
  }, [world.biome, activeVenue, venueHostWorldId, theme, circuitSectorIdx]);
  const scenario = world.scenario;
  const isHub = world.kind === "hub";
  const [gRun, setGRun] = useState<GauntletRun | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const [firstDuelPhase, setFirstDuelPhase] = useState<FirstDuelPhase | null>(null);
  /** Guest Ascent ready — skip pick; fly a loaner until RUN OVER claim. */
  const [guestAscentReady, setGuestAscentReady] = useState(false);
  const guestEnterArmed = useRef(false);
  /** Claim on /ascent — block Circuit auto-enter for the frame before router.replace. */
  const leaveAscentAfterClaim = useRef(false);
  // Hold the "Summoning…" beat on screen long enough to read.
  // On a warm load the roster resolves almost instantly, so without a floor the
  // banner only flashed for a frame before the Ascent took over.
  const summonStartedAt = useRef<number | null>(null);
  const [firstDuelPick, setFirstDuelPick] = useState<string | null>(null);
  /** Weekly starter loaner — shared by guest Ascent flight + Exit→claim picker. */
  const loanerKey = useMemo(() => guestLoanerKey(getOwnerToken() || "guest"), []);
  const [firstDuelEvolve, setFirstDuelEvolve] = useState<{
    before: Champion;
    after: Champion;
    key: string;
    type: CreatureType;
  } | null>(null);
  const [modeLockToast, setModeLockToast] = useState<string | null>(null);
  const [travelCard, setTravelCard] = useState<TravelCard | null>(null);
  const [seasonBeat, setSeasonBeat] = useState(false);
  const [rival, setRival] = useState<Rival | null>(null);
  const [rivalMemory, setRivalMemory] = useState<RivalMemory | null>(null);
  // pre/post-duel rival cinematic: "before" gates the launch, "after" reports it
  const [rivalBeat, setRivalBeat] = useState<{ phase: "before" | "after"; won?: boolean } | null>(null);
  const inRivalDuel = useRef(false);
  // Promotion Trials (TRIALS flag): a pending nomination to earn the next tier,
  // and a guard so its bout's onEnd pays off with claimTier instead of coasting.
  const [trialNom, setTrialNom] = useState<{ key: string; tier: string } | null>(null);
  const inTrialDuel = useRef(false);
  const evolveBeforeRef = useRef<Champion | null>(null);
  const inFirstDuelFight = useRef(false);
  const firstFightWorldRef = useRef<string | null>(null);
  // mid-claim: a champion was picked but the arrival cinematic is still running,
  // so we hold off mounting the world UI until the veil lifts.
  const [claiming, setClaiming] = useState<string | null>(null);
  const [showChronicle, setShowChronicle] = useState(false);
  const [goalCoach, setGoalCoach] = useState(false);
  /** Hub → region (or first land): replay Peak/Depth/Secret toasts if any left. */
  const arrivedFromHubRef = useRef(true);
  const regionGoalIntroducedRef = useRef<Set<string>>(new Set());
  const [concordCoach, setConcordCoach] = useState(false);
  /** Opaque cover across /ascent → /grounds remount so the empty world never flashes. */
  const [claimArriveCover, setClaimArriveCover] = useState(false);
  /** Soft nudge in the first region after Imprint — don't dump the full Train sheet. */
  const [regionRaiseCoach, setRegionRaiseCoach] = useState(false);
  /** After first Train session — point at the central Arena to fight. */
  const [arenaFightCoach, setArenaFightCoach] = useState(false);
  /** 0 = Reader identity, 1 = walk to train pad — before gate coach. */
  const [readerSplitStep, setReaderSplitStep] = useState<number | null>(null);
  // The gate nudge popup is tracked apart from the spotlight: "Skip" should only
  // clear this popup, while the Grounds gate stays lit until the player actually
  // takes a gate.
  const [guideNudge, setGuideNudge] = useState(true);
  // The first-ranked-win Clan invite — deferred so the choice arrives when
  // "join a team" actually means something. Shown once.
  const [clanInvite, setClanInvite] = useState(false);
  const clanInviteSeen = useRef(false);
  const [isTouch, setIsTouch] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [worldMenu, setWorldMenu] = useState(false);
  const [gpu, setGpu] = useState<ReturnType<typeof gpuStatus> | null>(null);
  const glCreateFailed = useWebglHardFailed();
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
    () => (isHub || inVenue ? [] : worldGoals(biome, season.n, growth?.featured ?? false)),
    [isHub, inVenue, biome, season, growth?.featured],
  );
  const doneGoals = useMemo(
    () => (store.goals.season === season.n ? store.goals.done : []),
    [store.goals, season],
  );
  const liveGoals = useMemo(
    () => allGoals.filter((g) => !doneGoals.includes(g.id)),
    [allGoals, doneGoals],
  );
  const peakGoalId = useMemo(() => allGoals.find((g) => g.kind === "peak")?.id ?? null, [allGoals]);
  const peakCleared = !!(peakGoalId && doneGoals.includes(peakGoalId));
  const [summitRevealNonce, setSummitRevealNonce] = useState(0);
  useEffect(() => {
    setSummitRevealNonce(0);
  }, [world.id]);

  // ── exploration: districts (compass + fast-travel) and discovery caches ──────
  const landmarks = useMemo(() => landmarksOf(biome), [biome]);
  const allNodes = useMemo(() => discoveryNodes(biome, dayKey()), [biome]);
  const claimedToday = useMemo(
    () => (nodeLedger.day === dayKey() ? nodeLedger.claimed : []),
    [nodeLedger],
  );
  // the Concord is a built, neutral hub — no wild caches there
  const liveNodes = useMemo(
    () => (isHub || inVenue ? [] : allNodes.filter((n) => !claimedToday.includes(n.id))),
    [isHub, inVenue, allNodes, claimedToday],
  );
  const poseRef = useRef<Pose>({ x: 0, z: 34, heading: Math.PI });
  const travelRef = useRef<((x: number, z: number, faceHeading?: number, y?: number) => void) | null>(null);
  // Portals cross by walking through — latch so exit/resume can't instantly re-enter.
  const portalAutoKey = useRef<string | null>(null);

  // ── The Circuit — 10-sector roguelike run ─────────────────────────────────
  const [circuitPhase, setCircuitPhase] = useState<CircuitPhase>("ready");
  const [circuitFailReason, setCircuitFailReason] = useState<CircuitFailReason>("fall");
  const [circuitRunMs, setCircuitRunMs] = useState(0);
  const [circuitSectorMs, setCircuitSectorMs] = useState(0);
  const [circuitCpPassed, setCircuitCpPassed] = useState(1);
  const [circuitPersonalBest, setCircuitPersonalBest] = useState<CircuitPersonalBest | null>(null);
  const [circuitBoard, setCircuitBoard] = useState<CircuitBoardEntry[]>([]);
  const [circuitBoardLoading, setCircuitBoardLoading] = useState(false);
  const [circuitLives, setCircuitLives] = useState(CIRCUIT_LIVES);
  const circuitLivesRef = useRef(CIRCUIT_LIVES);
  const [circuitGhost, setCircuitGhost] = useState<(CircuitGhostPose & { id: number }) | null>(null);
  const [circuitArriveNonce, setCircuitArriveNonce] = useState(0);
  const circuitGhostId = useRef(0);
  const circuitContinueTimers = useRef<number[]>([]);
  const circuitCpNext = useRef(1); // skip decorative start ring — first real gate is 1
  const circuitRunStart = useRef(0);
  const circuitSectorStart = useRef(0);
  /** Accumulated flying time only — excludes ready / continue / load gaps. */
  const circuitRunMsRef = useRef(0);
  /** Ghost-path samples in Climb-canonical space (interchangeable with mobile). */
  /** Per-sector ghost samples (canonical Climb space); t = ms since sector start. */
  const circuitSectorPathsRef = useRef<ClimbGhostSectors>([]);
  const circuitSectorSamplesRef = useRef<ClimbGhostSample[]>([]);
  const circuitSampleLastT = useRef(0);
  const [circuitChallenge, setCircuitChallenge] = useState<ClimbChallenge | null>(null);
  const [circuitChallengeDismissed, setCircuitChallengeDismissed] = useState(false);
  const [circuitChallengeResult, setCircuitChallengeResult] = useState<ClimbChallengeMark | null>(null);
  const [circuitOvertakeToast, setCircuitOvertakeToast] = useState(false);
  const [circuitShareMsg, setCircuitShareMsg] = useState<string | null>(null);
  /** Wall clock when the current Circuit run went live (ghost replay sync). */
  const [circuitGhostRunStartMs, setCircuitGhostRunStartMs] = useState(0);

  const clearCircuitContinueTimers = useCallback(() => {
    for (const id of circuitContinueTimers.current) window.clearTimeout(id);
    circuitContinueTimers.current = [];
  }, []);

  // Ranked / scout / weekly expedition (parity with mobile Climb).
  type CircuitRunMode = "ranked" | "scout" | "expedition";
  const [circuitRunMode, setCircuitRunMode] = useState<CircuitRunMode>("ranked");
  const [circuitScoutCamp, setCircuitScoutCamp] = useState(1);
  const [expedition] = useState(() => thisWeekExpedition());
  const circuitRunModeRef = useRef<CircuitRunMode>("ranked");
  const circuitStartSectorRef = useRef(0);
  circuitRunModeRef.current = circuitRunMode;
  circuitStartSectorRef.current = circuitRunMode === "scout" ? scoutStartSector(circuitScoutCamp) : 0;
  const circuitLayoutSeed = circuitRunMode === "expedition" ? expedition.seed : "";
  const circuitLayoutSeedRef = useRef(circuitLayoutSeed);
  circuitLayoutSeedRef.current = circuitLayoutSeed;
  const circuitRouteCap = circuitRunMode === "expedition" ? expedition.sectors : DESKTOP_CIRCUIT_COUNT;

  const campsLit = store.climb?.campsLit ?? 0;
  const bestSectors = store.climb?.bestSectors ?? 0;
  const expeditionOpen = isExpeditionOpen(bestSectors, campsLit);
  const climbHundred = !!store.climb?.hundred;
  const ascentReaches = Math.min(10, Math.max(0, campsLit));
  const ascentSigilAccent = ascentReaches > 0 ? reachThemeByIndex(ascentReaches - 1).accent : undefined;
  const trainerLvl = trainerLevel(store.trainerXp).level;
  const scoutRankOpen = isScoutOpen(trainerLvl, campsLit);
  const ownedWins = owned ? (store.get(owned).wins ?? 0) : 0;
  const ladder = evaluateLadder({
    trainerXp: store.trainerXp,
    wins: ownedWins,
    bestSectors,
    campsLit,
    rosterCount: store.roster?.length ? new Set([...(owned ? [owned] : []), ...store.roster]).size : owned ? 1 : 0,
    firstDuelDone: mounted ? isFirstDuelComplete() : true,
  });
  const rankLock = reachLockCopy(ladder.maxReaches, ladder.next);

  // Wing traits (Stage 2) + Conditions (Stage 3) — same resolve path as Climb.
  const [earnedPick, setEarnedPick] = useState<WingTraitId | null>(null);
  const [dayCondition] = useState(() => dailyFlightCondition());
  const wingInput = useMemo(() => {
    if (!owned) return null;
    return wingInputFrom(owned, store.get(owned), store.getRecipe(owned)?.strat, campsLit);
  }, [owned, store, campsLit, ownedWins]);
  const earnedOptions = useMemo(
    () => (wingInput ? earnedTraitsAvailable(wingInput) : []),
    [wingInput],
  );
  const wingLoadout = useMemo(
    () => (wingInput ? resolveLoadout(wingInput, earnedPick) : []),
    [wingInput, earnedPick],
  );
  const wingMods = useMemo(
    () => resolveFlightModifiers(wingLoadout),
    [wingLoadout],
  );
  const activeCondition =
    circuitRunMode === "expedition" && owned
      ? expedition.condition
      : circuitRunMode === "ranked" && owned
        ? dayCondition
        : CLEAR_SKY;
  const sagaEvents = owned ? store.events[owned] : undefined;
  const career = useMemo(
    () => (owned ? readCareer(store.get(owned), sagaEvents) : null),
    [owned, store, sagaEvents, ownedWins],
  );
  const runMods = useMemo(() => {
    const base = mergeRunMods(wingMods, activeCondition);
    return career ? applyCareerToMods(base, career) : base;
  }, [wingMods, activeCondition, career]);
  const runModsRef = useRef<RunMods>(runMods);
  runModsRef.current = runMods;
  const scoutUnlocked = scoutRankOpen && !runMods.banScout;
  const wingLivesCap = useRef(CIRCUIT_LIVES);

  // Sector spice (Swift / Duskfall / …) — same map as mobile Climb.
  const circuitModifier = useMemo(
    () => (activeVenue === "circuit" ? sectorModifier(circuitSectorIdx) : null),
    [activeVenue, circuitSectorIdx],
  );

  const applyWingSession = useCallback((mods: FlightModifiers, refillLives: boolean, sectorSpeedMult = 1) => {
    setAscentSessionMods({
      cruiseSink: mods.cruiseSink,
      cruiseGlide: mods.cruiseGlide,
      diveSink: mods.diveSink,
      diveGlide: mods.diveGlide,
      stumbleVy: mods.stumbleVy,
      stumbleLockS: mods.stumbleLockS,
      stumbleImmuneS: mods.stumbleImmuneS,
      cruiseSpeedMult: mods.cruiseSpeedMult * sectorSpeedMult,
    });
    if (refillLives) {
      circuitLivesRef.current = mods.lives;
      setCircuitLives(mods.lives);
    }
    wingLivesCap.current = mods.lives;
  }, []);

  useEffect(() => {
    if (activeVenue !== "circuit") return;
    const atFull = circuitLivesRef.current >= wingLivesCap.current;
    applyWingSession(runMods, circuitPhase === "ready" && atFull, circuitModifier?.speedMult ?? 1);
  }, [runMods, circuitPhase, activeVenue, applyWingSession, circuitModifier]);

  useEffect(() => () => clearAscentSessionMods(), []);

  // Crown cache mid-gap pickup (shared with Climb) — optional, never a gate prize.
  const [crownCache, setCrownCache] = useState<CrownCache | null>(null);
  const crownCacheRef = useRef<CrownCache | null>(null);
  const bonusCrowns = useRef(0);
  const circuitStumbleCount = useRef(0);
  const circuitGoldRings = useRef(0);
  const [circuitClearSnap, setCircuitClearSnap] = useState<{
    mastery: { stumbles: number; goldRings: number; livesLeft: number; maxLives: number };
    firstHundred: boolean;
  } | null>(null);

  const circuitTrack = useMemo(
    () => desktopCircuitSector(circuitSectorIdx, circuitLayoutSeed),
    [circuitSectorIdx, circuitLayoutSeed],
  );
  const circuitReach = useMemo(() => reachTheme(circuitSectorIdx), [circuitSectorIdx]);
  const circuitCruise = useMemo(
    () => sectorFlightCruise(circuitSectorIdx) * (circuitModifier?.speedMult ?? 1),
    [circuitSectorIdx, circuitModifier],
  );

  useEffect(() => {
    const g = rollCrownCache(circuitTrack.checkpoints, runModsRef.current.goldOddsMult, circuitCruise);
    crownCacheRef.current = g;
    setCrownCache(g);
  }, [circuitTrack, circuitCruise]);

  useEffect(() => {
    if (!scoutUnlocked && circuitRunMode === "scout") {
      setCircuitRunMode("ranked");
      setCircuitScoutCamp(1);
    } else if (scoutUnlocked) {
      setCircuitScoutCamp((c) => Math.min(Math.max(1, c), campsLit));
    }
  }, [campsLit, circuitRunMode, scoutUnlocked]);

  useEffect(() => {
    if (!expeditionOpen && circuitRunMode === "expedition") setCircuitRunMode("ranked");
  }, [expeditionOpen, circuitRunMode]);

  // Condition + sector modifier ambience (Silent Sky / Silent run) — Climb parity.
  useEffect(() => {
    if (activeVenue !== "circuit") return;
    setAmbienceIntensity(circuitModifier?.ambience ?? runMods.ambience ?? 0.32);
  }, [activeVenue, runMods.ambience, circuitModifier]);
  // the same pure-time hazards the mobile Climb fields for this sector (empty in
  // the early Reaches / breather beats) — rendered + collided against on desktop
  const circuitHazards = useMemo(
    () =>
      activeVenue === "circuit" ? sectorHazards(circuitSectorIdx, circuitTrack, circuitLayoutSeed) : [],
    [activeVenue, circuitSectorIdx, circuitTrack, circuitLayoutSeed],
  );
  const [circuitTeachMsg, setCircuitTeachMsg] = useState<string | null>(null);
  const circuitTeachTimer = useRef<number | null>(null);
  const flashCircuitTeach = useCallback((msg: string | null, ms = 3400) => {
    if (!msg) return;
    setCircuitTeachMsg(msg);
    if (circuitTeachTimer.current != null) window.clearTimeout(circuitTeachTimer.current);
    circuitTeachTimer.current = window.setTimeout(() => setCircuitTeachMsg(null), ms);
  }, []);
  useEffect(() => () => {
    if (circuitTeachTimer.current != null) window.clearTimeout(circuitTeachTimer.current);
  }, []);
  useEffect(() => {
    if (activeVenue !== "circuit") return;
    if (circuitPhase !== "ready" && circuitPhase !== "running") return;
    if (circuitSectorIdx === 9) flashCircuitTeach(consumeFlightTeach("gateTrial"), 4200);
  }, [activeVenue, circuitSectorIdx, circuitPhase, flashCircuitTeach]);
  useEffect(() => {
    if (activeVenue !== "circuit") return;
    if (circuitPhase !== "ready" && circuitPhase !== "running") return;
    if (circuitHazards.length > 0) flashCircuitTeach(consumeFlightTeach("hazard"));
  }, [activeVenue, circuitSectorIdx, circuitHazards.length, circuitPhase, flashCircuitTeach]);
  useEffect(() => {
    if (activeVenue !== "circuit") return;
    if (crownCache) flashCircuitTeach(consumeFlightTeach("gold"));
  }, [activeVenue, crownCache, flashCircuitTeach]);
  const [circuitStumble, setCircuitStumble] = useState(false);
  const circuitStumbleTimer = useRef<number | null>(null);
  const onCircuitStumble = useCallback(() => {
    circuitStumbleCount.current += 1;
    duckAmbience(0.5, 300);
    setCircuitStumble(true);
    if (circuitStumbleTimer.current != null) window.clearTimeout(circuitStumbleTimer.current);
    circuitStumbleTimer.current = window.setTimeout(() => setCircuitStumble(false), 280);
  }, []);
  const onCircuitCrownCollect = useCallback(() => {
    if (!crownCacheRef.current) return;
    crownCacheRef.current = null;
    setCrownCache(null);
    const paid = crownCacheCrowns(runModsRef.current.goldCrownsMult);
    bonusCrowns.current += paid;
    circuitGoldRings.current += 1;
    rewardSfx("big");
    flashCircuitTeach(goldPayoutLine(paid), 2200);
  }, [flashCircuitTeach]);

  const capturePose = useCallback(() => {
    const p = poseRef.current;
    return { x: p.x, z: p.z, y: altitude, heading: p.heading };
  }, [altitude]);

  const restorePose = useCallback((pose: { x: number; z: number; y?: number; heading?: number }) => {
    const heading = pose.heading ?? Math.PI;
    poseRef.current = { x: pose.x, z: pose.z, heading };
    // Venue remount clears travelRef briefly — retry until the Handler hooks up.
    // Optional y keeps Tower / floating pads (terrain height alone would drop you).
    let tries = 0;
    const attempt = () => {
      if (travelRef.current) {
        travelRef.current(pose.x, pose.z, heading, pose.y);
        return;
      }
      if (++tries < 50) window.setTimeout(attempt, 40);
    };
    window.setTimeout(attempt, 40);
  }, []);

  const loadCircuitBoard = useCallback(() => {
    const tok = getOwnerToken();
    setCircuitBoardLoading(true);
    if (circuitRunModeRef.current === "expedition") {
      fetch(
        `/api/expedition?body=flight&week=${encodeURIComponent(expedition.weekId)}&limit=12${tok ? `&token=${encodeURIComponent(tok)}` : ""}`,
      )
        .then((r) => r.json())
        .then((d: { entries?: CircuitBoardEntry[] }) => {
          setCircuitBoard(
            (d.entries ?? []).map((e) => ({
              handle: e.handle,
              sectors: e.sectors,
              totalMs: e.totalMs,
              clearedAll: e.clearedAll,
              you: e.you,
            })),
          );
        })
        .catch(() => {})
        .finally(() => setCircuitBoardLoading(false));
      return;
    }
    fetch(`/api/circuit?body=flight&limit=12${tok ? `&token=${encodeURIComponent(tok)}` : ""}`)
      .then((r) => r.json())
      .then((d: { entries?: CircuitBoardEntry[]; mine?: CircuitPersonalBest | null }) => {
        setCircuitBoard(
          (d.entries ?? []).map((e) => ({
            handle: e.handle,
            sectors: e.sectors,
            totalMs: e.totalMs,
            clearedAll: e.clearedAll,
            you: e.you,
          })),
        );
        if (d.mine) setCircuitPersonalBest((prev) => (isCircuitRunBetter(d.mine!, prev) ? d.mine! : prev));
      })
      .catch(() => {})
      .finally(() => setCircuitBoardLoading(false));
  }, [expedition.weekId]);

  useEffect(() => {
    if (activeVenue === "circuit") loadCircuitBoard();
  }, [circuitRunMode, activeVenue, loadCircuitBoard]);

  const submitCircuitRun = useCallback(
    (sectors: number, totalMs: number, clearedAll: boolean) => {
      // Guest Ascent: hold depth for claim XP — nothing on the ranked board yet.
      if (!owned) {
        if (circuitRunModeRef.current === "ranked") noteGuestClimbDepth(sectors);
        return;
      }
      const bonus = bonusCrowns.current;
      bonusCrowns.current = 0;

      // Scout: pay only for sectors advanced this run — no board, no camp light.
      if (circuitRunModeRef.current === "scout") {
        const startAt = circuitStartSectorRef.current;
        const advanced = Math.max(0, sectors - startAt);
        let xp = Math.round(ascentDepthXp(advanced, false) * SCOUT_XP_MULT);
        let crowns = Math.round(ascentCraftCrowns(advanced, false) * SCOUT_CROWN_MULT);
        const room = store.scoutCrownsRemaining();
        crowns = Math.min(crowns, room);
        if (xp > 0) store.awardTrainerXp(xp);
        if (crowns > 0) {
          void store.awardGauntlet(crowns);
          store.noteScoutCrowns(crowns);
        }
        if (bonus > 0) void store.awardGauntlet(bonus);
        return;
      }

      // Weekly Expedition — seeded route board, no camp progress.
      if (circuitRunModeRef.current === "expedition") {
        const capped = Math.min(sectors, expedition.sectors);
        const clearedRoute = capped >= expedition.sectors || clearedAll;
        const run = {
          weekId: expedition.weekId,
          sectors: capped,
          totalMs,
          clearedAll: clearedRoute,
        };
        const prev = loadExpeditionPersonalBest("flight", expedition.weekId);
        const better = isExpeditionRunBetter(run, prev);
        const deeper = run.sectors > (prev?.sectors ?? -1);
        if (deeper) {
          const xp = Math.round(ascentDepthXp(run.sectors, clearedRoute) * EXPEDITION_XP_MULT);
          if (xp > 0) store.awardTrainerXp(xp);
        }
        if (better) {
          const crowns = Math.round(ascentCraftCrowns(run.sectors, clearedRoute) * EXPEDITION_CROWN_MULT);
          if (crowns > 0) void store.awardGauntlet(crowns);
          saveExpeditionPersonalBest(run, "flight");
        }
        if (bonus > 0) void store.awardGauntlet(bonus);
        const expTok = getOwnerToken();
        if (expTok) {
          fetch("/api/expedition", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: expTok,
              weekId: expedition.weekId,
              sectors: run.sectors,
              totalMs: run.totalMs,
              body: "flight",
            }),
          })
            .then(() => loadCircuitBoard())
            .catch(() => {});
        }
        return;
      }

      const tok = getOwnerToken();
      if (!tok) return;
      const run: CircuitPersonalBest = { sectors, totalMs, clearedAll };
      const prev = loadCircuitPersonalBest("flight");
      if (isCircuitRunBetter(run, prev)) {
        saveCircuitPersonalBest(run, "flight");
        setCircuitPersonalBest(run);
      }
      if (bonus > 0) void store.awardGauntlet(bonus);
      // Camps + first-light (shared soul spine with mobile Climb).
      const lit = store.lightCamp(sectors, clearedAll);
      for (const n of lit.newlyLit) {
        void store.awardGauntlet(firstLightChestCrowns(n));
        const theme = reachThemeByIndex(n - 1);
        store.pushEvent(owned, { kind: "ascent", title: `First light at Camp ${theme.roman}`, detail: theme.name });
      }
      if (lit.hundredJustCleared) {
        void store.awardGauntlet(HUNDRED_CHEST_CROWNS);
        store.pushEvent(owned, { kind: "ascent", title: "Cleared the Hundred", detail: "hundred" });
      }
      fetch("/api/circuit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tok,
          sectors,
          totalMs,
          clearedAll,
          body: "flight",
          campsLit: lit.climb.campsLit,
        }),
      })
        .then(async (r) => {
          try {
            const j = (await r.json()) as { balance?: number };
            if (typeof j.balance === "number") store.setBalance(j.balance);
          } catch {
            /* ignore */
          }
          return loadCircuitBoard();
        })
        .catch(() => {});
    },
    [loadCircuitBoard, owned, store, expedition.weekId, expedition.sectors],
  );

  const resetCircuitRun = useCallback(() => {
    clearCircuitContinueTimers();
    circuitCpNext.current = 1;
    circuitRunStart.current = 0;
    circuitSectorStart.current = 0;
    circuitRunMsRef.current = 0;
    circuitSectorPathsRef.current = [];
    circuitSectorSamplesRef.current = [];
    circuitSampleLastT.current = 0;
    setCircuitGhost(null);
    setCircuitGhostRunStartMs(0);
    setCircuitChallengeResult(null);
    setCircuitOvertakeToast(false);
    bonusCrowns.current = 0;
    circuitStumbleCount.current = 0;
    circuitGoldRings.current = 0;
    setCircuitClearSnap(null);
    const start = circuitRunModeRef.current === "scout" ? circuitStartSectorRef.current : 0;
    applyWingSession(runModsRef.current, true, sectorModifier(start)?.speedMult ?? 1);
    setCircuitSectorIdx(start);
    setCircuitCpPassed(1);
    setCircuitRunMs(0);
    setCircuitSectorMs(0);
    setCircuitPhase("ready");
    setCircuitFailReason("fall");
    const seed = circuitLayoutSeedRef.current;
    const s = desktopCircuitSector(start, seed).spawn;
    // face +Z down-track (heading 0) so you re-spawn looking at gate 1, not the exit
    setTimeout(() => travelRef.current?.(s[0], s[2], 0), 50);
  }, [clearCircuitContinueTimers, applyWingSession]);

  const pickCircuitRanked = useCallback(() => {
    setCircuitRunMode("ranked");
    setCircuitSectorIdx(0);
    circuitCpNext.current = 1;
    setCircuitCpPassed(1);
    setCircuitPhase("ready");
    const s = desktopCircuitSector(0).spawn;
    setTimeout(() => travelRef.current?.(s[0], s[2], 0), 50);
  }, []);

  const pickCircuitScout = useCallback((camp: number) => {
    const bonus = runModsRef.current.scoutCampBonus;
    const n = Math.max(1, Math.min(campsLit, camp + bonus));
    setCircuitRunMode("scout");
    setCircuitScoutCamp(n);
    const start = scoutStartSector(n);
    setCircuitSectorIdx(start);
    circuitCpNext.current = 1;
    setCircuitCpPassed(1);
    setCircuitPhase("ready");
    const s = desktopCircuitSector(start).spawn;
    setTimeout(() => travelRef.current?.(s[0], s[2], 0), 50);
  }, [campsLit]);

  const pickCircuitExpedition = useCallback(() => {
    setCircuitRunMode("expedition");
    setCircuitSectorIdx(0);
    circuitCpNext.current = 1;
    setCircuitCpPassed(1);
    setCircuitPhase("ready");
    const s = desktopCircuitSector(0, expedition.seed).spawn;
    setTimeout(() => travelRef.current?.(s[0], s[2], 0), 50);
  }, [expedition.seed]);

  const travelToWorld = useCallback(
    (destId: string, restore = true) => {
      const lvl = trainerLevel(store.trainerXp).level;
      const duelDone = isFirstDuelComplete();
      if (!isWorldOpen(destId, lvl, duelDone)) {
        if (destId === "gauntlet") {
          if (!duelDone) setModeLockToast("Finish your first duel to unlock this.");
          else setModeLockToast("Trainer rank 5 opens the Gauntlet.");
          return;
        }
      }
      if (!isHub) {
        // Leaving a region: never persist a pose stuck in a portal plane.
        saveWorldPose(worldId, safeWildPose(worldId, capturePose()));
      }
      saveLastWorld(destId);
      setGameSession(null);
      setWorldId(destId);
      if (restore) {
        // Hub → region through a Vaultgate: always emerge at that region's
        // Concord door (plaza-side), not mid-arena / outer portal face.
        if (isHub) {
          const entrance = regionEntrancePose(destId);
          if (entrance) {
            saveWorldPose(destId, entrance);
            setTimeout(() => restorePose(entrance), 120);
            return;
          }
        }
        const saved = loadWorldPose(destId);
        if (saved) {
          const safe = safeWildPose(destId, saved);
          if (safe.x !== saved.x || safe.z !== saved.z) saveWorldPose(destId, safe);
          setTimeout(() => restorePose(safe), 120);
        }
      }
    },
    [capturePose, restorePose, isHub, worldId, store.trainerXp],
  );

  const enterVenue = useCallback(
    (venue: VenueId) => {
      // Circuit is the Flight-First face — playable before the first duel.
      // Amphitheatre stays locked until Act 1 completes.
      if (!isFirstDuelComplete() && venue === "amphitheatre") {
        setModeLockToast("Finish your first duel to unlock this.");
        return;
      }
      const raw = capturePose();
      // Region Ascent: save a plaza-side resume so exit/reload isn't inside the
      // auto-enter radius (would immediately re-open the Circuit).
      const pose =
        venue === "circuit"
          ? awayFromCircuitPortal(worldId, raw)
          : { x: raw.x, z: raw.z, y: raw.y ?? 0, heading: raw.heading };
      saveWorldPose(worldId, pose);
      setGameSession({ venue, hostWorldId: worldId, returnPose: pose });
      setWildResume(null);
      clearCircuitContinueTimers();
      circuitCpNext.current = 1;
      circuitRunStart.current = 0;
      circuitSectorStart.current = 0;
      circuitRunMsRef.current = 0;
      applyWingSession(runModsRef.current, true, sectorModifier(0)?.speedMult ?? 1);
      setCircuitGhost(null);
      setCircuitSectorIdx(0);
      setCircuitCpPassed(1);
      setCircuitRunMs(0);
      setCircuitSectorMs(0);
      setCircuitPhase("ready");
      setCircuitFailReason("fall");
      setCircuitRunMode("ranked");
      setCircuitScoutCamp(1);
      bonusCrowns.current = 0;
      if (venue === "circuit") {
        const s = desktopCircuitSector(0).spawn;
        setTimeout(() => travelRef.current?.(s[0], s[2], 0), 80);
      } else if (venue === "amphitheatre") {
        // Handler already mounts on AMPHI_SPAWN (world.tsx venueSpawn). Re-assert
        // pose + facing after the body is ready so a remount can't leave you at
        // the host knoll in the void.
        setTimeout(() => travelRef.current?.(AMPHI_SPAWN[0], AMPHI_SPAWN[2], AMPHI_SPAWN_HEADING), 80);
      }
    },
    [capturePose, worldId, clearCircuitContinueTimers, applyWingSession],
  );

  const exitVenue = useCallback(() => {
    if (!gameSession) return;
    const { returnPose, venue, hostWorldId: host } = gameSession;
    setGameSession(null);
    resetCircuitRun();
    // Latch so a frame of still-overlapping venue-enter can't re-fire instantly.
    if (venue === "circuit") portalAutoKey.current = "enter:circuit";
    // when the game was entered from the Concord, leave the same way you came:
    // step out of that game's venue portal into the plaza, facing the seal. When
    // it was entered from a region, return just outside the Ascent portal.
    const door = host === "concord" ? concordDoorArrival({ venue }) : null;
    if (door) {
      setWildResume({ x: door.x, z: door.z, heading: door.heading });
      poseRef.current = { x: door.x, z: door.z, heading: door.heading };
      restorePose({ x: door.x, z: door.z, heading: door.heading });
    } else {
      const safe = awayFromCircuitPortal(host, returnPose);
      saveWorldPose(host, safe);
      setWildResume({ x: safe.x, z: safe.z, heading: safe.heading });
      poseRef.current = { x: safe.x, z: safe.z, heading: safe.heading };
      restorePose(safe);
    }
  }, [gameSession, resetCircuitRun, restorePose]);

  /** Leave the Ascent UI. Never the marketing homepage — owned → Grounds; guests → claim (start the game). */
  const leaveAscent = useCallback(() => {
    if (ascentEntry) {
      if (owned || isFirstDuelComplete()) {
        // exitVenue alone re-enters Circuit while owned stays on `/ascent`.
        router.replace(PLAY_HREF);
        return;
      }
      // Guest Exit Ascent: same door as RUN OVER claim — pick a champion, then Concord.
      track("m_claim_from_climb");
      setGuestAscentReady(false);
      exitVenue();
      setFirstDuelPhase("pick");
      if (!firstDuelPick) setFirstDuelPick(loanerKey);
      return;
    }
    exitVenue();
  }, [ascentEntry, owned, router, exitVenue, firstDuelPick, loanerKey]);

  // Drop the one-shot wilds resume once the Handler has had time to mount on it.
  useEffect(() => {
    if (!wildResume || gameSession) return;
    const t = window.setTimeout(() => setWildResume(null), 600);
    return () => window.clearTimeout(t);
  }, [wildResume, gameSession]);

  const finalizeCircuitSectorPath = useCallback((idx: number) => {
    const samples = circuitSectorSamplesRef.current;
    if (samples.length >= 2) {
      const paths = circuitSectorPathsRef.current.slice();
      paths[idx] = [...samples];
      circuitSectorPathsRef.current = paths;
    }
    circuitSectorSamplesRef.current = [];
    circuitSampleLastT.current = 0;
  }, []);

  const advanceCircuitSector = useCallback(() => {
    finalizeCircuitSectorPath(circuitSectorIdx);
    if (
      circuitChallenge &&
      circuitRunModeRef.current === "ranked" &&
      isChallengeTipSectorClear(circuitSectorIdx, circuitChallenge.sectors)
    ) {
      setCircuitOvertakeToast(true);
      setCircuitChallengeResult("beat");
      track("climb_challenge_overtake");
    }
    const next = circuitSectorIdx + 1;
    circuitCpNext.current = 1;
    setCircuitCpPassed(1);
    setCircuitSectorMs(0);
    circuitSectorStart.current = 0;
    setCircuitGhostRunStartMs(0);
    const cap =
      circuitRunModeRef.current === "expedition" ? expedition.sectors : DESKTOP_CIRCUIT_COUNT;
    if (next >= cap) {
      // Frozen at sector clear — do not re-read wall clock (includes load gap).
      const total = circuitRunMsRef.current;
      setCircuitClearSnap({
        firstHundred: circuitRunModeRef.current === "ranked" && !climbHundred,
        mastery: {
          stumbles: circuitStumbleCount.current,
          goldRings: circuitGoldRings.current,
          livesLeft: circuitLivesRef.current,
          maxLives: wingLivesCap.current,
        },
      });
      setCircuitRunMs(total);
      setCircuitPhase("done");
      submitCircuitRun(cap, total, true);
      if (circuitChallenge && circuitRunModeRef.current === "ranked") {
        const tipZ = challengeTipFurthestZ(circuitChallenge.path, circuitChallenge.sectors);
        const mark = climbChallengeMark(
          { sectors: cap, totalMs: total },
          { sectors: circuitChallenge.sectors, totalMs: circuitChallenge.totalMs, tipZ },
        );
        setCircuitChallengeResult(mark);
        track(
          mark === "beat"
            ? "climb_challenge_beat"
            : mark === "surpassed"
              ? "climb_challenge_surpass"
              : "climb_challenge_miss",
        );
      }
      if (circuitRunModeRef.current === "ranked") store.awardTrainerXp(120);
      outcomeSfx(true);
      return;
    }
    // Thin altitude key — same Reach II gate as mobile Climb (in-place Prove).
    // Scout practice skips the campaign door.
    const mind = owned ? store.get(owned) : null;
    if (
      circuitRunModeRef.current === "ranked" &&
      next >= ALTITUDE_KEY_SECTOR &&
      (!mind || needsAltitudeProve(mind.wins))
    ) {
      const total = circuitRunMsRef.current;
      setCircuitRunMs(total);
      submitCircuitRun(next, total, true);
      setCircuitPhase("ceiling");
      outcomeSfx(true);
      return;
    }
    // Trainer-rank ceiling — Unlock Ladder rations higher Reaches (parity with Climb).
    if (
      circuitRunModeRef.current === "ranked" &&
      mind &&
      hitsRankLock(next, trainerLevel(store.trainerXp).level, mind.wins, store.climb?.bestSectors ?? 0)
    ) {
      const total = circuitRunMsRef.current;
      setCircuitRunMs(total);
      submitCircuitRun(next, total, true);
      setCircuitPhase("ranklock");
      outcomeSfx(true);
      return;
    }
    // Reach Gate Trial clear → one life back (capped at run max). Parity with Climb.
    if (lifeRestoreOnReachClear(circuitSectorIdx) && circuitLivesRef.current < wingLivesCap.current) {
      circuitLivesRef.current += 1;
      setCircuitLives(circuitLivesRef.current);
    }
    setCircuitSectorIdx(next);
    setCircuitPhase("ready");
    setCircuitArriveNonce((n) => n + 1);
    const s = desktopCircuitSector(next, circuitLayoutSeedRef.current).spawn;
    setTimeout(() => travelRef.current?.(s[0], s[2], 0), 50);
  }, [circuitSectorIdx, submitCircuitRun, store, owned, circuitChallenge, finalizeCircuitSectorPath, expedition.sectors, climbHundred]);

  const onCircuitFail = useCallback(
    (reason: CircuitFailReason = "fall", pose?: CircuitGhostPose) => {
      if (
        circuitPhase === "failed" ||
        circuitPhase === "done" ||
        circuitPhase === "sector" ||
        circuitPhase === "continue"
      ) {
        return;
      }

      // Spend a life → staged continue beat (SFX → pad + ghost → ready).
      if (circuitLivesRef.current > 1) {
        clearCircuitContinueTimers();
        stopJet();
        if (reason === "fall") jetFallSfx();
        else badLuckSfx();
        duckAmbience(0.55, 900);

        circuitLivesRef.current -= 1;
        setCircuitLives(circuitLivesRef.current);
        setCircuitFailReason(reason);
        // Freeze flying time before continue / ready downtime.
        if (circuitRunStart.current) {
          const flown = performance.now() - circuitRunStart.current;
          circuitRunMsRef.current = flown;
          setCircuitRunMs(flown);
        }
        setCircuitPhase("continue");
        circuitCpNext.current = 1;
        setCircuitCpPassed(1);
        setCircuitSectorMs(0);
        circuitSectorStart.current = 0;
        // Drop the missed attempt so share/ghost keep only the pass that follows.
        circuitSectorSamplesRef.current = [];
        circuitSampleLastT.current = 0;

        const s = desktopCircuitSector(circuitSectorIdx, circuitLayoutSeedRef.current).spawn;
        const ghostPose: CircuitGhostPose = {
          x: s[0],
          y: s[1],
          z: s[2],
          heading: pose?.heading ?? 0,
        };

        // Let the fail sting land, then snap to pad for the ghost / arrive shot.
        circuitContinueTimers.current.push(
          window.setTimeout(() => {
            circuitGhostId.current += 1;
            setCircuitGhost({ ...ghostPose, id: circuitGhostId.current });
            setCircuitArriveNonce((n) => n + 1);
            travelRef.current?.(s[0], s[2], 0);
          }, 420),
        );
        // Hold the LIFE LOST beat through ghost + arrive before jump unlocks.
        circuitContinueTimers.current.push(
          window.setTimeout(() => {
            setCircuitPhase("ready");
          }, 3200),
        );
        return;
      }

      clearCircuitContinueTimers();
      stopJet();
      circuitLivesRef.current = 0;
      setCircuitLives(0);
      const total = circuitRunStart.current
        ? performance.now() - circuitRunStart.current
        : circuitRunMsRef.current;
      const sectors = circuitSectorIdx; // sectors fully cleared before this one
      circuitRunMsRef.current = total;
      setCircuitRunMs(total);
      setCircuitFailReason(reason);
      setCircuitPhase("failed");
      submitCircuitRun(sectors, total, false);
      if (circuitChallenge) {
        const tipZ = challengeTipFurthestZ(circuitChallenge.path, circuitChallenge.sectors);
        const failZ =
          circuitSectorSamplesRef.current.length >= 2
            ? circuitSectorSamplesRef.current[circuitSectorSamplesRef.current.length - 1]!.z
            : pose
              ? toClimbCanonical(pose.y, pose.z).z
              : null;
        const mark = climbChallengeMark(
          {
            sectors,
            totalMs: total,
            failZ,
            failSectorIdx: circuitSectorIdx,
          },
          { sectors: circuitChallenge.sectors, totalMs: circuitChallenge.totalMs, tipZ },
        );
        setCircuitChallengeResult(mark);
        track(
          mark === "beat"
            ? "climb_challenge_beat"
            : mark === "surpassed"
              ? "climb_challenge_surpass"
              : "climb_challenge_miss",
        );
      }
      outcomeSfx(false);
    },
    [circuitPhase, circuitSectorIdx, submitCircuitRun, clearCircuitContinueTimers, circuitChallenge],
  );

  /** Jump on the launch pad starts the sector — wind / cruise / timers. */
  const onCircuitStart = useCallback(() => {
    if (circuitPhase !== "ready") return;
    const now = performance.now();
    // Fresh run only — retries after a life keep prior flying time.
    if (circuitSectorIdx === circuitStartSectorRef.current && circuitRunMsRef.current === 0) {
      circuitSectorPathsRef.current = [];
      setCircuitChallengeResult(null);
    }
    // Resume from frozen flying time so ready / continue / load gaps don't count.
    circuitRunStart.current = now - circuitRunMsRef.current;
    // Seed t=0 at the pad so ghost remaps from spawn, not the first mid-air sample.
    const spawn = desktopCircuitSector(circuitSectorIdx, circuitLayoutSeedRef.current).spawn;
    const origin = toClimbCanonical(spawn[1], spawn[2]);
    circuitSectorSamplesRef.current = [{ t: 0, y: origin.y, z: origin.z }];
    circuitSampleLastT.current = now;
    circuitSectorStart.current = now;
    setCircuitGhostRunStartMs(now);
    setCircuitPhase("running");
  }, [circuitPhase, circuitSectorIdx]);

  const onCircuitSample = useCallback((y: number, z: number) => {
    const now = performance.now();
    if (now - circuitSampleLastT.current < 400) return;
    circuitSampleLastT.current = now;
    const t0 = circuitSectorStart.current || now;
    const canon = toClimbCanonical(y, z);
    const bucket = circuitSectorSamplesRef.current;
    bucket.push({ t: Math.max(0, now - t0), y: canon.y, z: canon.z });
    if (bucket.length > 80) bucket.shift();
  }, []);

  const shareCircuitChallenge = useCallback(async () => {
    const sectors = circuitPhase === "done" ? DESKTOP_CIRCUIT_COUNT : circuitSectorIdx;
    const totalMs =
      circuitPhase === "running" && circuitRunStart.current
        ? performance.now() - circuitRunStart.current
        : circuitRunMsRef.current || circuitRunMs;
    // Cleared sectors keep passed paths only; fail tip attaches at death index.
    const paths = buildShareGhostPaths(
      circuitSectorPathsRef.current,
      sectors,
      circuitPhase === "failed" && circuitSectorSamplesRef.current.length >= 2
        ? circuitSectorSamplesRef.current
        : null,
    );
    const url = await createClimbChallengeUrl(
      {
        sectors,
        totalMs,
        name: getHandle() || undefined,
        mind: owned || undefined,
        path: ghostPathHasSamples(paths) ? paths : undefined,
        door: "flight",
      },
      undefined,
      "flight",
    );
    // Native share is for phones; desktop Chromium/Safari expose share() too and it feels wrong.
    if (isTouch && typeof navigator.share === "function") {
      try {
        // URL only — no blurb; share sheets concatenate text+url into one mess.
        await navigator.share({ url });
        track("climb_share_native");
        return;
      } catch {
        /* fall through to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCircuitShareMsg("Challenge link copied");
      track("climb_share_copy");
      window.setTimeout(() => setCircuitShareMsg(null), 2200);
    } catch {
      setCircuitShareMsg("Copy failed — select and copy from the address bar after opening the link");
      window.setTimeout(() => setCircuitShareMsg(null), 3200);
    }
  }, [circuitPhase, circuitSectorIdx, circuitRunMs, isTouch, owned]);

  const onCircuitPass = useCallback(
    (index: number) => {
      const cp = circuitTrack.checkpoints[index];
      if (!cp || circuitPhase !== "running") return;
      const now = performance.now();
      setCircuitCpPassed(index + 1);
      if (!cp.finish) {
        // a rising tick each time you thread a ring (the finish keeps its fanfare)
        jumpBeep(Math.min(4, index));
      }

      if (cp.finish) {
        const sectorElapsed = now - circuitSectorStart.current;
        const runElapsed = now - circuitRunStart.current;
        setCircuitSectorMs(sectorElapsed);
        circuitRunMsRef.current = runElapsed;
        setCircuitRunMs(runElapsed);
        const cap =
          circuitRunModeRef.current === "expedition" ? expedition.sectors : DESKTOP_CIRCUIT_COUNT;
        if (circuitSectorIdx + 1 >= cap) {
          const total = runElapsed;
          setCircuitClearSnap({
            firstHundred: circuitRunModeRef.current === "ranked" && !climbHundred,
            mastery: {
              stumbles: circuitStumbleCount.current,
              goldRings: circuitGoldRings.current,
              livesLeft: circuitLivesRef.current,
              maxLives: wingLivesCap.current,
            },
          });
          setCircuitPhase("done");
          submitCircuitRun(cap, total, true);
          if (circuitChallenge && circuitRunModeRef.current === "ranked") {
            const tipZ = challengeTipFurthestZ(circuitChallenge.path, circuitChallenge.sectors);
            const mark = climbChallengeMark(
              { sectors: cap, totalMs: total },
              { sectors: circuitChallenge.sectors, totalMs: circuitChallenge.totalMs, tipZ },
            );
            setCircuitChallengeResult(mark);
            track(
              mark === "beat"
                ? "climb_challenge_beat"
                : mark === "surpassed"
                  ? "climb_challenge_surpass"
                  : "climb_challenge_miss",
            );
          }
          if (circuitRunModeRef.current === "ranked") store.awardTrainerXp(120);
          outcomeSfx(true);
        } else {
          // Park on "sector" so this frame stops cruise/fail checks; effect advances.
          setCircuitPhase("sector");
          store.awardTrainerXp(owned && circuitRunModeRef.current === "ranked" ? 15 : 0);
          outcomeSfx(true);
        }
      }
    },
    [circuitPhase, circuitSectorIdx, circuitTrack, submitCircuitRun, store, circuitChallenge, owned, climbHundred],
  );

  // Auto-advance after a clear (mobile-like). Brief "sector" phase avoids a soft-lock
  // and lets physics stop before the next track loads (World no longer remounts).
  useEffect(() => {
    if (activeVenue !== "circuit" || circuitPhase !== "sector") return;
    const t = window.setTimeout(() => advanceCircuitSector(), 480);
    return () => window.clearTimeout(t);
  }, [activeVenue, circuitPhase, advanceCircuitSector]);

  // Async challenge deep-link: /ascent/<id> or legacy ?climb=…&gp=…
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    void (async () => {
      const c = await resolveClimbChallengeFromLocation();
      if (cancelled || !c) return;
      // On /grounds roam, ignore old mobile-only door tags; /ascent accepts all.
      if (!ascentEntry && c.door === "thumb") return;
      setCircuitChallenge(c);
      setCircuitChallengeDismissed(false);
      track("climb_challenge_open");
      if (!gameSession) enterVenue("circuit");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on mount
  }, []);

  // /ascent with an owned mind — drop straight into the Circuit (guests still
  // wait for the short summon → guestAscentReady enter below).
  useEffect(() => {
    if (leaveAscentAfterClaim.current) return;
    if (!ascentEntry || !owned || gameSession || activeVenue === "circuit") return;
    enterVenue("circuit");
  }, [ascentEntry, owned, gameSession, activeVenue, enterVenue]);

  useEffect(() => {
    if (activeVenue !== "circuit") return;
    setCircuitPersonalBest(loadCircuitPersonalBest("flight"));
    loadCircuitBoard();
  }, [activeVenue, venueHostWorldId, loadCircuitBoard]);

  useEffect(() => {
    if (!owned || inVenue) return;
    const saved = loadWorldPose(worldId);
    if (!saved) return;
    // Legacy saves may still sit inside Ascent / Concord-return auto-enter volumes,
    // or on the outer face of the region return arch.
    const safe = safeWildPose(worldId, saved);
    if (safe.x !== saved.x || safe.z !== saved.z) saveWorldPose(worldId, safe);
    setTimeout(() => restorePose(safe), 150);
  }, [worldId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist exact wilds pose when the tab hides / closes so reload lands where you left.
  // Venues already wrote the host return pose on enter — only refresh last-world there.
  useEffect(() => {
    if (!owned) return;
    const persist = () => {
      if (inVenue) {
        saveLastWorld(venueHostWorldId);
        return;
      }
      const pose = safeWildPose(worldId, capturePose());
      saveWorldPose(worldId, pose);
      saveLastWorld(worldId);
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") persist();
    };
    window.addEventListener("pagehide", persist);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", persist);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [owned, inVenue, worldId, venueHostWorldId, capturePose]);

  useEffect(() => {
    if (circuitPhase !== "running") return;
    let raf = 0;
    const tick = () => {
      if (circuitRunStart.current) {
        const ms = performance.now() - circuitRunStart.current;
        circuitRunMsRef.current = ms;
        setCircuitRunMs(ms);
      }
      if (circuitSectorStart.current) setCircuitSectorMs(performance.now() - circuitSectorStart.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [circuitPhase]);

  const lastMoveRef = useRef<number>(Date.now());
  const onPose = useCallback((x: number, z: number, heading: number) => {
    const p = poseRef.current;
    if (Math.hypot(x - p.x, z - p.z) > 0.4) lastMoveRef.current = Date.now();
    poseRef.current = { x, z, heading };
  }, []);
  const [nodeFlash, setNodeFlash] = useState<{ crowns: number; fragments: number } | null>(null);
  const nodeFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [goalFlash, setGoalFlash] = useState<{ label: string; goalKind: GoalKind; crowns: number; fragments: number; trainerXp: number; seasonPoints: number } | null>(null);
  const goalFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [evoFlash, setEvoFlash] = useState<EvolutionFlash | null>(null);
  const evoFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pledgeFlash, setPledgeFlash] = useState<{ name: string; motto: string; color: string } | null>(null);
  const pledgeFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The Clan decision surface — opened by the Trainer chip or by walking under
  // a Concord clan flag (preselecting that Force).
  const [clanOpen, setClanOpen] = useState(false);
  const [clanPreselect, setClanPreselect] = useState<CreatureType | null>(null);
  const [clanPreview, setClanPreview] = useState<CreatureType | null>(null);
  // In-world swear shot after a pledge — letterboxed camera + rising flag.
  const [clanCeremony, setClanCeremony] = useState<ClanCeremony | null>(null);
  const pendingClanCeremony = useRef<CreatureType | null>(null);
  /** Where you were when you opened the Clan swear (region Tower, etc.) — restored after the cinematic. */
  const clanReturnRef = useRef<{
    worldId: string;
    venue: VenueId | null;
    pose: { x: number; z: number; y?: number; heading: number };
  } | null>(null);
  const reduceMotionPref = usePrefersReducedMotion();
  const counters = useRef({ pa: 0, pb: 0, ha: 0, hb: 0 });
  const historyRef = useRef(bout.history);
  historyRef.current = bout.history;

  useEffect(() => {
    setMounted(true);
    // Warm the world's JS chunk while onboarding plays (cheap parse, no render),
    // so when it finally mounts behind the picker it skips the chunk fetch/parse.
    void import("@/components/grounds/world");
    track("explore"); // entered the 3D Grounds (behaviour analytics)
    if (typeof window !== "undefined" && (window.matchMedia?.("(pointer: coarse)").matches || "ontouchstart" in window || navigator.maxTouchPoints > 0)) {
      setIsTouch(true);
    }
    let mq: MediaQueryList | undefined;
    let syncMobile: (() => void) | undefined;
    if (typeof window !== "undefined" && window.matchMedia) {
      mq = window.matchMedia("(max-width: 640px)");
      syncMobile = () => setIsMobile(mq!.matches);
      syncMobile();
      mq.addEventListener("change", syncMobile);
    }
    try {
      const seen = localStorage.getItem(STORAGE.intro) || localStorage.getItem(STORAGE.introLegacy);
      // /ascent is fly-first — never park on the marketing deck (reads as a black stall on phones).
      if (!seen && !ascentEntry) setShowIntro(true);
      else if (!seen && ascentEntry) {
        try {
          localStorage.setItem(STORAGE.intro, "1");
        } catch {}
      }
    } catch {}
    try {
      setShowChronicle(localStorage.getItem(STORAGE.chronicleDismissed) !== "1");
    } catch {
      setShowChronicle(true);
    }
    try {
      // Claim from /ascent: cover → Concord outer spawn facing the lit Grounds gate.
      const postClaim = sessionStorage.getItem(STORAGE.postClaimGuide) === "1";
      if (postClaim) {
        sessionStorage.removeItem(STORAGE.postClaimGuide);
        setWorldId("concord");
        saveLastWorld("concord");
        setGameSession(null);
        setClaimArriveCover(true);
        setConcordCoach(true);
        setGuideNudge(true);
      } else if (isFirstDuelComplete() && localStorage.getItem(STORAGE.concordCoach) !== "1") {
        setConcordCoach(true);
        setGuideNudge(localStorage.getItem(STORAGE.firstGuide) !== "1");
      } else {
        setGuideNudge(localStorage.getItem(STORAGE.firstGuide) !== "1");
      }
    } catch {}
    try {
      clanInviteSeen.current = localStorage.getItem(STORAGE.clanInvite) === "1";
    } catch {}
    try {
      const mem = loadRivalMemory();
      setRivalMemory(mem);
      setRival(currentRival(mem));
    } catch {}
    // Season-turn beat — perform the Chronicle as a Keeper cinematic when the
    // door rolls over. Brand-new players just record the season (no beat); the
    // beat is for returning Readers who have finished onboarding.
    try {
      const now = currentSeasonNumber();
      const seenRaw = localStorage.getItem(STORAGE.seasonSeen);
      const introDone = !!(localStorage.getItem(STORAGE.intro) || localStorage.getItem(STORAGE.introLegacy));
      if (seenRaw == null) {
        localStorage.setItem(STORAGE.seasonSeen, String(now));
      } else if (Number(seenRaw) < now && introDone && isFirstDuelComplete()) {
        setSeasonBeat(true);
        // Stamp the season turn into the active champion's saga — it survived a
        // Vault door opening, and the biography should remember that.
        const ownedKey = useChampions.getState().owned;
        if (ownedKey) {
          useChampions.getState().pushEvent(ownedKey, {
            kind: "season",
            season: now,
            title: `Lived through the turn of Season ${now}`,
            detail: "A Vault door opened while it fought.",
          });
        }
      } else {
        localStorage.setItem(STORAGE.seasonSeen, String(now));
      }
    } catch {}
    return () => {
      if (mq && syncMobile) mq.removeEventListener("change", syncMobile);
    };
  }, []);

  // GPU probe is a no-op (always ok) — never allocate a WebGL context before the
  // real Canvas. Kept as a state flag so existing mount gates stay simple.
  useEffect(() => {
    if (!mounted) return;
    setGpu(gpuStatus());
  }, [mounted]);

  const dismissSeasonBeat = useCallback(() => {
    try {
      localStorage.setItem(STORAGE.seasonSeen, String(currentSeasonNumber()));
    } catch {}
    setSeasonBeat(false);
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
    setGoalCoach(false);
  }, []);

  // Peak / Depth / Secret toasts: first land in a region, or any Hub → region
  // return while goals remain. No jargon strip — the cards teach themselves.
  useEffect(() => {
    if (isHub) {
      arrivedFromHubRef.current = true;
      setGoalCoach(false);
      return;
    }
    if (!owned || claiming || inVenue || liveGoals.length === 0) return;
    const firstVisit = !regionGoalIntroducedRef.current.has(world.id);
    const fromHub = arrivedFromHubRef.current;
    if (firstVisit || fromHub) {
      regionGoalIntroducedRef.current.add(world.id);
      arrivedFromHubRef.current = false;
      setGoalCoach(true);
    }
  }, [world.id, isHub, inVenue, owned, claiming, liveGoals.length]);

  const dismissReaderSplitCoach = useCallback(() => {
    try {
      localStorage.setItem(STORAGE.readerSplitCoach, "1");
    } catch {}
    setReaderSplitStep(null);
    setConcordCoach(true);
  }, []);

  const dismissConcordCoach = useCallback(() => {
    try {
      localStorage.setItem(STORAGE.concordCoach, "1");
      localStorage.setItem(STORAGE.firstGuide, "1");
    } catch {}
    setConcordCoach(false);
    setGuideNudge(false);
  }, []);

  // "Skip" on the gate nudge clears only the popup — the Grounds gate stays
  // spotlit so a player who dismissed the hint can still find their first arena.
  // The full coach (spotlight + dim) ends when they actually take a gate.
  const dismissGuideNudge = useCallback(() => {
    try {
      localStorage.setItem(STORAGE.firstGuide, "1");
    } catch {}
    setGuideNudge(false);
  }, []);

  // ── First-run guide (quiet Hub land) ───────────────────────────────────────
  // One coach line + lit Colosseum gate. No RETURNING theater, no idle escalate,
  // no clan-join Html until they walk to a flag.
  const firstRunGuide = concordCoach && !!owned && isHub && !inVenue;
  const guideWorld = firstRunGuide ? FIRST_GUIDE_WORLD : null;
  const groundsGatePos = useMemo<[number, number, number]>(() => {
    const g = CONCORD_GATES.find((x) => x.world === FIRST_GUIDE_WORLD) ?? CONCORD_GATES[0];
    return [Math.cos(g.angle) * g.dist, 0, Math.sin(g.angle) * g.dist];
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

  // New players: short summon → guest Circuit (claim postponed to RUN OVER).
  // On /ascent, arm as soon as the roster is up — no marketing intro, no long black gap.
  useEffect(() => {
    if (!mounted || isFirstDuelComplete() || owned || showIntro) {
      summonStartedAt.current = null;
      return;
    }
    if (guestAscentReady || firstDuelPhase !== null) return;
    if (summonStartedAt.current === null) summonStartedAt.current = Date.now();
    if (roster.length === 0) return;
    const floor = ascentEntry ? 0 : MIN_SUMMON_MS;
    const wait = Math.max(0, floor - (Date.now() - summonStartedAt.current));
    const t = setTimeout(() => setGuestAscentReady(true), wait);
    return () => clearTimeout(t);
  }, [mounted, owned, roster.length, firstDuelPhase, showIntro, guestAscentReady, ascentEntry]);

  // Warm the guided first-fight world (its ~23 nature glTFs + the world chunk) as
  // EARLY as possible — the moment a first-run player is detected, while the intro
  // deck, the "summoning" beat, champion select and the strategy dial are still on
  // screen. Those seconds of background download are what stop the battleground
  // after Train from hitting a cold 5s+ "loading the grounds…" wall. Idempotent
  // (preloadNatureBiome + useGLTF.preload both dedupe), so the pick/train pass is
  // just a belt-and-braces retry for odd entry paths.
  useEffect(() => {
    if (!mounted || owned || isFirstDuelComplete()) return;
    warmGroundsChunk(worldById(FIRST_FIGHT_WORLD).biome.id);
  }, [mounted, owned, firstDuelPhase]);

  // Mount the 3D scene against the arena the guided duel actually uses, not the
  // Concord hub — otherwise the player pays a second biome load after Train.
  useEffect(() => {
    if (firstDuelPhase !== "train") return;
    if (worldId !== FIRST_FIGHT_WORLD) travelToWorld(FIRST_FIGHT_WORLD, false);
  }, [firstDuelPhase, worldId, travelToWorld]);

  const closeIntro = useCallback(() => {
    try {
      localStorage.setItem(STORAGE.intro, "1");
    } catch {}
    setShowIntro(false);
    // Don't jump straight to the picker: clearing showIntro lets the pre-picker
    // "summoning" effect run the minimum-hold before champion select mounts.
  }, []);

  const onAltitude = useCallback((y: number) => {
    setAltitude(y);
    setPeakAltitude((p) => (y > p ? y : p));
  }, []);

  const byKey = useMemo(() => Object.fromEntries(roster.map((r) => [r.key, r])), [roster]);

  // Your champion's wordless reactions — a "HEY!"/impression in its own voice.
  // A single glyph pops above it and a creature cry plays; throttled so the
  // companion stays alive without becoming chatter. The bubble shows on the
  // champion at its train pad; the cry is heard wherever you are.
  const reactCompanion = useCallback(
    (event: CompanionEvent) => {
      if (!owned || !byKey[owned]) return;
      const now = Date.now();
      if (now - reactCooldown.current < 3500) return;
      reactCooldown.current = now;
      const r = companionReaction(byKey[owned].type, event);
      setCompanionEmote(r.emote);
      setCompanionAct((n) => n + 1);
      primeCreature();
      speakCreatureType(r.cry, byKey[owned].type);
      if (companionEmoteTimer.current) clearTimeout(companionEmoteTimer.current);
      companionEmoteTimer.current = setTimeout(() => setCompanionEmote(null), r.holdMs);
    },
    [owned, byKey],
  );

  const modesLocked = mounted && !isFirstDuelComplete();
  const duelStarters = useMemo(() => firstDuelStarters(roster), [roster]);
  const inFirstDuelSetup =
    firstDuelPhase === "pick" ||
    firstDuelPhase === "train" ||
    firstDuelPhase === "evolve" ||
    firstDuelPhase === "concord";
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

  // Reader split coach is for regions with a train pad — never in the Concord hub.
  useEffect(() => {
    if (!isHub || readerSplitStep === null) return;
    dismissReaderSplitCoach();
  }, [isHub, readerSplitStep, dismissReaderSplitCoach]);

  useEffect(() => {
    if (!mounted || !owned || !isFirstDuelComplete()) return;
    try {
      if (localStorage.getItem(STORAGE.readerSplitCoach) === "1") return;
      // Act 1 ends in the Concord — train-pad copy is for regions, not the hub.
      localStorage.setItem(STORAGE.readerSplitCoach, "1");
      if (localStorage.getItem(STORAGE.concordCoach) !== "1") setConcordCoach(true);
    } catch {}
  }, [mounted, owned]);

  const worldLife: WorldLife = useMemo(
    () => ({
      companionLine,
      companionEmote,
      companionAct,
      training: near?.kind === "train" || overlay === "train",
      padBeacon: readerSplitStep === 1,
    }),
    [companionLine, companionEmote, companionAct, near?.kind, overlay, readerSplitStep],
  );

  // Reader split coach step 1 — dismiss once the player reaches the train pad.
  useEffect(() => {
    if (readerSplitStep !== 1 || near?.kind !== "train" || !owned) return;
    dismissReaderSplitCoach();
  }, [readerSplitStep, near?.kind, owned, dismissReaderSplitCoach]);

  const inMatch = bout.phase === "live";
  const controlsEnabled = overlay === "none" && !inMatch && !result && !gRun && !clanOpen && !clanCeremony;

  const placeAtClanFlag = useCallback((type: CreatureType) => {
    const spot = concordClanSpots().find((s) => s.type === type);
    if (!spot || !travelRef.current) return { x: spot?.x ?? 0, z: spot?.z ?? 0 };
    // Stand between the seal and the flag, facing the mast.
    const ang = Math.atan2(spot.z, spot.x);
    const standR = CLAN_R - 2.35;
    const sx = Math.cos(ang) * standR;
    const sz = Math.sin(ang) * standR;
    const face = Math.atan2(spot.x - sx, spot.z - sz);
    travelRef.current(sx, sz, face);
    return { x: spot.x, z: spot.z };
  }, []);

  const finishClanCeremony = useCallback((c: ClanCeremony) => {
    setClanCeremony(null);
    setPledgeFlash({ name: c.name, motto: c.motto, color: c.color });
    if (pledgeFlashTimer.current) clearTimeout(pledgeFlashTimer.current);
    pledgeFlashTimer.current = setTimeout(() => setPledgeFlash(null), 2200);

    // Put the Trainer back where they swore from (e.g. Tower summit after a fight).
    // Do not use travelToWorld(hub→region): that forces the Vaultgate entrance pose.
    const ret = clanReturnRef.current;
    clanReturnRef.current = null;
    if (!ret) return;

    const backToRegion = ret.worldId !== "concord";
    if (backToRegion) {
      const pose = {
        x: ret.pose.x,
        z: ret.pose.z,
        y: ret.pose.y ?? 0,
        heading: ret.pose.heading,
      };
      saveWorldPose(ret.worldId, pose);
      saveLastWorld(ret.worldId);
      setGameSession(null);
      // Mount on the saved pad (y matters on the Tower summit). Avoid travelToWorld —
      // hub→region always forces the Vaultgate entrance.
      setWildResume({ x: pose.x, z: pose.z, y: pose.y, heading: pose.heading });
      setWorldId(ret.worldId);
      if (ret.venue) {
        window.setTimeout(() => enterVenue(ret.venue!), 220);
      }
      return;
    }

    // Already in the Hub: ceremony parked you at the flag — restore prior plaza spot.
    if (!ret.venue) {
      window.setTimeout(() => restorePose(ret.pose), 40);
    } else {
      window.setTimeout(() => enterVenue(ret.venue!), 80);
    }
  }, [restorePose, enterVenue]);

  const beginClanCeremony = useCallback(
    (type: CreatureType) => {
      const fm = forceMeta(type);
      const payload: ClanCeremony = { type, name: fm.name, motto: fm.motto, color: TYPE_COLOR[type] };
      const reduce = reduceMotionPref || useSettings.getState().reduceMotion;
      // Remember the spot before any Concord travel / flag park.
      clanReturnRef.current = {
        worldId,
        venue: activeVenue,
        pose: capturePose(),
      };
      if (reduce) {
        pledgeSfx();
        setPledgeFlash({ name: payload.name, motto: payload.motto, color: payload.color });
        if (pledgeFlashTimer.current) clearTimeout(pledgeFlashTimer.current);
        pledgeFlashTimer.current = setTimeout(() => setPledgeFlash(null), 2800);
        clanReturnRef.current = null; // never left — no restore needed
        return;
      }
      // Ceremony needs the Concord plaza flags. If you're elsewhere, queue a travel,
      // then finishClanCeremony returns you to clanReturnRef.
      if (!isHub || inVenue) {
        pendingClanCeremony.current = type;
        if (inVenue) exitVenue();
        if (!isHub) travelToWorld("concord", false);
        return;
      }
      placeAtClanFlag(type);
      setClanCeremony(payload);
    },
    [reduceMotionPref, isHub, inVenue, exitVenue, travelToWorld, placeAtClanFlag, worldId, activeVenue, capturePose],
  );

  // After a queued Concord travel, park at the flag and open the swear shot.
  useEffect(() => {
    if (!isHub || inVenue || !pendingClanCeremony.current) return;
    const type = pendingClanCeremony.current;
    pendingClanCeremony.current = null;
    const fm = forceMeta(type);
    const payload: ClanCeremony = { type, name: fm.name, motto: fm.motto, color: TYPE_COLOR[type] };
    const t = setTimeout(() => {
      placeAtClanFlag(type);
      setClanCeremony(payload);
    }, 200);
    return () => clearTimeout(t);
  }, [isHub, inVenue, worldId, placeAtClanFlag]);

  const clanShotTarget = useMemo(() => {
    if (!clanCeremony) return null;
    const spot = concordClanSpots().find((s) => s.type === clanCeremony.type);
    return spot ? { x: spot.x, z: spot.z } : null;
  }, [clanCeremony]);

  // Per-place procedural score; battle overlay when a fight or Keeper duel is live.
  useEffect(() => {
    const inBattle = inMatch || overlay === "guardian";
    setMood(
      resolveAmbienceMood({
        inBattle,
        worldId,
        activeVenue,
      }),
    );
  }, [inMatch, overlay, worldId, activeVenue]);

  // Behaviour analytics: opening the Daily Tribunal shrine.
  useEffect(() => {
    if (overlay === "daily") track("daily");
  }, [overlay]);

  // Your champion speaks when you walk up to train — a living companion, not a prop.
  useEffect(() => {
    if (!owned || !byKey[owned]) return;
    const kind = near?.kind ?? null;
    if (kind === "train" && prevNearKind.current !== "train") {
      const line = championGreeting(owned, "train");
      setCompanionLine(line);
      setCompanionAct((n) => n + 1);
      primeCreature();
      speakCreatureType(line, byKey[owned].type);
      if (companionTimer.current) clearTimeout(companionTimer.current);
      companionTimer.current = setTimeout(() => setCompanionLine(null), 6500);
    }
    prevNearKind.current = kind;
  }, [near, owned, byKey]);

  // Awe — your champion marvels when you crest a new height milestone (every 10m
  // of personal-best altitude). Ground hops are ignored.
  useEffect(() => {
    if (peakAltitude < 8) return;
    const band = Math.floor(peakAltitude / 10);
    if (band > peakBand.current) {
      peakBand.current = band;
      reactCompanion("awe");
    }
  }, [peakAltitude, reactCompanion]);

  // Arrival — a small impression when you step into a new region (not the hub).
  useEffect(() => {
    if (!worldId) return;
    if (prevWorldId.current === null) {
      prevWorldId.current = worldId;
      return;
    }
    if (prevWorldId.current !== worldId) {
      prevWorldId.current = worldId;
      if (!isHub) reactCompanion("arrive");
    }
  }, [worldId, isHub, reactCompanion]);

  // ── Scene-change transitions ────────────────────────────────────────────────
  // Wrap world/venue swaps in a force-tinted veil so travel reads as a directed
  // scene change rather than a cut. The swap runs while the veil is fully shut.
  const travelSwap = useRef<(() => void) | null>(null);
  const playTravel = useCallback((card: TravelCard, swap: () => void) => {
    if (travelCard) {
      // already mid-transition — just run the swap, don't stack veils
      swap();
      return;
    }
    travelSwap.current = swap;
    setTravelCard(card);
  }, [travelCard]);

  /** HUD / hub shortcut — don't require finding the mountain portal. */
  const goFlight = useCallback(() => {
    if (travelCard || inVenue || inMatch || overlay !== "none" || gRun) return;
    setWorldMenu(false);
    playTravel(
      { kicker: "TAKE FLIGHT", title: VENUES.circuit.name, sub: VENUES.circuit.blurb, color: VENUES.circuit.color },
      () => enterVenue("circuit"),
    );
  }, [travelCard, inVenue, inMatch, overlay, gRun, playTravel, enterVenue]);

  // Once guest Ascent is armed, drop into the Circuit (claim postponed to RUN OVER).
  // On /ascent we're already at the door — skip the second TAKE FLIGHT veil.
  useEffect(() => {
    if (!guestAscentReady || owned || activeVenue === "circuit" || guestEnterArmed.current) return;
    guestEnterArmed.current = true;
    track("m_guest_run");
    if (ascentEntry) {
      enterVenue("circuit");
      return;
    }
    playTravel(
      { kicker: "TAKE FLIGHT", title: VENUES.circuit.name, sub: "Jump to start · claim later", color: VENUES.circuit.color },
      () => enterVenue("circuit"),
    );
  }, [guestAscentReady, owned, activeVenue, playTravel, enterVenue, ascentEntry]);

  const worldTravelCard = useCallback((destId: string): TravelCard => {
    const w = worldById(destId);
    return {
      kicker: destId === "concord" ? "RETURNING" : "TRAVELING",
      title: w.name,
      sub: w.tagline,
      color: w.biome.lights.arenaPoint,
    };
  }, []);

  // open the nearby interaction (shared by the E key and the on-screen prompt).
  // The central arena routes to the world's scenario; perched-agent challenges
  // are always a single duel regardless of world.
  const interact = useCallback(async () => {
    if (overlay !== "none" || inMatch || result || gRun || travelCard) return;
    if (modesLocked) {
      // Circuit stays open for guest Ascent; Amphitheatre / league / etc. wait on claim.
      const blocked =
        near?.kind === "keeper" ||
        (near?.kind === "venue-enter" && near.venue === "amphitheatre") ||
        (near?.kind === "venue" && near.venue === "league") ||
        (near?.kind === "arena" && scenario.id === "gauntlet") ||
        near?.kind === "force";
      if (blocked) {
        setModeLockToast("Claim a champion in Flight to unlock this.");
        return;
      }
    }
    if (near?.kind === "train") {
      setRegionRaiseCoach(false);
      setOverlay("train");
    }
    else if (near?.kind === "broker") {
      if (!isBrokerOpen(trainerLevel(store.trainerXp).level)) {
        setModeLockToast("Trainer rank 4 opens the Broker.");
        return;
      }
      setOverlay("broker");
    }
    else if (near?.kind === "keeper") {
      // Guardians stripped from face (lib/features.ts) — never open the duel.
      if (KEEPERS_PLAYABLE) {
        setKeeperIntroPending({ level: near.level, name: near.name, title: near.title });
      }
    } else if (near?.kind === "arena") {
      setArenaFightCoach(false);
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
        reactCompanion("cheer");
      }
    } else if (near?.kind === "goal") {
      const reward = { crowns: near.crowns, fragments: near.fragments, trainerXp: near.trainerXp, seasonPoints: near.seasonPoints };
      if (await store.completeGoal(near.id, reward)) {
        setGoalFlash({ label: near.label, goalKind: near.goalKind, ...reward });
        setNear(null);
        if (near.goalKind === "peak") setSummitRevealNonce((n) => n + 1);
        if (goalFlashTimer.current) clearTimeout(goalFlashTimer.current);
        goalFlashTimer.current = setTimeout(() => setGoalFlash(null), 3200);
        reactCompanion("triumph");
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
      const dest = near.world;
      if (!isWorldOpen(dest, trainerLevel(store.trainerXp).level, isFirstDuelComplete())) {
        if (dest === "gauntlet") {
          setModeLockToast(
            isFirstDuelComplete() ? "Trainer rank 5 opens the Gauntlet." : "Finish your first duel to unlock this.",
          );
        } else {
          setModeLockToast("This gate is still closed.");
        }
        return;
      }
      // taking any gate ends the first-run guide — the player understood "leave
      // the hub for a region," which is the whole point of the spotlight.
      if (concordCoach) dismissConcordCoach();
      setNear(null);
      playTravel(worldTravelCard(dest), () => travelToWorld(dest));
    } else if (near?.kind === "return") {
      setNear(null);
      // arrive at the Concord through the very Vaultgate that reaches this region,
      // stepping out into the plaza facing the seal — the door mirrors the one you
      // took to leave, so the round trip reads as one continuous archway.
      const origin = worldId;
      const door = concordDoorArrival({ world: origin });
      playTravel(worldTravelCard("concord"), () => {
        // Persist plaza-side of this arch so the next visit emerges from the door
        // facing the plaza — not stranded on the outer wilds face.
        saveWorldPose(worldId, awayFromReturnPortal(worldId, capturePose()));
        travelToWorld("concord", false);
        setTimeout(() => {
          if (door) travelRef.current?.(door.x, door.z, door.heading);
          else travelRef.current?.(CONCORD_SPAWN[0], CONCORD_SPAWN[1]);
        }, 160);
      });
    } else if (near?.kind === "venue-enter") {
      const v = near.venue;
      setNear(null);
      const venue = VENUES[v];
      playTravel({ kicker: "ENTERING", title: venue.name, sub: venue.blurb, color: venue.color }, () => enterVenue(v));
    } else if (near?.kind === "venue-exit") {
      setNear(null);
      if (ascentEntry && activeVenue === "circuit") {
        leaveAscent();
        return;
      }
      playTravel(worldTravelCard(venueHostWorldId), () => exitVenue());
    }
  }, [near, overlay, inMatch, result, gRun, travelCard, scenario.id, store, travelToWorld, capturePose, worldId, enterVenue, exitVenue, leaveAscent, ascentEntry, activeVenue, modesLocked, playTravel, worldTravelCard, venueHostWorldId, concordCoach, dismissConcordCoach, reactCompanion]);

  // Portals cross by walking through — no E. Latch the portal key so nulling
  // `near` mid-travel (or standing in the plane) doesn't re-fire the veil.
  useEffect(() => {
    const n = near;
    let key: string | null = null;
    if (n?.kind === "gate") key = `gate:${n.world}`;
    else if (n?.kind === "return") key = "return";
    else if (n?.kind === "venue-enter") key = `enter:${n.venue}`;
    else if (n?.kind === "venue-exit") key = `exit:${n.label}`;
    if (!key) {
      if (!n && !travelCard) portalAutoKey.current = null;
      return;
    }
    if (portalAutoKey.current === key) return;
    portalAutoKey.current = key;
    void interact();
  }, [near, interact, travelCard]);

  const fastTravel = useCallback((pos: [number, number, number]) => {
    travelRef.current?.(pos[0], pos[2]);
  }, []);

  useEffect(() => () => {
    if (nodeFlashTimer.current) clearTimeout(nodeFlashTimer.current);
    if (pledgeFlashTimer.current) clearTimeout(pledgeFlashTimer.current);
    if (goalFlashTimer.current) clearTimeout(goalFlashTimer.current);
    if (evoFlashTimer.current) clearTimeout(evoFlashTimer.current);
    if (companionEmoteTimer.current) clearTimeout(companionEmoteTimer.current);
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
    setMatchView((prev) => ({
      aKey: owned,
      bKey,
      hpA: bout.hpA,
      hpB: bout.hpB,
      actor: battleActorToMatchKey(t.actor, owned, opponent, opponentId),
      punchA: c.pa,
      punchB: c.pb,
      hitA: c.ha,
      hitB: c.hb,
      cinematic: inFirstDuelFight.current ? true : prev?.cinematic,
    }));
  }, [bout.turn, bout.hpA, bout.hpB, opponent, opponentId, owned]);

  const circuitGuest = !owned;
  const circuitActiveKey = owned ?? loanerKey;

  /** Finish Act-1 latches after a guest (or pick) claim — Concord gate guide stays ON. */
  const sealFirstClaim = useCallback(() => {
    markFirstDuelComplete();
    setFirstDuelPhase(null);
    setFirstDuelEvolve(null);
    setFirstDuelPick(null);
    setGuestAscentReady(true);
    evolveBeforeRef.current = null;
    firstFightWorldRef.current = null;
    setWakeKey(null);
    setFlightKey(null);
    bout.stop();
    setMatchView(null);
    setOpponent(null);
    setResult(null);
    // Skip the region train-pad split (no pad in the hub). Do NOT stamp concordCoach —
    // first landing must spotlight the Grounds gate.
    try {
      localStorage.setItem(STORAGE.readerSplitCoach, "1");
    } catch {}
    setConcordCoach(true);
    setGuideNudge(true);
    setReaderSplitStep(null);
    void store.syncWallet();
    outcomeSfx(true);
    track("fj_train_to_ascent");
  }, [bout, store]);

  /** Outer Concord threshold, facing the lit Grounds Vaultgate — the only first-claim landing. */
  const landConcordFirstGuide = useCallback(() => {
    setConcordCoach(true);
    setGuideNudge(true);
    setGameSession(null);
    saveLastWorld("concord");
    if (worldId !== "concord") travelToWorld("concord", false);
    else setWorldId("concord");
    const faceGate = Math.atan2(
      groundsGatePos[0] - CONCORD_SPAWN[0],
      groundsGatePos[2] - CONCORD_SPAWN[1],
    );
    const place = () => {
      // Clear any region resume pose — always the outer gate-ring start.
      setWildResume({ x: CONCORD_SPAWN[0], z: CONCORD_SPAWN[1], heading: faceGate });
      travelRef.current?.(CONCORD_SPAWN[0], CONCORD_SPAWN[1], faceGate);
    };
    place();
    window.setTimeout(place, 180);
    window.setTimeout(place, 520);
  }, [worldId, travelToWorld, groundsGatePos]);

  /** RUN OVER / ceiling claim → champion selection (may keep the loaner or pick another). */
  const openCircuitClaimPicker = useCallback(() => {
    track("m_claim_from_climb");
    setGuestAscentReady(false);
    exitVenue();
    setFirstDuelPhase("pick");
    if (!firstDuelPick) setFirstDuelPick(loanerKey);
  }, [exitVenue, firstDuelPick, loanerKey]);

  /** After the guest Ascent: claim a champion and land in guided Concord — not another climb. */
  const claimAndEnterGrounds = useCallback(
    (key: string, strat: { risk: number; focus: number; aggression: number } = QUICK_START_STRAT) => {
      store.setStrat(key, strat);
      store.adoptStarterRookie(key);
      // `/ascent` re-auto-enters Circuit whenever `owned` is set — leave before seal paints.
      if (ascentEntry) {
        leaveAscentAfterClaim.current = true;
        try {
          sessionStorage.setItem(STORAGE.postClaimGuide, "1");
        } catch {}
      }
      sealFirstClaim();
      if (ascentEntry) {
        router.replace(PLAY_HREF);
        return;
      }
      // Already on /grounds: step out of the Circuit into Concord roam at the outer spawn.
      if (activeVenue === "circuit") {
        playTravel(
          {
            kicker: "ARRIVING",
            title: "The Hub",
            sub: "Fly the lit gate to your first region.",
            color: worldById("concord").biome.lights.arenaPoint,
          },
          () => {
            exitVenue();
            landConcordFirstGuide();
          },
        );
        return;
      }
      if (worldId !== "concord") {
        playTravel(
          {
            kicker: "ARRIVING",
            title: "The Hub",
            sub: "Fly the lit gate to your first region.",
            color: worldById("concord").biome.lights.arenaPoint,
          },
          () => {
            travelToWorld("concord", false);
            landConcordFirstGuide();
          },
        );
      } else {
        landConcordFirstGuide();
      }
    },
    [
      store,
      sealFirstClaim,
      ascentEntry,
      router,
      activeVenue,
      playTravel,
      exitVenue,
      landConcordFirstGuide,
      worldId,
      travelToWorld,
    ],
  );

  const completeFirstDuel = useCallback(() => {
    if (!owned && firstDuelPick) claimAndEnterGrounds(firstDuelPick);
    else {
      if (ascentEntry) {
        leaveAscentAfterClaim.current = true;
        try {
          sessionStorage.setItem(STORAGE.postClaimGuide, "1");
        } catch {}
      }
      sealFirstClaim();
      if (ascentEntry) {
        router.replace(PLAY_HREF);
        return;
      }
      if (activeVenue === "circuit") {
        playTravel(
          {
            kicker: "ARRIVING",
            title: "The Hub",
            sub: "Fly the lit gate to your first region.",
            color: worldById("concord").biome.lights.arenaPoint,
          },
          () => {
            exitVenue();
            landConcordFirstGuide();
          },
        );
      } else if (worldId !== "concord") {
        playTravel(
          {
            kicker: "ARRIVING",
            title: "The Hub",
            sub: "Fly the lit gate to your first region.",
            color: worldById("concord").biome.lights.arenaPoint,
          },
          () => {
            travelToWorld("concord", false);
            landConcordFirstGuide();
          },
        );
      } else {
        landConcordFirstGuide();
      }
    }
  }, [
    owned,
    firstDuelPick,
    claimAndEnterGrounds,
    sealFirstClaim,
    ascentEntry,
    router,
    activeVenue,
    playTravel,
    exitVenue,
    landConcordFirstGuide,
    worldId,
    travelToWorld,
  ]);

  const stageFirstFightArena = useCallback(() => {
    if (worldId !== FIRST_FIGHT_WORLD) {
      firstFightWorldRef.current = worldId;
      travelToWorld(FIRST_FIGHT_WORLD, false);
    }
    setTimeout(() => travelRef.current?.(0, 10), 160);
  }, [travelToWorld, worldId]);

  const returnToConcordAfterFirstFight = useCallback(() => {
    firstFightWorldRef.current = null;
    travelToWorld("concord", false);
    setTimeout(() => travelRef.current?.(0, 52), 160);
  }, [travelToWorld]);

  const finishFirstDuelTrain = useCallback(
    async (key: string, strat: { risk: number; focus: number; aggression: number }) => {
      claimAndEnterGrounds(key, strat);
    },
    [claimAndEnterGrounds],
  );

  const launchFirstDuelFight = useCallback(() => {
    if (!owned) return;
    evolveBeforeRef.current = { ...store.get(owned) };
    const opp = firstDuelOpponent(owned, roster);
    setOpponent(opp);
    setOpponentId(null);
    setDuelMeta(null);
    inFirstDuelFight.current = true;
    counters.current = { pa: 0, pb: 0, ha: 0, hb: 0 };
    setResult(null);
    stageFirstFightArena();
    const bKey = matchOpponentKey(opp, null);
    setMatchView({ aKey: owned, bKey, hpA: 100, hpB: 100, actor: null, punchA: 0, punchB: 0, hitA: 0, hitB: 0, cinematic: true });
    const ra = getRecipe(owned);
    const rb = getRecipe(opp);
    const url = `/api/battle?a=${owned}&b=${opp}&mock=1&seed=42&${sideParams("a", ra)}&${sideParams("b", rb)}`;
    bout.begin(url, (end: BattleEnd) => {
      inFirstDuelFight.current = false;
      const styles: Record<string, Style> = { [owned]: blankStyle(), [opp]: blankStyle() };
      for (const turn of historyRef.current) accrue(turn.actor === owned ? styles[owned] : styles[opp], turn);
      const winnerKey = end.winner;
      const loserKey = winnerKey === owned ? opp : owned;
      store.recordBattle(winnerKey, loserKey, styles);
      const before = evolveBeforeRef.current ?? store.get(owned);
      const dom = dominant(store.get(owned));
      store.learnFromBout({ key: owned, opponentName: byKey[opp]?.name || opp, won: winnerKey === owned, axisLabel: dom.axis.label });
      const after = store.get(owned);
      if (winnerKey === owned) store.setBalance(useChampions.getState().crowns + GROUNDS_WIN_REWARD);
      setFirstDuelEvolve({
        before,
        after,
        key: owned,
        type: byKey[owned]?.type ?? "LOGIC",
      });
      setMatchView(null);
      setOpponent(null);
      returnToConcordAfterFirstFight();
      setFirstDuelPhase("evolve");
      outcomeSfx(winnerKey === owned);
    });
  }, [owned, roster, store, getRecipe, bout, byKey, stageFirstFightArena, returnToConcordAfterFirstFight]);

  // A rival duel — a recurring, named grudge match. Reuses the proven cinematic
  // mock-battle path (no ranked stakes); the arena platform rises in-place. The
  // running head-to-head is persisted and drives the rival's taunts.
  const launchRivalDuel = useCallback(() => {
    if (!owned || !rival) return;
    const opp = rival.champion;
    evolveBeforeRef.current = { ...store.get(owned) };
    setOpponent(opp);
    setOpponentId(null);
    setDuelMeta({ name: rival.name, handle: rival.handle });
    inRivalDuel.current = true;
    counters.current = { pa: 0, pb: 0, ha: 0, hb: 0 };
    setResult(null);
    const bKey = matchOpponentKey(opp, null);
    setMatchView({ aKey: owned, bKey, hpA: 100, hpB: 100, actor: null, punchA: 0, punchB: 0, hitA: 0, hitB: 0, cinematic: true });
    const ra = getRecipe(owned);
    const rb = getRecipe(opp);
    const seed = 100 + ((rival.seed + (rivalMemory?.wins ?? 0) + (rivalMemory?.losses ?? 0)) % 9000);
    const url = `/api/battle?a=${owned}&b=${opp}&mock=1&seed=${seed}&${sideParams("a", ra)}&${sideParams("b", rb)}`;
    bout.begin(url, (end: BattleEnd) => {
      inRivalDuel.current = false;
      const styles: Record<string, Style> = { [owned]: blankStyle(), [opp]: blankStyle() };
      for (const turn of historyRef.current) accrue(turn.actor === owned ? styles[owned] : styles[opp], turn);
      const winnerKey = end.winner;
      const won = winnerKey === owned;
      const loserKey = won ? opp : owned;
      store.recordBattle(winnerKey, loserKey, styles);
      const dom = dominant(store.get(owned));
      store.learnFromBout({ key: owned, opponentName: rival.name, won, axisLabel: dom.axis.label });
      if (won) store.setBalance(useChampions.getState().crowns + GROUNDS_WIN_REWARD);
      store.awardTrainerXp(won ? TRAINER_XP.boutWin : TRAINER_XP.boutLoss);
      const mem = recordRivalDuel(won);
      setRivalMemory(mem);
      setMatchView(null);
      setOpponent(null);
      setRivalBeat({ phase: "after", won });
      outcomeSfx(won);
    });
  }, [owned, rival, rivalMemory, store, getRecipe, bout]);

  // A Promotion Trial — a nominated proving duel that must be WON to claim the
  // tier the champion's XP has reached. Mirrors the rival mock-duel path; on a
  // win it calls claimTier (which fires the tier-up Celebration) + a Reflection.
  const launchTrialDuel = useCallback((tier: string) => {
    if (!owned) return;
    const opp = firstDuelOpponent(owned, roster);
    inTrialDuel.current = true;
    counters.current = { pa: 0, pb: 0, ha: 0, hb: 0 };
    setResult(null);
    setOpponent(opp);
    setOpponentId(null);
    setDuelMeta(null);
    const bKey = matchOpponentKey(opp, null);
    setMatchView({ aKey: owned, bKey, hpA: 100, hpB: 100, actor: null, punchA: 0, punchB: 0, hitA: 0, hitB: 0, cinematic: true });
    const ra = getRecipe(owned);
    const rb = getRecipe(opp);
    const seed = 400 + (store.get(owned).xp % 9000);
    const url = `/api/battle?a=${owned}&b=${opp}&mock=1&seed=${seed}&${sideParams("a", ra)}&${sideParams("b", rb)}`;
    bout.begin(url, (end: BattleEnd) => {
      inTrialDuel.current = false;
      const styles: Record<string, Style> = { [owned]: blankStyle(), [opp]: blankStyle() };
      for (const turn of historyRef.current) accrue(turn.actor === owned ? styles[owned] : styles[opp], turn);
      const winnerKey = end.winner;
      const won = winnerKey === owned;
      const loserKey = won ? opp : owned;
      store.recordBattle(winnerKey, loserKey, styles);
      const dom = dominant(store.get(owned));
      store.learnFromBout({ key: owned, opponentName: byKey[opp]?.name || opp, won, axisLabel: dom.axis.label });
      if (won) store.setBalance(useChampions.getState().crowns + GROUNDS_WIN_REWARD);
      store.awardTrainerXp(won ? TRAINER_XP.boutWin : TRAINER_XP.boutLoss);
      setMatchView(null);
      setOpponent(null);
      outcomeSfx(won);
      if (won) {
        // pay off: claim the tier (fires the existing tier-up Celebration via the
        // lastEvolution effect) and reflect in the champion's own voice.
        store.claimTier(owned);
        const name = byKey[owned]?.name ?? owned;
        setCompanionBeat({ key: owned, kicker: "TRIAL WON · REFORGED", lines: [{ speaker: name, text: championRankedFinale(owned) }] });
      } else {
        // lost — the tier stays owed; let them try again from the nomination.
        setTrialNom({ key: owned, tier });
      }
    });
  }, [owned, roster, store, getRecipe, bout, byKey]);

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
    // Home advantage: send the world/region id — server maps it to Force bias
    // (never trust a client-supplied bias= query).
    const regionBias = world.region ? FOUNDING_REGIONS.find((r) => r.id === world.region)?.bias ?? null : null;
    const worldParam = world.region ? `&world=${encodeURIComponent(world.id)}` : "";
    const rank = tok ? `&rank=1&tok=${encodeURIComponent(tok)}&oid=${encodeURIComponent(oid)}&h=${encodeURIComponent(getHandle())}${betParam}${worldParam}` : "";
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
        if (iWon && !store.force && !clanInviteSeen.current && isFirstDuelComplete()) setClanInvite(true);
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
      if (afterReader > beforeReader) ladders.push(`Trainer L${afterReader}`);

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
      setPendingBeat({
        key: owned,
        won: iWon,
        opponent: byKey[opponent]?.name || opponent,
        ranked: !!(ranked && iWon),
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
    setPendingBeat(null);
    setCompanionBeat(null);
  }

  function dismissMatch() {
    if (pendingBeat && owned && byKey[owned]) {
      const { key, won, opponent: oppName, ranked } = pendingBeat;
      const mem = store.recipes[key]?.memory?.[0] ?? null;
      const name = byKey[key]?.name ?? key;
      const lines: { speaker: string; text: string }[] = [];
      if (won && ranked) lines.push({ speaker: name, text: championRankedFinale(key) });
      lines.push({ speaker: name, text: championAfterFight(key, won, oppName, mem) });
      setCompanionBeat({
        key,
        kicker: won ? "AFTER THE DUEL" : "AFTER THE LOSS",
        lines,
      });
      setPendingBeat(null);
      setResult(null);
      setOverlay("none");
      return;
    }
    closeMatch();
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
  // Guest Ascent flies before claim — do NOT treat that as "picking" or the
  // Circuit HUD (RUN OVER / lives) never mounts and the second death soft-locks.
  const pickingChampion =
    mounted && !owned && roster.length > 0 && !inFirstDuelSetup && !guestAscentReady && isFirstDuelComplete();
  // A new player hasn't owned a champion or won their first duel yet. This also
  // covers the brief limbo after the intro closes but before the roster has
  // loaded and the picker mounts — without it, the empty hub world + season
  // banner flash through for a moment.
  const awaitingFirstDuel = mounted && !owned && !isFirstDuelComplete();
  // The heavy 3D Grounds (terrain, flora, rigged champions, physics) must NOT
  // mount while an onboarding overlay fully covers it — it can't be seen yet, and
  // rendering it there starves the cinematic / picker of the GPU (the ~15s "empty
  // world" stall before champion select). Keep it unmounted through the cinematic,
  // the pre-picker gap, and champion select (so the picker's own 3D gets the GPU).
  // It mounts during `train` — the last step before the bell — BEHIND the opaque
  // tuning modal, so it's warm (camera ref + assets ready) for the first fight,
  // where `owned` is set and the world is finally shown.
  // Guest Ascent: world mounts after summon so Circuit can load; pick stays deferred.
  const worldOccluded =
    showIntro ||
    firstDuelPhase === "pick" ||
    (awaitingFirstDuel && firstDuelPhase === null && !guestAscentReady);
  const showWorld =
    mounted && !!gpu?.ok && !glCreateFailed && !rosterError && roster.length > 0 && !worldOccluded;
  const showDock =
    !showIntro &&
    !showMatch &&
    overlay === "none" &&
    !gRun &&
    !pickingChampion &&
    !inFirstDuelSetup &&
    (!awaitingFirstDuel || guestAscentReady);
  const dockPad = showDock ? DOCK_H + 8 : 0;
  // Guest Circuit still needs HUD; hide only during summon / pick overlays.
  const showHud =
    mounted &&
    !showIntro &&
    !pickingChampion &&
    !inFirstDuelSetup &&
    (!awaitingFirstDuel || guestAscentReady);
  const [hudDim, setHudDim] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hasPad, setHasPad] = useState(false);
  // World-nav chrome (compass, hub chip, world picker) only while freely roaming
  // the 3D scene. Hide whenever a sheet, cinematic beat, or modal owns the screen
  // — the compass sat at z-index 100 above CharacterBeat (92), breaking keeper
  // dialogues and other overlays.
  const cinematicOpen =
    seasonBeat || !!rivalBeat || !!wakeKey || !!flightKey || imprintTease || !!keeperIntroPending || !!companionBeat || !!trialNom || !!clanCeremony;
  /** Sheets / cinematics that must own the screen alone — no orphan toasts on top. */
  const sheetOwnsScreen =
    showMatch ||
    overlay !== "none" ||
    !!gRun ||
    !!travelCard ||
    !!claiming ||
    controlsOpen ||
    settingsOpen ||
    clanOpen ||
    cinematicOpen;
  const worldUiBlocked =
    sheetOwnsScreen ||
    !!nodeFlash ||
    !!goalFlash ||
    !!evoFlash ||
    !!pledgeFlash;
  const showCompass = showHud && !worldUiBlocked && owned && !isHub && !inVenue;
  // Reserve bottom space only when the compass is actually visible.
  const compassReserve = showCompass ? (isMobile ? 84 : 104) : 0;

  // Kill ephemeral chrome the moment another surface owns the screen.
  useEffect(() => {
    if (!sheetOwnsScreen) return;
    setModeLockToast(null);
    setNodeFlash(null);
    setGoalFlash(null);
    setEvoFlash(null);
    setPledgeFlash(null);
    setCircuitOvertakeToast(false);
    setCircuitTeachMsg(null);
    if (nodeFlashTimer.current) clearTimeout(nodeFlashTimer.current);
    if (goalFlashTimer.current) clearTimeout(goalFlashTimer.current);
    if (evoFlashTimer.current) clearTimeout(evoFlashTimer.current);
    if (pledgeFlashTimer.current) clearTimeout(pledgeFlashTimer.current);
    if (circuitTeachTimer.current != null) {
      window.clearTimeout(circuitTeachTimer.current);
      circuitTeachTimer.current = null;
    }
  }, [sheetOwnsScreen]);
  useEffect(() => {
    if (!modeLockToast) return;
    const t = window.setTimeout(() => setModeLockToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [modeLockToast]);

  // Empathy beat: after the Concord coach ends and they land in a region, their
  // champion asks for one Imprint — then a soft raise nudge (not the full Train sheet).
  useEffect(() => {
    if (!mounted || !owned || imprintTease || regionRaiseCoach) return;
    if (isHub || inVenue || showMatch || overlay !== "none") return;
    if (concordCoach || wakeKey || flightKey || travelCard || claimArriveCover) return;
    try {
      if (localStorage.getItem(STORAGE.imprintCoach) === "1") return;
      if (localStorage.getItem(STORAGE.concordCoach) !== "1") return;
      if (!isFirstDuelComplete()) return;
      setImprintTease(true);
    } catch {}
  }, [
    mounted,
    owned,
    imprintTease,
    regionRaiseCoach,
    isHub,
    inVenue,
    showMatch,
    overlay,
    concordCoach,
    wakeKey,
    flightKey,
    travelCard,
    claimArriveCover,
  ]);

  // Post-claim remount: force Concord, pose at outer spawn facing Grounds gate, then lift cover.
  useEffect(() => {
    if (!claimArriveCover || !showWorld || !owned) return;
    if (worldId !== "concord") {
      saveLastWorld("concord");
      setWorldId("concord");
      return; // wait for Concord world to mount, then pose
    }
    const faceGate = Math.atan2(
      groundsGatePos[0] - CONCORD_SPAWN[0],
      groundsGatePos[2] - CONCORD_SPAWN[1],
    );
    setWildResume({ x: CONCORD_SPAWN[0], z: CONCORD_SPAWN[1], heading: faceGate });
    let tries = 0;
    const id = window.setInterval(() => {
      tries += 1;
      if (travelRef.current) {
        travelRef.current(CONCORD_SPAWN[0], CONCORD_SPAWN[1], faceGate);
      }
      if ((travelRef.current && tries >= 8) || tries >= 40) {
        window.clearInterval(id);
        window.setTimeout(() => setClaimArriveCover(false), 320);
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [claimArriveCover, showWorld, owned, worldId, groundsGatePos]);

  const audioVolume = useSettings((s) => s.volume);
  const voiceOn = useSettings((s) => s.voice);
  const alwaysShowHud = useSettings((s) => s.alwaysShowHud);

  // Auto-open controls ONCE on free roam — never over the Circuit. Ascent already
  // teaches "Jump to start"; the full WASD/jet sheet is for the wilds after.
  useEffect(() => {
    if (!showHud || showMatch || overlay !== "none" || gRun || inVenue) return;
    if (!owned || modesLocked || !isFirstDuelComplete()) return;
    if (concordCoach || readerSplitStep !== null) return; // don't stack on coaches
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE.controlsSeen)) return;
    const t = setTimeout(() => {
      if (localStorage.getItem(STORAGE.controlsSeen)) return;
      if (gameSession) return; // still in a venue
      localStorage.setItem(STORAGE.controlsSeen, "1");
      setControlsOpen(true);
    }, 700);
    return () => clearTimeout(t);
  }, [showHud, showMatch, overlay, gRun, owned, modesLocked, concordCoach, readerSplitStep, inVenue, gameSession]);

  // Celebrate a TIER-UP the moment the player is back in the world (level-ups are
  // already chipped on the duel result card; the tier crossing — which bolts a new
  // body part onto the champion — was previously never surfaced at all).
  const lastEvolution = store.lastEvolution;
  useEffect(() => {
    if (!lastEvolution || !lastEvolution.tieredUp) return;
    if (showMatch || overlay !== "none" || gRun) return; // wait until the result card clears
    setEvoFlash(lastEvolution);
    // felt flourish — a rising stinger + a swell in the score so the tier-up lands
    // as an event, not just a text card.
    evolveStinger();
    ambienceFlourish("victory");
    store.clearEvolution();
    if (evoFlashTimer.current) clearTimeout(evoFlashTimer.current);
    evoFlashTimer.current = setTimeout(() => setEvoFlash(null), 3800);
  }, [lastEvolution, showMatch, overlay, gRun, store]);

  // Promotion Trials: a bout crossed into an unclaimed tier — raise a nomination
  // (a real trial duel is owed) instead of granting the tier. Off unless TRIALS.
  useEffect(() => {
    if (!TRIALS || !lastEvolution || !lastEvolution.pendingTrial) return;
    if (showMatch || overlay !== "none" || gRun) return;
    setTrialNom({ key: lastEvolution.key, tier: lastEvolution.tier });
    store.clearEvolution();
  }, [lastEvolution, showMatch, overlay, gRun, store]);

  useEffect(() => {
    // Never auto-dim on touch / TV: the dimmed HUD wakes on :hover (CSS) which
    // never fires without a pointer, so a tap player would be left peering at an
    // 18%-opacity HUD with no obvious way to restore it. Dimming is a
    // mouse-affordance only — it declutters for desktop players who've gone idle.
    if (!showHud || showMatch || overlay !== "none" || gRun || isTouch || alwaysShowHud) {
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
    return () => {
      clearTimeout(idle);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("keydown", wake);
    };
  }, [showHud, showMatch, overlay, gRun, isTouch, alwaysShowHud]);

  // Audio bridge — push the one master volume into the three sound engines, and
  // treat "voices off" as voice-volume 0 so it composes with the hard master
  // mute (STORAGE.sound) owned by <AmbientToggle/> rather than fighting it.
  useEffect(() => {
    setSfxVolume(audioVolume);
    setAmbienceVolume(audioVolume);
    setCreatureVoiceVolume(voiceOn ? audioVolume : 0);
  }, [audioVolume, voiceOn]);

  // Gamepad — start the shared poll, track connection for glyph hints, and drain
  // the discrete X (interact) / Start (pause) edges here at the screen level
  // (movement, camera, jump, land, sprint are read inside the world rig).
  useEffect(() => {
    startGamepad(setHasPad);
    const pad = getPad();
    let prevInteract = pad.interact;
    let prevPause = pad.pause;
    let raf = 0;
    const loop = () => {
      if (pad.interact !== prevInteract) {
        prevInteract = pad.interact;
        if (!settingsOpen) interact();
      }
      if (pad.pause !== prevPause) {
        prevPause = pad.pause;
        setSettingsOpen((o) => !o);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [interact, settingsOpen]);

  // Esc opens / closes Settings when nothing else owns the key. Other overlays
  // (controls sheet, match overlays) handle their own Esc and take precedence.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (controlsOpen) return;
      if (overlay !== "none" || showMatch || gRun) return;
      e.preventDefault();
      setSettingsOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [controlsOpen, overlay, showMatch, gRun]);

  return (
    <main className="fill-shell fill-shell--immersive" style={{ position: "relative", overflow: "hidden", background: "var(--bg)" }}>
      {mounted && gpu && !gpu.ok && !gpu.tryAnyway && (
        <RenderNotice
          title="3D isn’t available in this browser"
          body={
            <>
              Flight needs WebGL, which your browser couldn&apos;t start. In Chrome or Brave, open{" "}
              <b>Settings → System</b> and turn on <b>&ldquo;Use graphics acceleration when available&rdquo;</b>, then restart the
              browser. If it&apos;s already on, check <span className="mono">chrome://gpu</span>.
            </>
          }
          detail={gpu.reason ? `webgl: ${gpu.reason}` : undefined}
          onRetry={() => {
            clearGpuStatusCache();
            setGpu(gpuStatus({ refresh: true }));
            setReloadKey((k) => k + 1);
          }}
        />
      )}

      {mounted && glCreateFailed && (
        <RenderNotice
          title="Your browser turned off its GPU"
          body={
            <>
              Chrome/Brave disabled WebGL for this session. The settings toggle can still be ON — if{" "}
              <span className="mono">chrome://gpu</span> says{" "}
              <i>GPU access is disabled due to frequent crashes</i>, the GPU process crashed and Chrome locked it
              out. To recover:
              <br />
              <b>1.</b> Close other GPU-heavy apps (local AI / Metal servers, other WebGL tabs).
              <br />
              <b>2.</b> Fully quit the browser (Cmd+Q — not just the window) and reopen.
              <br />
              <b>3.</b> Confirm <span className="mono">chrome://settings/system</span> has{" "}
              <b>“Use graphics acceleration when available”</b> ON.
              <br />
              <b>4.</b> Check <span className="mono">chrome://gpu</span> — “WebGL” should say{" "}
              <i>Hardware accelerated</i> (not Disabled).
            </>
          }
          detail="GL_RENDERER = Disabled · often: GPU process crash lockout"
          onRetry={() => {
            resetWebglHardFailed();
            clearGpuStatusCache();
            setGpu(gpuStatus({ refresh: true }));
            setReloadKey((k) => k + 1);
          }}
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

      {showWorld && (
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
              key={`${world.id}-${activeVenue ?? "wild"}-${reloadKey}`}
              champions={showMatch ? matchChampions : champions}
              ownedKey={activeVenue === "circuit" ? circuitActiveKey : owned}
              onNear={setNear}
              match={showMatch ? matchView : null}
              onGlReady={() => resetWebglHardFailed()}
              controlsEnabled={
                controlsEnabled &&
                (!activeVenue ||
                  activeVenue === "amphitheatre" ||
                  (activeVenue === "circuit" &&
                    circuitPhase !== "failed" &&
                    circuitPhase !== "done" &&
                    circuitPhase !== "sector" &&
                    circuitPhase !== "continue" &&
                    circuitPhase !== "ceiling" &&
                    circuitPhase !== "ranklock" &&
                    circuitPhase !== "prove"))
              }
              biome={biome}
              regionWorldId={worldId}
              activeVenue={activeVenue}
              venueHostWorldId={venueHostWorldId}
              circuitTrack={circuitTrack}
              circuitSectorIdx={circuitSectorIdx}
              circuitPhase={activeVenue === "circuit" ? circuitPhase : null}
              onCircuitPass={activeVenue === "circuit" ? onCircuitPass : undefined}
              onCircuitFail={activeVenue === "circuit" ? onCircuitFail : undefined}
              onCircuitStart={activeVenue === "circuit" ? onCircuitStart : undefined}
              onCircuitSample={activeVenue === "circuit" ? onCircuitSample : undefined}
              circuitCpNextRef={activeVenue === "circuit" ? circuitCpNext : undefined}
              circuitHazards={activeVenue === "circuit" ? circuitHazards : []}
              onCircuitStumble={activeVenue === "circuit" ? onCircuitStumble : undefined}
              circuitGhost={activeVenue === "circuit" ? circuitGhost : null}
              onCircuitGhostDone={activeVenue === "circuit" ? () => setCircuitGhost(null) : undefined}
              circuitArriveNonce={activeVenue === "circuit" ? circuitArriveNonce : 0}
              circuitGhostForce={store.force}
              circuitGhostMind={
                activeVenue === "circuit" ? circuitChallenge?.mind ?? null : null
              }
              circuitGhostPath={
                activeVenue === "circuit"
                  ? ghostPathForSector(circuitChallenge?.path, circuitSectorIdx)
                  : null
              }
              circuitGhostRunStartMs={activeVenue === "circuit" ? circuitGhostRunStartMs : 0}
              circuitGhostSectorKey={activeVenue === "circuit" ? circuitSectorIdx : 0}
              circuitCrownCache={activeVenue === "circuit" ? crownCache : null}
              onCircuitCrownCollect={activeVenue === "circuit" ? onCircuitCrownCollect : undefined}
              circuitFogNearMult={activeVenue === "circuit" ? (circuitModifier?.fogNearMult ?? 1) * runMods.fogNearMult : 1}
              circuitMoteColor={
                activeVenue === "circuit" ? runMods.moteColor ?? circuitModifier?.moteColor ?? null : null
              }
              circuitWarm={activeVenue === "circuit" && !!(circuitModifier?.warm || runMods.warm)}
              ascentReaches={activeVenue === "circuit" ? ascentReaches : 0}
              ascentSigilAccent={activeVenue === "circuit" ? ascentSigilAccent : undefined}
              resumeSpawn={!activeVenue ? wildResume : null}
              towerAgents={isHub || inVenue ? [] : towerAgents}
              nodes={liveNodes}
              goals={isHub ? [] : liveGoals}
              peakCleared={!isHub && !inVenue && peakCleared}
              summitRevealNonce={isHub || inVenue ? 0 : summitRevealNonce}
              gates={isHub ? CONCORD_GATES : []}
              pledged={store.force}
              choosingClan={clanOpen}
              clanPreview={clanOpen ? clanPreview : null}
              clanCeremony={!!clanCeremony}
              clanShot={clanShotTarget}
              tier={growth?.tier ?? 0}
              featuredWorld={isHub ? featuredWorld : null}
              guideWorld={guideWorld}
              guideUrgent={false}
              muteClanInvite={firstRunGuide}
              onAltitude={onAltitude}
              onPose={onPose}
              travelRef={travelRef}
              touchBottomInset={isTouch ? dockPad + compassReserve : 0}
              worldLife={worldLife}
              trainerXp={store.trainerXp}
              gpuLite={gpuLite}
            />
          </RenderBoundary>
        </div>
      )}

      {/* HUD — sits above the WebGL canvas and touch layer */}
      {showHud && (
      <div className={`grounds-hud${hudDim ? " is-dim" : ""}`} style={{ position: "absolute", top: 14, left: 58, zIndex: 100, pointerEvents: "none", maxWidth: isMobile ? "calc(100vw - 148px)" : 400 }}>
        {!showMatch && overlay === "none" && owned && !gRun && !inVenue && !worldUiBlocked && (
          <div style={{ pointerEvents: "auto", position: "relative", marginBottom: isMobile ? 6 : 10 }}>
            {worldMenu && (
              <div className="panel pop" style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, padding: 8, display: "flex", flexDirection: "column", gap: 6, width: 260, maxWidth: "calc(100vw - 32px)", zIndex: 2 }}>
                <span className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--muted2)", padding: "0 2px" }}>CHOOSE A WORLD</span>
                {NAV_WORLDS.map((w) => {
                  const ac = w.biome.lights.arenaPoint;
                  const on = w.id === worldId;
                  return (
                    <button
                      key={w.id}
                      onClick={() => {
                        if (w.id !== worldId) arrivedFromHubRef.current = true;
                        setWorldId(w.id);
                        setWorldMenu(false);
                      }}
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
                <button
                  type="button"
                  onClick={goFlight}
                  className="btn btn-primary"
                  style={{
                    ["--ac" as string]: VENUES.circuit.color,
                    width: "100%",
                    fontSize: 12,
                    marginTop: 2,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                  }}
                >
                  <Rocket size={14} strokeWidth={2.2} />
                  Take flight · {world.name}
                </button>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "stretch", gap: 6, flexWrap: "wrap" }}>
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
                {!isMobile && (
                  <span style={{ fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {world.name}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={goFlight}
                className="panel"
                aria-label="Take flight"
                title="Take flight — rings in the sky"
                style={{
                  ["--ac" as string]: VENUES.circuit.color,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: isMobile ? "8px 11px" : "8px 12px",
                  cursor: "pointer",
                  borderColor: VENUES.circuit.color,
                  background: "color-mix(in srgb, #39e0ff 12%, transparent)",
                  touchAction: "manipulation",
                  color: "var(--ink)",
                }}
              >
                <Rocket size={16} color={VENUES.circuit.color} strokeWidth={2.2} />
                <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                  {isMobile ? "Flight" : "Take flight"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Season waits until first-run coaches clear — one story at a time. */}
        {!isMobile &&
          overlay === "none" &&
          !showMatch &&
          !inVenue &&
          !worldUiBlocked &&
          showChronicle &&
          !concordCoach &&
          !claimArriveCover &&
          !imprintTease &&
          !regionRaiseCoach && (
          <div style={{ marginTop: 12, width: 320, maxWidth: "calc(100vw - 32px)", pointerEvents: "auto" }}>
            <SeasonBanner compact onClose={dismissChronicle} />
          </div>
        )}
        {!isMobile && overlay === "none" && !showMatch && isHub && !inVenue && owned && !gRun && !modesLocked && !worldUiBlocked && rival && rivalMemory && (
          <div style={{ marginTop: 10 }}>
            <RivalCard
              rival={rival}
              memory={rivalMemory}
              onFace={() => {
                const mem = maybeEscalateRival(loadRivalMemory());
                setRivalMemory(mem);
                setRival(currentRival(mem));
                setRivalBeat({ phase: "before" });
              }}
            />
          </div>
        )}
      </div>
      )}
      {/* Trainer hub — out of Circuit so the flight HUD owns top chrome. */}
      {showHud && !worldUiBlocked && activeVenue !== "circuit" && (
      <div className={`grounds-hud${hudDim ? " is-dim" : ""}`} style={{ position: "absolute", top: 14, right: 16, display: "flex", alignItems: "center", gap: isMobile ? 5 : 8, zIndex: 100, pointerEvents: "auto" }}>
        <PlayerHub
          isMobile={isMobile}
          crowns={crowns}
          war={war}
          goals={allGoals}
          goalsDone={doneGoals}
          fragments={fragments}
          nodesLeft={liveNodes.length}
          regionName={world.name}
          inRegion={!!owned && !isHub && !inVenue}
          hudDim={hudDim}
          highlight={goalCoach && !isHub && !inVenue && liveGoals.length > 0}
          onHighlightOpen={dismissGoalCoach}
          onOpen={() => setModeLockToast(null)}
          onTakeFlight={!inVenue ? goFlight : undefined}
          onOpenControls={() => {
            setModeLockToast(null);
            setControlsOpen(true);
          }}
          onOpenSettings={() => {
            setModeLockToast(null);
            setSettingsOpen(true);
          }}
          onOpenClan={() => {
            if (modesLocked) {
              setModeLockToast("Finish your first duel to unlock Clans.");
              return;
            }
            setModeLockToast(null);
            setClanPreselect(null);
            setClanOpen(true);
          }}
        />
      </div>
      )}

      {/* Director — Hub idle: one next thing so the plaza never reads as "you're done". */}
      {showHud &&
        !worldUiBlocked &&
        isHub &&
        !inVenue &&
        owned &&
        overlay === "none" &&
        !showMatch &&
        !gRun &&
        !concordCoach &&
        !travelCard && (
        <div
          className="grounds-hud"
          style={{
            position: "absolute",
            left: "50%",
            bottom: isMobile ? 88 : 28,
            transform: "translateX(-50%)",
            zIndex: 95,
            width: "min(420px, calc(100vw - 32px))",
            pointerEvents: "auto",
          }}
        >
          <NextCard
            hideAlso={["daily"]}
            onGo={(target) => {
              if (target === "flight" || target === "claim") goFlight();
              else if (target === "daily") setOverlay("daily");
              else if (target === "collection") router.push("/collection");
              else if (target === "train" && owned) setOverlay("train");
              else if (target === "champion" && owned) router.push(`/champion/${owned}`);
              // hub — already here; region unlocks are a walk to a gate
            }}
          />
        </div>
      )}

      {/* altitude / tower HUD — on mobile we keep only the altitude readout */}
      {showHud && !showMatch && overlay === "none" && !isHub && !inVenue && !worldUiBlocked && towerAgents.length > 0 && (
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
      {showCompass && (
        <div
          className={`grounds-hud${hudDim ? " is-dim" : ""}`}
          style={{ position: "absolute", left: 0, right: 0, bottom: isMobile ? 12 : 16, display: "flex", justifyContent: "center", padding: isMobile ? "0 12px" : "0 16px", zIndex: 44, pointerEvents: "none" }}
        >
          <Compass
            landmarks={landmarks}
            goals={allGoals}
            goalsDone={doneGoals}
            caches={liveNodes}
            poseRef={poseRef}
            onTravel={fastTravel}
            fragments={fragments}
            nodesLeft={liveNodes.length}
            isMobile={isMobile}
          />
        </div>
      )}

      {/* cache-claimed celebration — never over a sheet/modal */}
      {nodeFlash && !sheetOwnsScreen && (
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
      {/* Wait for TravelVeil to finish — otherwise SectorIntro 1/100 punches through
          TAKE FLIGHT / Preparing the climb and stacks with the summon beat. */}
      {activeVenue === "circuit" &&
        !travelCard &&
        overlay === "none" &&
        !showMatch &&
        circuitPhase !== "prove" &&
        (showHud || circuitGuest) && (
        <CircuitHud
          phase={circuitPhase}
          sectorIndex={circuitSectorIdx}
          runMs={circuitRunMs}
          sectorMs={circuitSectorMs}
          cpNext={circuitCpPassed}
          cpTotal={circuitTrack.checkpoints.length}
          personalBest={circuitPersonalBest}
          board={circuitBoard}
          boardLoading={circuitBoardLoading}
          onContinue={advanceCircuitSector}
          onRestart={resetCircuitRun}
          // Guests get top-right "Claim a champion" (continue) — not Exit Ascent.
          onExit={circuitGuest ? undefined : leaveAscent}
          onShareChallenge={shareCircuitChallenge}
          shareChallengeLabel={isTouch ? "Share challenge" : "Copy challenge link"}
          shareMsg={circuitShareMsg}
          teachMsg={circuitTeachMsg}
          clearSnap={circuitClearSnap}
          sectorModifierLabel={circuitModifier?.label ?? null}
          expeditionOpen={expeditionOpen}
          onProve={
            circuitGuest
              ? undefined
              : () => {
                  track("climb_prove_open");
                  setCircuitPhase("prove");
                }
          }
          onClaim={circuitGuest ? openCircuitClaimPicker : undefined}
          claimName={circuitGuest ? ROSTER[loanerKey]?.name ?? "this mind" : null}
          onToHub={!circuitGuest ? leaveAscent : undefined}
          hubLabel={venueHostWorldId === "concord" ? "To the Hub" : "Leave Flight"}
          challengeResult={circuitChallengeResult}
          challengeLabel={circuitChallenge?.name || (circuitChallenge ? "CHALLENGE" : null)}
          accent={circuitReach.accent}
          compact={isMobile}
          failReason={circuitFailReason}
          sectorTotal={circuitRouteCap}
          reachName={circuitReach.name}
          lives={circuitLives}
          maxLives={runMods.lives}
          runMode={circuitRunMode}
          campsLit={campsLit}
          scoutCamp={circuitScoutCamp}
          onPickRanked={!circuitGuest ? pickCircuitRanked : undefined}
          onPickScout={!circuitGuest ? pickCircuitScout : undefined}
          onPickExpedition={!circuitGuest && expeditionOpen ? pickCircuitExpedition : undefined}
          expeditionLabel={expedition.name}
          expeditionDetail={expedition.gloss}
          showModePicker={
            !circuitGuest &&
            circuitPhase === "ready" &&
            circuitLives === runMods.lives &&
            circuitSectorIdx === circuitStartSectorRef.current
          }
          ascentReaches={ascentReaches}
          climbHundred={climbHundred}
          scoutUnlocked={scoutUnlocked}
          rankLockKicker={rankLock.kicker}
          rankLockTitle={rankLock.title}
          rankLockDetail={rankLock.detail}
          conditionLine={
            !circuitGuest && circuitRunMode === "expedition"
              ? `WEEK · ${expedition.name.toUpperCase()} · ${expedition.condition.name.toUpperCase()}`
              : !circuitGuest && circuitRunMode === "ranked" && activeCondition.id !== "clear"
                ? `TODAY · ${activeCondition.name.toUpperCase()}`
                : undefined
          }
          conditionDetail={activeCondition.gloss}
          wingLine={!circuitGuest && wingLoadout.length ? loadoutLine(wingLoadout) : undefined}
          formLine={
            career && (career.form !== "steady" || career.fatigue > 0 || career.scars.length > 0)
              ? `FORM · ${career.formLabel.toUpperCase()}${career.fatigue > 0 ? ` · ${career.fatigueLabel.toUpperCase()}` : ""}${career.scars[0] ? ` · ${career.scars[0].name.toUpperCase()}` : ""}`
              : undefined
          }
          formDetail={career?.scars.map((s) => s.gloss).join(" · ") || undefined}
          earnedWingOptions={!circuitGuest ? earnedOptions : undefined}
          earnedWingPick={wingLoadout[1] ?? null}
          onPickEarnedWing={
            !circuitGuest ? (id) => setEarnedPick(id as WingTraitId) : undefined
          }
        />
      )}

      {activeVenue === "circuit" &&
        circuitOvertakeToast &&
        !sheetOwnsScreen &&
        circuitPhase !== "failed" &&
        circuitPhase !== "done" &&
        circuitPhase !== "continue" &&
        circuitPhase !== "prove" &&
        circuitPhase !== "sector" && (
          <ChallengeOvertakeToast
            name={circuitChallenge?.name}
            accent={circuitReach.accent}
            onDone={() => setCircuitOvertakeToast(false)}
          />
        )}

      {activeVenue === "circuit" &&
        !travelCard &&
        circuitChallenge &&
        !circuitChallengeDismissed &&
        (circuitPhase === "ready" || circuitPhase === "running") && (
        <div
          style={{
            position: "absolute",
            top: 108,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 130,
            width: "min(420px, calc(100vw - 120px))",
            padding: "10px 12px",
            borderRadius: 12,
            border: `1px solid ${circuitReach.accent}`,
            background: "rgba(8,7,14,.88)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            pointerEvents: "auto",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 9, letterSpacing: 1.4, color: circuitReach.accent }}>
              CHALLENGE
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
              Beat {circuitChallenge.name || "a Trainer"} · {circuitChallenge.sectors}/{DESKTOP_CIRCUIT_COUNT}
              {circuitChallenge.totalMs > 0 ? ` · ${formatCircuitMs(circuitChallenge.totalMs)}` : ""}
            </div>
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
              {ghostPathHasSamples(circuitChallenge.path)
                  ? "Ghost flies beside you — clear deeper or faster to win"
                : "Clear deeper (or same depth, faster) to claim the win"}
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss challenge"
            className="panel"
            onClick={() => setCircuitChallengeDismissed(true)}
            style={{ width: 32, height: 32, padding: 0, display: "grid", placeItems: "center", cursor: "pointer" }}
          >
            <X size={14} strokeWidth={2.2} />
          </button>
        </div>
      )}

      {activeVenue === "circuit" && circuitPhase === "prove" && owned && (
        <ClimbProveGate
          activeKey={owned}
          accent={circuitReach.accent}
          onClose={() => setCircuitPhase("ceiling")}
          onWon={() => {
            setCircuitSectorIdx(10);
            circuitCpNext.current = 1;
            setCircuitCpPassed(1);
            setCircuitSectorMs(0);
            circuitSectorStart.current = 0;
            setCircuitPhase("ready");
            setCircuitArriveNonce((n) => n + 1);
            track("climb_prove_resume");
            const s = desktopCircuitSector(10).spawn;
            setTimeout(() => travelRef.current?.(s[0], s[2], 0), 50);
          }}
        />
      )}

      {/* stumble flash — a hazard clipped you (a shove, not a death): a red edge
          pulse so the hit reads even when your eyes are on the next ring */}
      {activeVenue === "circuit" && circuitStumble && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 90,
            pointerEvents: "none",
            boxShadow: "inset 0 0 120px 20px rgba(255,60,60,0.55)",
            animation: "none",
          }}
        />
      )}

      {goalCoach && owned && !sheetOwnsScreen && !isHub && !inVenue && liveGoals.length > 0 && readerSplitStep === null && (
        <ObjectiveToasts goals={liveGoals} isMobile={isMobile} onDone={dismissGoalCoach} />
      )}

      {/* Post-claim remount cover — hides empty Concord while the world + pose settle. */}
      {claimArriveCover && (
        <div
          aria-live="polite"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            display: "grid",
            placeItems: "center",
            background: "radial-gradient(120% 90% at 50% 38%, #1a1428 0%, #0a0712 55%, #050309 100%)",
            color: "#f2eefb",
          }}
        >
          <div style={{ textAlign: "center", padding: 24 }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: 3, color: "#f0a93a", opacity: 0.9 }}>
              ARRIVING
            </div>
            <div style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: 800, marginTop: 10 }}>The Hub</div>
            <div className="mono" style={{ fontSize: 12, color: "var(--muted2)", marginTop: 8, maxWidth: 320, lineHeight: 1.45 }}>
              Fly the lit gate to your first region.
            </div>
          </div>
        </div>
      )}

      {/* Quiet first-land coach — one line, lit gate in the world does the rest. */}
      {concordCoach && guideNudge && readerSplitStep === null && owned && isHub && !inVenue && !sheetOwnsScreen && !inFirstDuelSetup && !claimArriveCover && near?.kind !== "gate" && (
        <div style={{ position: "absolute", bottom: (isMobile ? 96 : 70) + compassReserve, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 59, padding: isMobile ? "0 104px 0 16px" : "0 16px" }}>
          <div
            className="panel pop"
            style={{ ["--ac" as string]: "#cdb8ff", pointerEvents: "auto", display: "flex", alignItems: "center", gap: 12, padding: "9px 13px", maxWidth: 480, borderColor: "#cdb8ff" }}
          >
            <span style={{ fontSize: 16, color: "#cdb8ff", flexShrink: 0 }}>◎</span>
            <span style={{ fontSize: 12, lineHeight: 1.35 }}>
              Fly the lit gate to your <strong>first region</strong>.
            </span>
            <button
              onClick={() => fastTravel(groundsGatePos)}
              className="btn btn-primary"
              style={{ ["--ac" as string]: "var(--gold)", fontSize: 11, padding: "4px 10px", flexShrink: 0, whiteSpace: "nowrap" }}
            >
              Take me there
            </button>
            <button onClick={dismissGuideNudge} className="btn" style={{ ["--ac" as string]: "var(--line2)", fontSize: 11, padding: "4px 10px", flexShrink: 0 }}>Skip</button>
          </div>
        </div>
      )}

      {readerSplitStep !== null && !isHub && owned && !sheetOwnsScreen && !inFirstDuelSetup && (
        <div style={{ position: "absolute", bottom: (isMobile ? 96 : 70) + compassReserve, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 60, padding: isMobile ? "0 104px 0 16px" : "0 16px" }}>
          <div className="panel pop" style={{ ["--ac" as string]: "var(--gold)", pointerEvents: "auto", maxWidth: 520, width: "100%", padding: "14px 16px", borderColor: "var(--gold)", textAlign: "center" }}>
            {readerSplitStep === 0 ? (
              <>
                <div className="mono" style={{ fontSize: 9, letterSpacing: 2, color: "var(--gold)", marginBottom: 6 }}>YOU, THE TRAINER</div>
                <p style={{ fontSize: 13, lineHeight: 1.45, margin: "0 0 12px" }}>
                  <strong>This is you.</strong> Move with WASD / the stick, and <strong>hold <span className="mono">Space</span> to fly</strong>. The Grounds are yours to soar.
                </p>
                <button type="button" className="btn btn-primary" style={{ ["--ac" as string]: "var(--gold)", width: "100%", fontSize: 13 }} onClick={() => setReaderSplitStep(1)}>
                  Meet your champion
                </button>
              </>
            ) : (
              <>
                <div className="mono" style={{ fontSize: 9, letterSpacing: 2, color: "var(--gold)", marginBottom: 6 }}>
                  {owned && byKey[owned] ? byKey[owned].name : "YOUR CHAMPION"}
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.45, margin: "0 0 12px" }}>
                  {READER_COPY.walkFightLine(owned && byKey[owned] ? byKey[owned].name : undefined)} Take off together. Fly out and explore, chase the <strong>tower</strong> on the horizon.
                </p>
                <button type="button" className="btn" style={{ ["--ac" as string]: "var(--line2)", fontSize: 11, padding: "6px 12px" }} onClick={dismissReaderSplitCoach}>
                  Skip
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* After Train — send them to the Arena (this region's fight pit), not another menu. */}
      {arenaFightCoach && !isHub && owned && !sheetOwnsScreen && !inFirstDuelSetup && (
        <div style={{ position: "absolute", bottom: (isMobile ? 96 : 70) + compassReserve, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 60, padding: isMobile ? "0 104px 0 16px" : "0 16px" }}>
          <div className="panel pop" style={{ ["--ac" as string]: "var(--good)", pointerEvents: "auto", maxWidth: 520, width: "100%", padding: "14px 16px", borderColor: "var(--good)" }}>
            <div className="mono" style={{ fontSize: 9, letterSpacing: 2, color: "var(--good)", marginBottom: 6 }}>NEXT · A REAL FIGHT</div>
            <p style={{ fontSize: 13, lineHeight: 1.45, margin: "0 0 10px" }}>
              Training&apos;s done. Walk into the glowing <strong>Arena</strong> in the middle of this region and press <span className="mono">E</span> — {owned && byKey[owned] ? byKey[owned].name : "your champion"} fights; you watch and earn Crowns.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ ["--ac" as string]: "var(--good)", fontSize: 12, flex: 1 }}
                onClick={() => {
                  setArenaFightCoach(false);
                  travelRef.current?.(0, 12, Math.PI);
                }}
              >
                To the Arena
              </button>
              <button type="button" className="btn" style={{ ["--ac" as string]: "var(--line2)", fontSize: 12 }} onClick={() => setArenaFightCoach(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* First region: after Imprint — one soft raise nudge. No Crowns / pad essay. */}
      {regionRaiseCoach && !isHub && owned && !sheetOwnsScreen && !inFirstDuelSetup && !imprintTease && !arenaFightCoach && (
        <div style={{ position: "absolute", bottom: (isMobile ? 96 : 70) + compassReserve, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 60, padding: isMobile ? "0 104px 0 16px" : "0 16px" }}>
          <div className="panel pop" style={{ ["--ac" as string]: "var(--gold)", pointerEvents: "auto", maxWidth: 420, width: "100%", padding: "14px 16px", borderColor: "var(--gold)" }}>
            <div className="mono" style={{ fontSize: 9, letterSpacing: 2, color: "var(--gold)", marginBottom: 6 }}>RAISE YOUR CHAMPION</div>
            <p style={{ fontSize: 13, lineHeight: 1.45, margin: "0 0 12px" }}>
              Teach them one short lesson — or explore first. Either works.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ ["--ac" as string]: "var(--gold)", fontSize: 12, flex: 1 }}
                onClick={() => {
                  setRegionRaiseCoach(false);
                  setOverlay("train");
                }}
              >
                Start training
              </button>
              <button type="button" className="btn" style={{ ["--ac" as string]: "var(--line2)", fontSize: 12 }} onClick={() => setRegionRaiseCoach(false)}>
                I&apos;ll explore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* first-ranked-win Clan invite — one-time, surfaces after the result
          card closes (deferred so the choice arrives when it means something) */}
      {clanInvite && owned && !store.force && !modesLocked && !sheetOwnsScreen && !result && (
        <div style={{ position: "absolute", bottom: (isMobile ? 96 : 70) + compassReserve + 64, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 59, padding: isMobile ? "0 104px 0 16px" : "0 16px" }}>
          <div className="panel pop" style={{ ["--ac" as string]: "#c77dff", pointerEvents: "auto", display: "flex", alignItems: "center", gap: 12, padding: "9px 13px", maxWidth: 480, borderColor: "#c77dff" }}>
            <span style={{ fontSize: 16, color: "#c77dff", flexShrink: 0 }}>⚑</span>
            <span style={{ fontSize: 12, lineHeight: 1.35 }}>
              <strong>First ranked win!</strong> Pick a Clan to fight for. Your wins build its season war, and home turf pays extra.
            </span>
            <button onClick={() => { dismissClanInvite(); setClanPreselect(null); setClanOpen(true); }} className="btn btn-primary" style={{ ["--ac" as string]: "#c77dff", fontSize: 11, padding: "4px 11px", flexShrink: 0 }}>Choose</button>
            <button onClick={dismissClanInvite} className="btn" style={{ ["--ac" as string]: "var(--line2)", fontSize: 11, padding: "4px 9px", flexShrink: 0 }}>Later</button>
          </div>
        </div>
      )}

      {/* goal-cleared celebration (peak / depth / secret) */}
      {goalFlash && !sheetOwnsScreen && (
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

      {/* tier-up celebration — your champion's body just evolved a new part */}
      {evoFlash && !sheetOwnsScreen && (
        <Celebration
          tone="epic"
          accent={byKey[evoFlash.key] ? TYPE_COLOR[byKey[evoFlash.key].type] : "var(--gold)"}
          kicker="EVOLUTION · TIER UP"
          title={`${byKey[evoFlash.key]?.name ?? "Your champion"} → ${evoFlash.tier}`}
          subtitle={evoFlash.unlocked ? `${evoFlash.unlocked} grew in` : undefined}
        >
          <span style={{ color: "var(--gold)" }}>L{evoFlash.newLevel}</span>
          {evoFlash.unlocked && <span style={{ color: "#c77dff" }}>✦ {evoFlash.unlocked} unlocked</span>}
        </Celebration>
      )}

      {/* the Clan decision surface — one place to choose / review / lock */}
      {clanOpen && !modesLocked && !clanCeremony && (
        <ClanSheet
          preselect={clanPreselect}
          suggested={owned ? byKey[owned]?.type ?? null : null}
          war={war}
          onClose={() => { setClanOpen(false); setClanPreview(null); }}
          onSelectionChange={setClanPreview}
          onPledged={(f) => {
            setClanOpen(false);
            setClanPreview(null);
            beginClanCeremony(f);
          }}
        />
      )}

      {/* in-world swear shot — letterbox + rising flag; skip ends into a short flash */}
      {clanCeremony && (
        <ClanCinematic
          ceremony={clanCeremony}
          onDone={() => finishClanCeremony(clanCeremony)}
        />
      )}

      {/* clan-joined celebration — brief after the ceremony (or immediately if reduced motion) */}
      {pledgeFlash && !sheetOwnsScreen && !clanCeremony && (
        <Celebration
          tone="pledge"
          accent={pledgeFlash.color}
          kicker="CLAN JOINED"
          title={pledgeFlash.name}
          subtitle={pledgeFlash.motto}
        />
      )}

      {/* Site nav + settings + theme + ambience toggle + saga + status are folded
          into the PlayerHub (top-right). The ambience engine hosts here so the
          score keeps playing whether or not the hub panel is open. */}
      <AmbienceEngine />

      {/* onboarding: choose your champion — legacy path if funnel is off */}
      {mounted && !owned && roster.length > 0 && !claiming && !inFirstDuelSetup && isFirstDuelComplete() && (
        <Onboarding roster={roster} get={store.get} onPick={setWakeKey} />
      )}

      {/* guided first claim — pick a mind, then straight into the Ascent (mobile-like). */}
      {mounted && firstDuelPhase && duelStarters.length > 0 && (
        <FirstDuelOverlay
          phase={firstDuelPhase}
          starters={duelStarters}
          selected={firstDuelPick}
          get={store.get}
          crowns={crowns}
          evolve={firstDuelEvolve}
          isMobile={isMobile}
          onPick={(key) => {
            claimAndEnterGrounds(key);
          }}
          onTrain={finishFirstDuelTrain}
          onEvolveDone={completeFirstDuel}
          onConcordDone={completeFirstDuel}
        />
      )}

      {modesLocked && !inVenue && !inFirstDuelSetup && !inMatch && overlay === "none" && !gRun && !result && guestAscentReady && (
        <FirstDuelHubCta
          isMobile={isMobile}
          onStart={() => {
            guestEnterArmed.current = false;
            playTravel(
              { kicker: "TAKE FLIGHT", title: VENUES.circuit.name, sub: owned ? "Jump to start" : "Jump to start · claim later", color: VENUES.circuit.color },
              () => enterVenue("circuit"),
            );
          }}
        />
      )}

      {modeLockToast && !sheetOwnsScreen && (
        <div style={{ position: "absolute", bottom: 120, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 48, pointerEvents: "none", padding: "0 16px" }}>
          <div className="panel pop" style={{ ["--ac" as string]: "var(--gold)", pointerEvents: "auto", padding: "10px 14px", fontSize: 13, maxWidth: 360, textAlign: "center" }}>
            {modeLockToast}
            <button type="button" onClick={() => setModeLockToast(null)} className="btn" style={{ ["--ac" as string]: "var(--line2)", fontSize: 11, marginLeft: 10, padding: "2px 8px" }}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* arrival cinematic: claim → wipe → reveal → welcome (hides the figure pop-in) */}
      {mounted && claiming && byKey[claiming] && isFirstDuelComplete() && (
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

      {/* scene-change veil for gate travel + venue enter/exit */}
      {travelCard && (
        <TravelVeil
          card={travelCard}
          onCovered={() => {
            travelSwap.current?.();
            travelSwap.current = null;
          }}
          onDone={() => setTravelCard(null)}
        />
      )}

      {/* season turn — a Keeper performs the Chronicle when a new door opens */}
      {seasonBeat && !showIntro && (() => {
        const lvl = ((Math.max(1, currentSeasonNumber()) - 1) % 5) + 1;
        return (
          <CharacterBeat
            script={seasonTurnBeat()}
            accent={keeperColor(lvl)}
            voice="keeper"
            keeperLevel={lvl}
            onComplete={dismissSeasonBeat}
          />
        );
      })()}

      {/* rival cinematic — the grudge match's pre/post taunts */}
      {rivalBeat && rival && rivalMemory && (
        <CharacterBeat
          script={
            rivalBeat.phase === "before"
              ? rivalChallengeBeat(rival, rivalMemory)
              : rivalResultBeat(rival, rivalMemory, !!rivalBeat.won)
          }
          accent={TYPE_COLOR[rival.force]}
          voice="champion"
          championType={rivalVoiceType(rival)}
          onComplete={() => {
            const phase = rivalBeat.phase;
            setRivalBeat(null);
            if (phase === "before") launchRivalDuel();
          }}
        />
      )}

      {/* Promotion Trial nomination — a Keeper names the proving duel the champion
          must WIN to claim the tier its record has reached. Off unless TRIALS. */}
      {TRIALS && trialNom && byKey[trialNom.key] && (
        <CharacterBeat
          script={{
            kicker: "PROMOTION TRIAL",
            lines: [
              {
                speaker: "Keeper",
                text: `${byKey[trialNom.key].name} has fought its way to the threshold of ${trialNom.tier}. The tier is not given — it is taken. Win the trial and be reforged.`,
              },
            ],
          }}
          accent={TYPE_COLOR[byKey[trialNom.key].type]}
          voice="keeper"
          onComplete={() => {
            const tier = trialNom.tier;
            setTrialNom(null);
            launchTrialDuel(tier);
          }}
        />
      )}

      {/* anytime controls reference (auto-opens once at free roam) */}
      <ControlsGuide open={controlsOpen} onClose={() => setControlsOpen(false)} isTouch={isTouch} hasPad={hasPad} force={store.force} />
      <SettingsOverlay
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenControls={() => setControlsOpen(true)}
        hasPad={hasPad}
      />

      {/* first-run tutorial / elevator pitch */}
      {mounted && showIntro && <FirstRun onClose={closeIntro} />}

      {/* Pre-picker beat only for /grounds guest paths — /ascent Take Flight skips
          all "Preparing…" interstitials and opens straight into the Circuit sky. */}
      {mounted &&
        !ascentEntry &&
        !showIntro &&
        !rosterError &&
        !showWorld &&
        gpu?.ok &&
        awaitingFirstDuel &&
        firstDuelPhase === null &&
        !guestAscentReady && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "radial-gradient(120% 90% at 50% 38%, #15101f 0%, #0a0712 60%, #050309 100%)",
          }}
        />
      )}

      {/* champion wakes — first time you bind to a mind */}
      {wakeKey && byKey[wakeKey] && (
        <CharacterBeat
          script={championWakeScript(wakeKey)}
          accent={TYPE_COLOR[byKey[wakeKey].type]}
          voice="champion"
          championType={byKey[wakeKey].type}
          portrait={{ key: wakeKey, type: byKey[wakeKey].type, champion: previewRookieChampion(wakeKey), name: byKey[wakeKey].name }}
          onComplete={() => {
            const k = wakeKey;
            setWakeKey(null);
            // Desktop first-journey: wake → first flight → train (mobile flight lives in MobileAdopt).
            if (firstDuelPhase === "pick") setFlightKey(k);
            else if (!owned) setClaiming(k);
          }}
          layout="stage"
        />
      )}

      {/* first flight — named mind rises beside you before strategy tuning */}
      {flightKey && byKey[flightKey] && (
        <CharacterBeat
          script={firstFlightScript(flightKey)}
          accent={TYPE_COLOR[byKey[flightKey].type]}
          voice="champion"
          championType={byKey[flightKey].type}
          portrait={{ key: flightKey, type: byKey[flightKey].type, champion: previewRookieChampion(flightKey), name: byKey[flightKey].name }}
          onComplete={() => {
            setFlightKey(null);
            if (firstDuelPhase === "pick") setFirstDuelPhase("train");
          }}
          layout="stage"
          sound
        />
      )}

      {/* first Imprint ask — after Concord gate, open Train on the raise loop */}
      {imprintTease && owned && byKey[owned] && !wakeKey && !flightKey && !showMatch && overlay === "none" && !inFirstDuelSetup && (
        <CharacterBeat
          script={championImprintAskScript(owned)}
          accent={TYPE_COLOR[byKey[owned].type]}
          voice="champion"
          championType={byKey[owned].type}
          portrait={{ key: owned, type: byKey[owned].type, champion: store.get(owned), name: byKey[owned].name }}
          onComplete={() => {
            try {
              localStorage.setItem(STORAGE.imprintCoach, "1");
            } catch {}
            setImprintTease(false);
            setRegionRaiseCoach(true);
            void store.syncWallet();
          }}
          layout="stage"
        />
      )}

      {/* Keeper performance — staged intro before the duel of wits */}
      {KEEPERS_PLAYABLE && keeperIntroPending && (
        <CharacterBeat
          script={keeperIntro(keeperIntroPending.level)}
          accent={keeperColor(keeperIntroPending.level)}
          voice="keeper"
          keeperLevel={keeperIntroPending.level}
          onComplete={() => {
            setKeeperLevel(keeperIntroPending.level);
            setKeeperIntroPending(null);
            setOverlay("guardian");
          }}
        />
      )}

      {/* your champion speaks after a duel — to you, not at the opponent */}
      {companionBeat && byKey[companionBeat.key] && (
        <CharacterBeat
          script={{ kicker: companionBeat.kicker, lines: companionBeat.lines }}
          accent={TYPE_COLOR[byKey[companionBeat.key].type]}
          voice="champion"
          championType={championTypeForKey(companionBeat.key)}
          layout="stage"
          portrait={{
            key: companionBeat.key,
            type: byKey[companionBeat.key].type,
            champion: store.get(companionBeat.key),
            name: byKey[companionBeat.key].name,
          }}
          onComplete={() => {
            setCompanionBeat(null);
            closeMatch();
          }}
        />
      )}

      {/* proximity action — centered above the touch controls so it never
          overlaps the jump / sprint cluster. Tap on touch, E on desktop.
          Portals (gates / return / venue enter·exit) auto-cross — no prompt. */}
      {owned && near && overlay === "none" && !inMatch && !result && !gRun && !travelCard && !worldUiBlocked && !(near.kind === "venue" && near.venue === "league") && near.kind !== "gate" && near.kind !== "return" && near.kind !== "venue-enter" && near.kind !== "venue-exit" && (
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
              {near.kind === "venue"
                ? near.venue === "daily"
                  ? "Read today's Tribunal"
                  : "Enter the Live Gallery"
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
                            : "Sparring pit"}
            </span>
            {!isTouch && <kbd className="mono" style={{ fontSize: 11, opacity: 0.8, border: "1px solid currentColor", borderRadius: 5, padding: "1px 6px" }}>E</kbd>}
          </button>
        </div>
      )}

      {/* training overlay */}
      {overlay === "train" && owned && byKey[owned] && (
        <TrainOverlay
          ckey={owned}
          entry={byKey[owned]}
          onClose={() => setOverlay("none")}
          onContinueToFight={() => {
            setOverlay("none");
            setRegionRaiseCoach(false);
            setArenaFightCoach(true);
            // Soft drop near the central Arena (region origin), facing inward.
            window.setTimeout(() => travelRef.current?.(0, 12, Math.PI), 80);
          }}
        />
      )}

      {/* guardian duel — stripped from face when KEEPERS_PLAYABLE is false */}
      {KEEPERS_PLAYABLE && overlay === "guardian" && (
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
        <MatchHud bout={bout} owned={owned!} opponent={matchBKey} foeMeta={duelMeta} foeType={towerAgents.find((a) => a.id === opponentId)?.type} byKey={byKey} get={store.get} result={result} onClose={dismissMatch} isMobile={isMobile} />
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
  // Legacy claim grid — First Minds only (full dex belongs in /collection).
  const picks = roster.filter((r) => practiceOpponentKeys().includes(r.key));
  const shown = picks.length >= 2 ? picks : roster.slice(0, 8);
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "var(--overlay)", backdropFilter: "blur(6px)", zIndex: 40, padding: 20 }}>
      <div className="panel" style={{ padding: 26, width: "min(760px, 95vw)", maxHeight: "90vh", overflow: "auto", textAlign: "center" }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: 2, color: "var(--muted2)" }}>
          STEP 1 · ADOPT A MIND TO RAISE
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 700, margin: "8px 0 4px" }}>Claim a champion to raise.</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 14px" }}>
          {READER_COPY.claimLine} {READER_COPY.walkFightChip()}
        </p>

        {/* the one lesson that matters before you choose: each Force beats the next */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, margin: "0 0 18px" }}>
          <ForcesChain />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {shown.map((r) => {
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
                  {FORCE_LORE[r.type].name} · L{lf.level} {tierFor(lf.level).name}
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

function TrainOverlay({
  ckey,
  entry,
  onClose,
  onContinueToFight,
}: {
  ckey: string;
  entry: RosterEntry;
  onClose: () => void;
  /** After a paid/fragment session — close and steer toward the Arena. */
  onContinueToFight?: () => void;
}) {
  const store = useChampions();
  const champ = store.get(ckey);
  const recipe = store.getRecipe(ckey);
  const col = TYPE_COLOR[entry.type];
  const app = appearanceOf(champ);
  const lf = levelFor(champ.xp);
  const [persona, setPersonaLocal] = useState(recipe.persona ?? "");
  const [flash, setFlash] = useState<{ xp: number; leveledTo: number | null } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [imprinting, setImprinting] = useState<string | null>(null);
  const [imprintReply, setImprintReply] = useState<string | null>(null);
  const [imprintMoved, setImprintMoved] = useState<string>("");
  const [litAxes, setLitAxes] = useState<Set<keyof Strat>>(() => new Set());
  const litTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [training, setTraining] = useState(false);
  const [trainErr, setTrainErr] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const day = imprintDayIndex();
  const sessionLessons = useMemo(
    () => lessonsForSession({ ckey, type: entry.type, level: lf.level, strat: recipe.strat, day }),
    [ckey, entry.type, lf.level, recipe.strat, day],
  );

  useEffect(() => {
    void store.syncWallet();
  }, [store]);

  const teach = async (lessonId: string) => {
    if (imprinting) return;
    setImprinting(lessonId);
    setImprintReply(null);
    const out = await store.imprint(ckey, lessonId);
    setImprinting(null);
    if (!out.applied) return; // on cooldown — button is disabled anyway
    setImprintReply(out.reply);
    setImprintMoved(describeDial(out.dial));
    setLitAxes(new Set(Object.keys(out.dial) as (keyof Strat)[]));
    if (litTimer.current) clearTimeout(litTimer.current);
    litTimer.current = setTimeout(() => setLitAxes(new Set()), 1800);
  };

  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    if (litTimer.current) clearTimeout(litTimer.current);
  }, []);

  const reflectTrain = (before: typeof champ) => {
    const after = store.get(ckey);
    const beforeLevel = levelFor(before.xp).level;
    const afterLevel = levelFor(after.xp).level;
    setFlash({ xp: after.xp - before.xp, leveledTo: afterLevel > beforeLevel ? afterLevel : null });
    setSessionDone(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 4800);
  };

  const doTrain = async () => {
    if (training) return;
    setTrainErr(null);
    setTraining(true);
    try {
      await store.syncWallet();
      const before = store.get(ckey);
      const ok = await store.trainChampion(ckey);
      if (!ok) {
        setTrainErr(
          store.crowns < TRAIN_COST
            ? `Need ${TRAIN_COST} Crowns (you have ${store.crowns}). Win a fight or clear a goal.`
            : "Training failed — try again in a moment.",
        );
        return;
      }
      reflectTrain(before);
    } finally {
      setTraining(false);
    }
  };

  const doTrainFragment = () => {
    setTrainErr(null);
    const before = store.get(ckey);
    if (!store.trainWithFragment(ckey)) {
      setTrainErr("No fragments left — find them in the wilds.");
      return;
    }
    reflectTrain(before);
  };

  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "var(--overlay)", backdropFilter: "blur(7px)", zIndex: 50, padding: 12 }}>
      <div className="panel pop" style={{ ["--ac" as string]: col, width: "min(720px, 96vw)", maxHeight: "92vh", overflow: "auto", padding: "20px 22px", borderColor: col }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ width: 96, flexShrink: 0, borderRadius: 12, overflow: "hidden", border: `1px solid color-mix(in srgb, ${col} 45%, var(--line2))` }}>
            <ChampionPortrait rosterKey={ckey} type={entry.type} champion={champ} preset="portrait" colorHex={col} eager />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15 }}>Train {entry.name}</div>
            <div className="mono" style={{ fontSize: 11, color: col, marginTop: 4 }}>
              {entry.type} · L{lf.level} {tierFor(lf.level).name}
            </div>
            <p style={{ fontSize: 12.5, lineHeight: 1.4, margin: "8px 0 0", color: "var(--muted)" }}>
              Teach a free lesson to shape how they think — or spend Crowns to grow body &amp; XP.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "grid", placeItems: "center", lineHeight: 0, flexShrink: 0 }}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: col, margin: "18px 0 6px" }}>
          TODAY&apos;S LESSONS · each once per day
        </div>
        <p className="mono" style={{ fontSize: 10, color: "var(--muted2)", lineHeight: 1.4, margin: "0 0 10px" }}>
          Free. Picked for {entry.name}&apos;s Force &amp; temperament — new set tomorrow. Teaching one doesn&apos;t lock the others.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {sessionLessons.map((l) => {
            const learned = store.imprintDays[ckey]?.[l.id] === day;
            const dim = learned || (!!imprinting && imprinting !== l.id);
            const nudge = describeDial(l.dial);
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => teach(l.id)}
                disabled={!!imprinting || learned}
                className="mono"
                style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, padding: "9px 11px", borderRadius: 10, border: `1px solid ${imprinting === l.id ? col : "var(--line2)"}`, background: imprinting === l.id ? `color-mix(in srgb, ${col} 14%, transparent)` : "transparent", color: "var(--ink)", textAlign: "left", cursor: learned ? "default" : imprinting ? "wait" : "pointer", opacity: dim ? 0.5 : 1, minWidth: 0 }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{l.label}{learned ? " ✓" : ""}</span>
                <span style={{ fontSize: 9.5, color: "var(--muted2)" }}>
                  {imprinting === l.id ? "teaching…" : learned ? "taught today · back tomorrow" : nudge ? `${l.hint} · ${nudge}` : l.hint}
                </span>
              </button>
            );
          })}
        </div>
        {imprintReply && (
          <div style={{ marginTop: 10, padding: 11, borderRadius: 10, background: "var(--panel2)", border: `1px solid ${col}` }}>
            <div className="mono" style={{ fontSize: 9, letterSpacing: 1.2, color: col, marginBottom: 3, display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span>{entry.name.toUpperCase()}</span>
              {imprintMoved && <span style={{ color: "var(--muted2)" }}>{imprintMoved}</span>}
            </div>
            <div style={{ fontSize: 13, fontStyle: "italic", lineHeight: 1.45 }}>&ldquo;{imprintReply}&rdquo;</div>
          </div>
        )}

        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", margin: "16px 0 8px" }}>
          TEMPERAMENT · readout (lessons &amp; fights move these)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <DoctrineDial compact label="Aggression" value={recipe.strat.aggression} color="#ff6b4a" hints={["Patient", "Relentless"]} highlight={litAxes.has("aggression")} />
          <DoctrineDial compact label="Focus" value={recipe.strat.focus} color="#b07bff" hints={["Broad", "Single-minded"]} highlight={litAxes.has("focus")} />
          <DoctrineDial compact label="Risk" value={recipe.strat.risk} color="#f5d020" hints={["Safe", "Reckless"]} highlight={litAxes.has("risk")} />
        </div>

        {flash && (
          <div className="pop" style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
            <span className="chip" style={{ borderColor: "var(--good)", color: "var(--good)" }}>✦ Trained · +{flash.xp} XP</span>
            {flash.leveledTo && <span className="chip" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>★ LEVEL UP → L{flash.leveledTo}</span>}
          </div>
        )}
        {sessionDone && onContinueToFight && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 10, border: "1px solid var(--good)", background: "color-mix(in srgb, var(--good) 10%, transparent)" }}>
            <p style={{ fontSize: 13, lineHeight: 1.4, margin: "0 0 10px" }}>
              <strong>Session done.</strong> Next: a real fight at this region&apos;s Arena — that&apos;s how you earn Crowns back.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ ["--ac" as string]: "var(--good)", width: "100%", fontSize: 14 }}
              onClick={onContinueToFight}
            >
              Next · To the Arena
            </button>
          </div>
        )}
        {trainErr && <p style={{ color: "var(--bad)", fontSize: 12, textAlign: "center", marginTop: 8 }}>{trainErr}</p>}

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span>BODY SESSION</span>
            <span style={{ color: "var(--gold)", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Crown size={11} strokeWidth={2.2} /> {store.crowns}
            </span>
          </div>
          <button
            className="btn btn-primary"
            style={{
              ["--ac" as string]: "var(--good)",
              width: "100%",
              fontSize: 15,
              opacity: training || store.crowns < TRAIN_COST ? 0.55 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
            disabled={training || store.crowns < TRAIN_COST}
            onClick={() => void doTrain()}
          >
            <ArrowUp size={16} strokeWidth={2.4} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              {training ? "Training…" : <>Train session · {TRAIN_COST} <Crown size={14} color="var(--gold)" strokeWidth={2} /></>}
            </span>
          </button>
          {store.fragments > 0 && (
            <button
              className="btn"
              style={{ ["--ac" as string]: "#39e0ff", width: "100%", fontSize: 13, marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              onClick={doTrainFragment}
            >
              <Gem size={15} strokeWidth={2.2} color="#39e0ff" />
              Free session · 1 fragment ({store.fragments})
            </button>
          )}
          {store.crowns < TRAIN_COST && !trainErr && (
            <p style={{ color: "var(--muted2)", fontSize: 11, textAlign: "center", marginTop: 8 }}>
              Need {TRAIN_COST} Crowns for a body session — win a fight in the Arena.
            </p>
          )}
        </div>

        <button
          type="button"
          className="btn"
          style={{ ["--ac" as string]: "var(--line2)", width: "100%", fontSize: 12, marginTop: 12 }}
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? "Hide advanced" : "Advanced · brain, persona, body stats"}
        </button>
        {showAdvanced && (
          <div style={{ marginTop: 12 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", margin: "0 0 8px" }}>
              BRAIN · who thinks in the arena (default is fine)
            </div>
            <p className="mono" style={{ fontSize: 10, color: "var(--muted2)", lineHeight: 1.45, margin: "0 0 8px" }}>
              <strong>Built-in brain</strong> needs zero setup. Only switch if you want your own model or agent.
            </p>
            <AgentPicker ckey={ckey} recipe={recipe} />
            <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", margin: "16px 0 8px" }}>
              PERSONA · {entry.name}&apos;s voice (optional)
            </div>
            <textarea
              value={persona}
              onChange={(e) => setPersonaLocal(e.target.value)}
              onBlur={() => store.setPersona(ckey, persona)}
              placeholder={entry.persona}
              rows={2}
              style={{ width: "100%", background: "var(--panel2)", border: "1px solid var(--line2)", borderRadius: 10, color: "var(--ink)", padding: 10, fontFamily: "inherit", fontSize: 13, resize: "vertical" }}
            />
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, margin: "16px 0 0" }}>
              <span>stature ×{(app.h / 1.7).toFixed(2)}</span>
              <span>build ×{app.width.toFixed(2)}</span>
              <span>head ×{app.headScale.toFixed(2)}</span>
              <span>fists ×{app.handScale.toFixed(2)}</span>
              <span>level {lf.level}</span>
              <span>{champ.wins}W / {champ.losses}L</span>
            </div>
          </div>
        )}
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
          Default. The house mind fights for you — no API keys, no setup.
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

function duelCloseBtn(onClose: () => void) {
  return (
    <button onClick={onClose} aria-label="Close" style={{ marginLeft: "auto", flexShrink: 0, background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "grid", placeItems: "center", lineHeight: 0, padding: 4 }}>
      <X size={20} strokeWidth={2} />
    </button>
  );
}

function DuelBetting({
  ownedName,
  oppName,
  oppDisabled,
  betSide,
  setBetSide,
  betAmt,
  setBetAmt,
  crowns,
}: {
  ownedName: string;
  oppName: string;
  oppDisabled?: boolean;
  betSide: "me" | "opp" | null;
  setBetSide: (s: "me" | "opp" | null) => void;
  betAmt: number;
  setBetAmt: (n: number) => void;
  crowns: number;
}) {
  const pickBtn: React.CSSProperties = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "12px 8px",
    fontSize: 11,
    minWidth: 0,
  };
  const stakeBtn: React.CSSProperties = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: "10px 6px",
    fontSize: 12,
  };

  return (
    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)" }}>
          PLACE A BACK <span style={{ opacity: 0.65, letterSpacing: 0.5 }}>(optional)</span>
        </div>
        <div className="mono" style={{ fontSize: 10, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          win 2× · <span style={{ color: "var(--gold)", display: "inline-flex", alignItems: "center", gap: 3 }}>{crowns} <Crown size={11} strokeWidth={2.2} /></span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button className={betSide === "me" ? "btn btn-primary" : "btn"} style={{ ...pickBtn, ["--ac" as string]: "var(--good)" }} onClick={() => setBetSide(betSide === "me" ? null : "me")}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Back {ownedName}</span>
        </button>
        <button className={betSide === "opp" ? "btn btn-primary" : "btn"} style={{ ...pickBtn, ["--ac" as string]: "var(--bad)" }} disabled={oppDisabled} onClick={() => setBetSide(betSide === "opp" ? null : "opp")}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Back {oppName}</span>
        </button>
      </div>
      {betSide && (
        <div className="fadein" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
          {[25, 50, 100].map((n) => (
            <button key={n} className={betAmt === n ? "btn btn-primary" : "btn"} style={{ ...stakeBtn, ["--ac" as string]: "var(--gold)", opacity: crowns < n ? 0.4 : 1 }} disabled={crowns < n} onClick={() => setBetAmt(n)}>
              {n} <Crown size={12} strokeWidth={2.2} />
            </button>
          ))}
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
  // First Minds only — full dex as opponent Avatars melts WebGL on desktop.
  const practiceKeys = new Set(practiceOpponentKeys(owned));
  const opps = roster.filter((r) => practiceKeys.has(r.key));
  const oppEntry = opponent ? roster.find((r) => r.key === opponent) : null;
  const ownedCol = TYPE_COLOR[ownedEntry.type];
  const ownedChamp = get(owned);

  if (locked && opponent && oppEntry) {
    const col = TYPE_COLOR[oppEntry.type];
    const oppChamp = get(opponent);
    const oppName = duelMeta?.name ?? oppEntry.name;
    return (
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "var(--overlay)", backdropFilter: "blur(7px)", zIndex: 50, padding: 16 }}>
        <div className="panel pop" style={{ ["--ac" as string]: col, width: "min(520px, 95vw)", maxHeight: "90vh", overflow: "auto", padding: 24, borderColor: col }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: col, marginBottom: 4 }}>LADDER DUEL</div>
              <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15 }}>Face to face</div>
            </div>
            {duelCloseBtn(onClose)}
          </div>
          <p className="mono" style={{ fontSize: 11, color: "var(--muted)", margin: "10px 0 18px", lineHeight: 1.55 }}>
            Next on the board. Beat them to keep climbing.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              gap: 12,
              alignItems: "start",
              marginBottom: 4,
            }}
          >
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ width: "100%", borderRadius: 12, overflow: "hidden", border: `1px solid color-mix(in srgb, ${ownedCol} 45%, var(--line2))` }}>
                <ChampionPortrait rosterKey={owned} type={ownedEntry.type} champion={ownedChamp} preset="portrait" colorHex={ownedCol} eager />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ownedEntry.name}</div>
                <div className="mono" style={{ fontSize: 10, color: ownedCol, marginTop: 4 }}>YOURS · L{levelFor(ownedChamp.xp).level}</div>
              </div>
            </div>
            <div className="mono" style={{ fontSize: 13, color: "var(--muted2)", fontWeight: 800, paddingTop: 48 }}>VS</div>
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ width: "100%", borderRadius: 12, overflow: "hidden", border: `1px solid color-mix(in srgb, ${col} 45%, var(--line2))` }}>
                <ChampionPortrait rosterKey={opponent} type={oppEntry.type} champion={oppChamp} preset="portrait" colorHex={col} eager />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{oppName}</div>
                <div className="mono" style={{ fontSize: 10, color: col, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {duelMeta?.handle ? `@${duelMeta.handle}` : "RANKED AGENT"} · L{levelFor(oppChamp.xp).level}
                </div>
              </div>
            </div>
          </div>
          <DuelBetting
            ownedName={ownedEntry.name}
            oppName={oppName}
            betSide={betSide}
            setBetSide={setBetSide}
            betAmt={betAmt}
            setBetAmt={setBetAmt}
            crowns={crowns}
          />
          <button className="btn btn-primary" style={{ ["--ac" as string]: "var(--gold)", width: "100%", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 18, padding: "14px 16px" }} onClick={onFight}>
            <FightIcon size={18} strokeWidth={2.2} />
            Fight {oppName}
            {betSide && <span className="mono" style={{ fontSize: 11, opacity: 0.85, display: "inline-flex", alignItems: "center", gap: 3 }}>· {betAmt} <Crown size={13} strokeWidth={2.2} /></span>}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "var(--overlay)", backdropFilter: "blur(7px)", zIndex: 50, padding: 16 }}>
      <div className="panel pop" style={{ ["--ac" as string]: "var(--gold)", width: "min(620px, 95vw)", maxHeight: "90vh", overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: "var(--gold)", marginBottom: 4 }}>PRACTICE</div>
            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15 }}>Sparring pit</div>
          </div>
          {duelCloseBtn(onClose)}
        </div>
        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", margin: "10px 0 4px", lineHeight: 1.55 }}>
          Practice against a seeded <b>First Mind</b> in the plaza pit. Wins here earn XP and Crowns; climb the Tower for ranked fights.
        </div>
        <div className="mono" style={{ fontSize: 11, color: "var(--muted2)", marginBottom: 16 }}>
          You field <b style={{ color: ownedCol }}>{ownedEntry.name}</b>.
        </div>

        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 8 }}>
          PICK AN OPPONENT
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
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

        <DuelBetting
          ownedName={ownedEntry.name}
          oppName={oppEntry?.name ?? "opponent"}
          oppDisabled={!oppEntry}
          betSide={betSide}
          setBetSide={setBetSide}
          betAmt={betAmt}
          setBetAmt={setBetAmt}
          crowns={crowns}
        />

        <button className="btn btn-primary" style={{ ["--ac" as string]: "var(--gold)", width: "100%", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 18, padding: "14px 16px" }} disabled={!opponent} onClick={onFight}>
          <FightIcon size={18} strokeWidth={2.2} />
          {opponent ? "Fight!" : "pick an opponent"}
          {betSide && <span className="mono" style={{ fontSize: 11, opacity: 0.85, display: "inline-flex", alignItems: "center", gap: 3 }}>· {betAmt} <Crown size={13} strokeWidth={2.2} /></span>}
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
  const [study, setStudy] = useState(false);
  const canSkip = bout.phase === "live" && (t?.round ?? 0) >= 2 && !result && !bout.end;
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
              {canSkip && (
                <button
                  type="button"
                  onClick={bout.skipToVerdict}
                  className="mono"
                  style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 999, border: "1px solid var(--line2)", background: "transparent", color: "var(--muted)", fontSize: isMobile ? 10 : 11, cursor: "pointer" }}
                >
                  <FastForward size={12} strokeWidth={2.2} /> Skip to verdict
                </button>
              )}
            </div>
            <div style={{ fontStyle: "italic", fontSize: isMobile ? 14 : 15, margin: "8px 0 6px", lineHeight: 1.4, overflowWrap: "anywhere" }}>
              &ldquo;{t.line}&rdquo;
            </div>
            <div className="mono" style={{ fontSize: isMobile ? 10 : 11, color: "var(--muted)", lineHeight: 1.45, overflowWrap: "anywhere" }}>
              why › {t.why} <span style={{ color: "var(--muted2)", display: "inline-flex", alignItems: "center", gap: 4 }}>· <Scale size={11} strokeWidth={2} /> {t.ruling} (q={t.q.toFixed(2)})</span>
            </div>
            {t.trace && t.trace.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setStudy((v) => !v)}
                  className="mono"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, border: `1px solid ${study ? "var(--accent)" : "var(--line2)"}`, background: "transparent", color: study ? "var(--accent)" : "var(--muted2)", fontSize: 10, cursor: "pointer" }}
                >
                  <FlaskConical size={11} strokeWidth={2.2} /> {study ? "Hide study" : "Study the read"}
                </button>
                {study && (
                  <div className="mono" style={{ marginTop: 6, padding: 10, borderRadius: 8, background: "rgba(255,255,255,.03)", border: "1px solid var(--line)", display: "grid", gap: 5 }}>
                    {t.trace.map((step, i) => (
                      <div key={i} style={{ fontSize: 10, lineHeight: 1.5, overflowWrap: "anywhere" }}>
                        <span style={{ color: "var(--accent)" }}>{step.tool}</span>
                        <span style={{ color: "var(--muted)" }}> → {typeof step.result === "string" ? step.result : JSON.stringify(step.result)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {result && (() => {
        const ac = result.won ? "var(--good)" : "var(--bad)";
        const hl = bout.end?.highlights?.[0];
        const hlLabel = hl ? (hl.kind === "ko" ? "THE FINISH" : hl.kind === "crit" ? "HARDEST BAR" : "TURNING POINT") : "";
        const rankDelta = result.globalDelta ?? result.ratingDelta;
        const hasReward = result.crowns !== 0 || result.betWon !== null;
        const hasProgress = !!result.leveledTo || result.ladders.length > 0 || rankDelta != null;
        const hasPayoff = hasReward || hasProgress;
        return (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "var(--overlay)", zIndex: 55, padding: 16 }}>
          {result.won && <Confetti accent="#f0a93a" count={70} originTop="34%" />}
          <div
            className={`panel ${result.won ? "cel-reveal" : "cel-shake"}`}
            style={{
              ["--ac" as string]: ac,
              position: "relative",
              padding: "22px 22px 20px",
              width: "min(360px, 92vw)",
              maxHeight: "90vh",
              overflow: "auto",
              textAlign: "center",
              boxShadow: `0 0 80px -30px ${ac}`,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {/* verdict — short, then get out of the way */}
            <div>
              <div className="glow" style={{ fontSize: 26, fontWeight: 800, color: ac, letterSpacing: 1.2, lineHeight: 1 }}>
                {result.won ? "VICTORY" : "DEFEAT"}
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 5, letterSpacing: 0.4 }}>
                {bout.end?.winner_name} wins · {bout.end?.rounds} rounds
              </div>
            </div>

            {/* payoff first — crowns + progression are the point of the card */}
            {hasPayoff && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 12px",
                  borderRadius: 12,
                  background: result.won ? "rgba(80, 220, 160, 0.06)" : "rgba(255, 90, 90, 0.06)",
                  border: `1px solid ${result.won ? "rgba(80, 220, 160, 0.22)" : "rgba(255, 90, 90, 0.2)"}`,
                }}
              >
                {hasReward && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                    {result.crowns !== 0 && (
                      <span
                        style={{
                          fontSize: 32,
                          fontWeight: 800,
                          letterSpacing: 0.5,
                          color: result.crowns >= 0 ? "var(--gold)" : "var(--bad)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          lineHeight: 1,
                        }}
                      >
                        {result.crowns >= 0 ? "+" : ""}{result.crowns} <Crown size={24} strokeWidth={2.2} />
                      </span>
                    )}
                    {result.betWon !== null && (
                      <span className="chip" style={{ borderColor: result.betWon ? "var(--good)" : "var(--bad)", color: result.betWon ? "var(--good)" : "var(--bad)" }}>
                        back {result.betWon ? "won" : "lost"}
                      </span>
                    )}
                    {result.home && (
                      <span className="chip" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>
                        home · +{HOME_WIN_BONUS}
                      </span>
                    )}
                  </div>
                )}

                {hasProgress && (
                  <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                    {result.leveledTo && (
                      <span className="chip" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>LEVEL UP · L{result.leveledTo}</span>
                    )}
                    {result.ladders.map((l) => (
                      <span key={l} className="chip" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>{l}</span>
                    ))}
                    {rankDelta != null && (
                      <span
                        className="chip"
                        style={{
                          borderColor: rankDelta >= 0 ? "var(--good)" : "var(--bad)",
                          color: rankDelta >= 0 ? "var(--good)" : "var(--bad)",
                        }}
                      >
                        Ladder {rankDelta >= 0 ? "+" : ""}{rankDelta}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* signature line — flavor under the numbers, quieter */}
            {hl && (
              <div style={{ padding: "0 2px", textAlign: "left" }}>
                <div className="mono" style={{ fontSize: 8.5, letterSpacing: 1.4, color: "var(--muted2)" }}>
                  {hlLabel} · R{hl.round}
                </div>
                <div style={{ fontStyle: "italic", fontSize: 13, marginTop: 4, lineHeight: 1.4, color: "var(--ink)", opacity: 0.88 }}>
                  &ldquo;{hl.line}&rdquo;
                </div>
                <div className="mono" style={{ fontSize: 9.5, color: "var(--muted2)", marginTop: 3 }}>- {hl.actor_name}</div>
              </div>
            )}

            {result.learned && (
              <div className="mono" style={{ fontSize: 10, color: "var(--muted2)", fontStyle: "italic", marginTop: hl ? -4 : 0 }}>
                {result.learned}
              </div>
            )}

            {/* actions */}
            <div style={{ display: "flex", gap: 8, width: "100%", marginTop: 2 }}>
              <button
                className="btn"
                style={{
                  ["--ac" as string]: "var(--gold)",
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
                onClick={share}
              >
                {copied ? <Check size={15} strokeWidth={2.4} /> : <ArrowUpRight size={15} strokeWidth={2.2} />}
                {copied ? "link copied" : "share card"}
              </button>
              <button
                className="btn btn-primary"
                style={{
                  ["--ac" as string]: ac,
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={onClose}
              >
                CONTINUE
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </>
  );
}
