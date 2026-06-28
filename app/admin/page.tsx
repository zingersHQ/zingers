import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata: Metadata = {
  title: "Control Room · Zingers",
  description: "Operator supervision: activity, players, duels, economy, LLM expenses, P&L, and health/anomaly alerts.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminDashboard />;
}
