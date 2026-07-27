"use client";
import Image from "next/image";
import { canonEmbedFromUrl, regionIdFromUrl } from "@/lib/render/embed-from-url";
import { CanonEmbed } from "@/components/render/canon-embed";
import { OrgRegionFigure } from "@/components/org/org-region-figure";

/** Normalize leftover repo-relative public paths if preprocess missed a form. */
function normalizeOrgSrc(src: string): string {
  const minds = src.match(/(?:\.?\.?\/)*public\/img\/bible\/minds\/mind-([a-z]+)\.png$/i);
  if (minds) return `/renders/minds/${minds[1].toLowerCase()}.png`;
  const forces = src.match(/(?:\.?\.?\/)*public\/img\/bible\/forces\/(force-[a-z]+)\.png$/i);
  if (forces) return `/renders/forces/${forces[1].toLowerCase()}.png`;
  const regions = src.match(/(?:\.?\.?\/)*public\/img\/bible\/regions\/(region-[a-z]+)\.png$/i);
  if (regions) return `/renders/regions/${regions[1].toLowerCase()}.png`;
  const pub = src.match(/(?:\.?\.?\/)*public(\/img\/.+)$/i);
  if (pub) return pub[1];
  return src;
}

/** Renders org markdown figures — live 3D for canon renders, static Image otherwise. */
export function OrgLiveFigure({ src, alt }: { src: string; alt?: string }) {
  const url = normalizeOrgSrc(src);

  // Regions render the actual 3D region world, not an emblematic champion.
  const regionId = regionIdFromUrl(url);
  if (regionId) return <OrgRegionFigure regionId={regionId} alt={alt} />;

  const embed = canonEmbedFromUrl(url);
  if (embed) return <CanonEmbed spec={embed} alt={alt} />;

  return (
    <span className="org-prose__figure">
      <Image
        src={url}
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
