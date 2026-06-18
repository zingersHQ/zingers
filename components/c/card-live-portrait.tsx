"use client";
import { showcaseChampion } from "@/lib/render/showcase";
import { ChampionPortrait } from "@/components/render/champion-portrait";

export function CardLivePortrait({ rosterKey, type }: { rosterKey: string; type: Parameters<typeof ChampionPortrait>[0]["type"] }) {
  const { champion } = showcaseChampion(rosterKey);
  return (
    <ChampionPortrait rosterKey={rosterKey} type={type} champion={champion} preset="portrait" eager />
  );
}
