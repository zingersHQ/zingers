import type { Metadata } from "next";
import { ArtStudio } from "@/components/art/art-studio";
import { pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Art studio"),
  robots: { index: false, follow: false },
};

export default function ArtStudioPage() {
  return <ArtStudio />;
}
