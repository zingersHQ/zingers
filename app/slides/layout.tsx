import type { Metadata } from "next";
import { BRAND, pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Slides"),
  description: "Zingers pitch deck: team & hackathon presentation.",
};

export default function SlidesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100dvh", overflow: "hidden" }}>
      {children}
    </div>
  );
}
