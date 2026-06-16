"use client";
import Link from "next/link";
import { GuardianGame } from "@/components/guardian/game";

export default function GuardianPage() {
  return (
    <main>
      <Link
        href="/grounds"
        className="mono"
        style={{ position: "fixed", top: 14, left: 16, zIndex: 20, fontSize: 12, color: "var(--muted)" }}
      >
        ← Zingers
      </Link>
      <GuardianGame />
    </main>
  );
}
