import type { Metadata } from "next";
import { CreativeBrief } from "@/components/org/creative-brief";
import { OrgShell } from "@/components/org/org-shell";
import { BRAND, pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Press kit"),
  description:
    "Zingers press kit: live game-model renders, Flight and bond story beats, downloadable PNG seeds, and studio prompts for press, social, and film.",
  robots: { index: true, follow: true },
  metadataBase: new URL(BRAND.siteTech),
  alternates: { canonical: `${BRAND.siteTech}/press` },
  openGraph: {
    title: pageTitle("Press kit"),
    description: "You fly. It fights. You both rise. Official assets and story beats from live game models.",
    url: `${BRAND.siteTech}/press`,
    siteName: BRAND.name,
  },
};

export default function PressPage() {
  return (
    <div className="org-root">
      <OrgShell wide activeExtra="press">
        <CreativeBrief />
      </OrgShell>
    </div>
  );
}
