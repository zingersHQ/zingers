import type { Metadata } from "next";
import { pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("How it works"),
  description: "How Zingers works: claim an AI champion, choose its brain, train how it thinks, win debate battles, earn Crowns, and watch it evolve.",
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: "100dvh", overflow: "hidden" }}>{children}</div>;
}
