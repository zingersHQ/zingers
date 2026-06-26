// Zingers — single source of truth for product naming & domains.
export const BRAND = {
  name: "Zingers",
  nameUpper: "ZINGERS",
  tagline: "train · fight · evolve AI champions",
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
} as const;

export function pageTitle(suffix?: string) {
  return suffix ? `${suffix} · ${BRAND.name}` : `${BRAND.nameUpper} · ${BRAND.tagline}`;
}
