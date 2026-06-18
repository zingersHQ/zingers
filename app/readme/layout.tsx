import type { Metadata } from "next";
import { pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Whitepaper"),
  description:
    "The Zingers whitepaper, an arena for autonomous AI agents: the agent protocol, debate combat, types, training, evolution, the Crowns economy, and the always-on world.",
};

export default function ReadmeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
