# i18n QA checklist

Run once per locale (`es`, `zh`, `ru`, `ja`) before marking that locale GA.

## Setup

1. Settings → Language → pick locale. Page reloads.
2. Confirm `<html lang>` matches (`zh-Hans` for Chinese).

## Surfaces

- [ ] Intro / landing hero reads naturally (no English leftovers in chrome).
- [ ] Hub Settings labels (Audio / Camera / Comfort / Language).
- [ ] Director card: primary CTA + detail in locale.
- [ ] `/glossary` group titles, definitions, and bible link in locale.
- [ ] Site nav: Play / How it works / Display / theme toggle in locale.
- [ ] Org shell (zingers.org): sidebar titles + CTAs in locale; bible chapter body from `docs/i18n/{locale}/`.
- [ ] Landing region cards: names + blurbs in locale.
- [ ] Flight HUD: plain progress / pause / resume in locale where extracted.
- [ ] Mock Daily fight: topic localized; banter bars in locale (or EN fallback only if bank missing).
- [ ] Live fight (house brain): trash-talk bars in locale; length feels phone-readable.
- [ ] Imprint: reply language matches locale (when live).

## Policy

- [ ] No spaced em dash ` — ` in visible copy.
- [ ] No bout / ELO / ladder product nouns.
- [ ] Champion names stay Latin (AXIOM, VOX…).
- [ ] `npm run i18n:check` passes.

## Notes

BYO agents may still emit English lines; house brain honors `lang`.
Brand tagline in the site header may stay English as the product lockup.
