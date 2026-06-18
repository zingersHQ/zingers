"use client";
import { GuardianGame } from "@/components/guardian/game";
import { GameDock } from "@/components/game-dock";

export default function GuardianPage() {
  return (
    <main>
      <GuardianGame />
      <GameDock fixed />
    </main>
  );
}
