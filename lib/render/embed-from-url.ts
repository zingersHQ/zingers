import type { RenderPresetId } from "@/lib/render/presets";
import { FORCES, FOUNDING_REGIONS, KEEPERS } from "@/lib/lore/canon";
import { showcaseChampion, showcaseForForce, showcaseForKeeper, showcaseForRegion } from "@/lib/render/showcase";

export interface CanonEmbedSpec {
  rosterKey: string;
  preset: RenderPresetId;
  colorHex?: string;
}

const FORCE_SLUG_TYPE: Record<string, keyof typeof FORCES> = {
  lattice: "LOGIC",
  static: "CHAOS",
  stillness: "COMPOSURE",
  chorus: "RHETORIC",
  spark: "CREATIVITY",
};

/** Map exported PNG paths (org markdown, OG fallbacks) to live 3D showcase data. */
export function canonEmbedFromUrl(url: string): CanonEmbedSpec | null {
  const m = url.match(/^\/renders\/minds\/([a-z]+)\.png$/i);
  if (m) {
    const key = m[1].toUpperCase();
    return { rosterKey: key, preset: "portrait" };
  }

  const f = url.match(/^\/renders\/forces\/force-([a-z]+)\.png$/i);
  if (f) {
    const slug = f[1].toLowerCase();
    const { key } = showcaseForForce(slug);
    const forceType = FORCE_SLUG_TYPE[slug];
    return { rosterKey: key, preset: "force", colorHex: forceType ? FORCES[forceType].hex : undefined };
  }

  const r = url.match(/^\/renders\/regions\/region-([a-z]+)\.png$/i);
  if (r) {
    const regionId = r[1].toLowerCase();
    const { key } = showcaseForRegion(regionId);
    const region = FOUNDING_REGIONS.find((x) => x.id === regionId);
    const hex = region ? FORCES[region.bias].hex : undefined;
    return { rosterKey: key, preset: "region", colorHex: hex };
  }

  const k = url.match(/^\/renders\/keepers\/keeper-([a-z]+)\.png$/i);
  if (k) {
    const keeperName =
      k[1] === "tibble"
        ? "Tibble"
        : k[1] === "quill"
          ? "Quill"
          : k[1] === "warden"
            ? "Bastion"
            : k[1] === "vesper"
              ? "Vesper"
              : k[1] === "sable"
                ? "Sable"
                : k[1];
    const keeper = KEEPERS.find((x) => x.name === keeperName);
    const { key } = showcaseForKeeper(keeperName);
    return { rosterKey: key, preset: "keeper", colorHex: keeper?.hex };
  }

  const direct = url.match(/^\/renders\/portrait\/([A-Z]+)\.png$/i);
  if (direct) return { rosterKey: direct[1].toUpperCase(), preset: "portrait" };

  return null;
}

export function showcaseForEmbed(spec: CanonEmbedSpec) {
  return showcaseChampion(spec.rosterKey);
}

/** Region figure URLs (org markdown) → canon region id, for live region scenes. */
export function regionIdFromUrl(url: string): string | null {
  const r = url.match(/^\/renders\/regions\/region-([a-z]+)\.png$/i);
  return r ? r[1].toLowerCase() : null;
}
