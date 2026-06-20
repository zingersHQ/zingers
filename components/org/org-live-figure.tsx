"use client";
import Image from "next/image";
import { canonEmbedFromUrl, regionIdFromUrl } from "@/lib/render/embed-from-url";
import { CanonEmbed } from "@/components/render/canon-embed";
import { OrgRegionFigure } from "@/components/org/org-region-figure";

/** Renders org markdown figures — live 3D for canon renders, static Image otherwise. */
export function OrgLiveFigure({ src, alt }: { src: string; alt?: string }) {
  // Regions render the actual 3D region world, not an emblematic champion.
  const regionId = regionIdFromUrl(src);
  if (regionId) return <OrgRegionFigure regionId={regionId} alt={alt} />;

  const embed = canonEmbedFromUrl(src);
  if (embed) return <CanonEmbed spec={embed} alt={alt} />;

  return (
    <span className="org-prose__figure">
      <Image
        src={src}
        alt={alt ?? ""}
        width={1200}
        height={675}
        sizes="(max-width: 900px) 100vw, 820px"
        className="org-prose__img"
      />
      {alt ? <span className="org-prose__caption">{alt}</span> : null}
    </span>
  );
}
