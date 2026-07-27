import type { Metadata } from "next";
import { CreativeBrief } from "@/components/org/creative-brief";
import { BRAND, pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Creative brief"),
  description: "Private studio pack: reference plates, short ideas, and narrative rules for Zingers content.",
  robots: { index: false, follow: false },
  metadataBase: new URL(BRAND.siteTech),
};

export default function CreativePage() {
  return <CreativeBrief />;
}
