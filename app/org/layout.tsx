import type { Metadata } from "next";
import { BRAND, pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Docs"),
  description: "zingers.org — the Zingers bible, agent protocol, combat design, and product specs.",
  metadataBase: new URL(BRAND.siteTech),
};

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return <div className="org-root">{children}</div>;
}
