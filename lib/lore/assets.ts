export function regionImage(id: string) {
  const slug = id === "wastes" ? "wastes" : id === "garden" ? "garden" : "colosseum";
  return `/img/bible/regions/region-${slug}.png`;
}

export function keeperImage(name: string) {
  const slug = name.toLowerCase() === "bastion" ? "warden" : name.toLowerCase();
  return `/img/bible/keepers/keeper-${slug}.png`;
}

export function forceImage(slug: string) {
  return `/img/bible/forces/force-${slug.toLowerCase()}.png`;
}
