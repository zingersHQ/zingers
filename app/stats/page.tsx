import type { Metadata } from "next";
import { StatsScreen } from "@/components/stats/stats-screen";

export const metadata: Metadata = {
  title: "Observatory · Zingers",
  description: "Aggregate behaviour analytics: active players, the core funnel, and the daily event ledger.",
  robots: { index: false, follow: false },
};

export default function StatsPage() {
  return <StatsScreen />;
}
