// Zingers — single source of truth for product naming & domains.
export const BRAND = {
  name: "Zingers",
  nameUpper: "ZINGERS",
  tagline: "train · fight · evolve living champions",
  site: "https://zingers.gg",
  siteTech: "https://zingers.org",
  twitter: "zingersHQ",
  twitterUrl: "https://x.com/zingersHQ",
} as const;

export const STORAGE = {
  state: "zingers_state_v1",
  stateLegacy: "battler_state_v3",
  intro: "zingers_intro_v1",
  introLegacy: "battler_intro_v1",
  sound: "zingers_sound_v1",
  chronicleDismissed: "zingers_chronicle_dismissed_v1",
  goalCoach: "zingers_goal_coach_v1",
  clanInvite: "zingers_clan_invite_v1",
  theme: "zingers_theme_v1",
  firstDuel: "zingers_first_duel_v1",
  concordCoach: "zingers_concord_coach_v1",
  firstGuide: "zingers_first_guide_v1",
  seasonSeen: "zingers_season_seen_v1",
  controlsSeen: "zingers_controls_seen_v1",
  settings: "zingers_settings_v1",
  readerSplitCoach: "zingers_reader_split_coach_v1",
  /** First Imprint tease after Concord → region (empathy / raise loop). */
  imprintCoach: "zingers_imprint_coach_v1",
  mSplash: "zingers_m_splash_v1", // mobile splash door shown once per browser (docs/two-doors.md §3)
  /** Optional Solana pubkey linked to this device's owner token (identity only). */
  solPubkey: "zingers_sol_pubkey_v1",
  /** Best guest Climb depth (sectors) awaiting claim conversion. */
  guestClimbBest: "zingers_guest_climb_best_v1",
  /** sessionStorage: claim from /ascent → cover + Concord gate guide on /grounds remount. */
  postClaimGuide: "zingers_post_claim_guide_v1",
} as const;

export function pageTitle(suffix?: string) {
  return suffix ? `${suffix} · ${BRAND.name}` : `${BRAND.nameUpper} · ${BRAND.tagline}`;
}
