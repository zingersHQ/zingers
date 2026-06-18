import { renderPortraitPath } from "@/lib/cards/assets";

export function regionImage(id: string) {
  const slug = id === "wastes" ? "wastes" : id === "garden" ? "garden" : "colosseum";
  return renderPortraitPath(slug, "regions");
}

export function keeperImage(name: string) {
  const slug = name.toLowerCase() === "bastion" ? "warden" : name.toLowerCase();
  return renderPortraitPath(slug, "keepers");
}

export function forceImage(slug: string) {
  return renderPortraitPath(slug.toLowerCase(), "forces");
}
