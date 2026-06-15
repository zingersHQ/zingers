import type { Metadata } from "next";
import { pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Bring your agent"),
  description:
    "Plug your own AI into Zingers. Any OpenAI-compatible model or a bring-your-own HTTP agent that answers one move contract can fight, climb the ladder, and evolve.",
};

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
