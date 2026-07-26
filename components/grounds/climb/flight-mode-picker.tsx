"use client";
// Flight ready-mode chrome — ranked default, Explore stepper, Expedition as a
// secondary line. Shared by mobile circuit-lite and desktop CircuitHud.
import type { CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { scoutStartSector } from "@/lib/climb-campaign";
import { reachThemeByIndex } from "./reaches";

export type FlightRunMode = "ranked" | "scout" | "expedition";

const chipBase: CSSProperties = {
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 0.7,
  cursor: "pointer",
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
  border: "1.5px solid rgba(255,255,255,.18)",
  background: "rgba(10,10,18,.55)",
  color: "rgba(242,238,251,.75)",
  minHeight: 40,
  padding: "10px 14px",
};

export function FlightModePicker({
  runMode,
  scoutCamp,
  scoutCamps,
  scoutUnlocked,
  expeditionOpen,
  expeditionName,
  expeditionGloss,
  accent,
  climbHundred,
  onPickRanked,
  onPickScout,
  onPickExpedition,
}: {
  runMode: FlightRunMode;
  scoutCamp: number;
  scoutCamps: number;
  scoutUnlocked: boolean;
  expeditionOpen: boolean;
  expeditionName?: string | null;
  expeditionGloss?: string | null;
  accent: string;
  climbHundred?: boolean;
  onPickRanked: () => void;
  onPickScout: (camp: number) => void;
  onPickExpedition?: () => void;
}) {
  const t = useTranslations("flight");
  const camp = Math.max(1, Math.min(Math.max(1, scoutCamps), scoutCamp || 1));
  const theme = reachThemeByIndex(camp - 1);
  const exploreSector = scoutStartSector(camp) + 1;
  const canPrev = camp > 1;
  const canNext = camp < scoutCamps;
  const exploreOn = runMode === "scout";
  const rankedOn = runMode === "ranked";
  const expeditionOn = runMode === "expedition";

  const step = (delta: -1 | 1) => {
    const next = Math.max(1, Math.min(scoutCamps, camp + delta));
    onPickScout(next);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        width: "100%",
        maxWidth: 420,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onPickRanked}
        className="mono"
        style={{
          ...chipBase,
          border: `1.5px solid ${rankedOn ? accent : "rgba(255,255,255,.18)"}`,
          background: rankedOn ? `${accent}33` : "rgba(10,10,18,.55)",
          color: rankedOn ? accent : "rgba(242,238,251,.75)",
        }}
      >
        {t("modeRanked")}
      </button>

      {scoutUnlocked && scoutCamps > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            width: "100%",
            maxWidth: 340,
          }}
        >
          <button
            type="button"
            aria-label={t("explorePrev")}
            disabled={!canPrev}
            onClick={() => step(-1)}
            className="mono"
            style={{
              ...chipBase,
              padding: "10px 12px",
              minWidth: 44,
              opacity: canPrev ? 1 : 0.35,
              border: `1.5px solid ${exploreOn ? theme.accent : "rgba(255,255,255,.18)"}`,
              color: exploreOn ? theme.accent : "rgba(242,238,251,.75)",
            }}
          >
            <ChevronLeft size={16} strokeWidth={2.6} />
          </button>
          <button
            type="button"
            onClick={() => onPickScout(camp)}
            className="mono"
            title={`${theme.name} · Camp ${theme.roman}`}
            style={{
              ...chipBase,
              flex: 1,
              border: `1.5px solid ${exploreOn ? theme.accent : "rgba(255,255,255,.18)"}`,
              background: exploreOn ? `${theme.accent}33` : "rgba(10,10,18,.55)",
              color: exploreOn ? theme.accent : "rgba(242,238,251,.85)",
              textAlign: "center",
            }}
          >
            {t("exploreFrom", { sector: exploreSector })}
          </button>
          <button
            type="button"
            aria-label={t("exploreNext")}
            disabled={!canNext}
            onClick={() => step(1)}
            className="mono"
            style={{
              ...chipBase,
              padding: "10px 12px",
              minWidth: 44,
              opacity: canNext ? 1 : 0.35,
              border: `1.5px solid ${exploreOn ? theme.accent : "rgba(255,255,255,.18)"}`,
              color: exploreOn ? theme.accent : "rgba(242,238,251,.75)",
            }}
          >
            <ChevronRight size={16} strokeWidth={2.6} />
          </button>
        </div>
      )}

      {exploreOn && (
        <div className="mono" style={{ fontSize: 9, letterSpacing: 1, color: "rgba(242,238,251,.55)", textAlign: "center" }}>
          {t("practice")}
          {climbHundred ? t("practiceHundred") : ""}
        </div>
      )}

      {expeditionOpen && onPickExpedition && expeditionName && (
        <button
          type="button"
          onClick={onPickExpedition}
          title={expeditionGloss ?? undefined}
          className="mono"
          style={{
            border: "none",
            background: "transparent",
            padding: "4px 8px",
            cursor: "pointer",
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.8,
            color: expeditionOn ? "var(--gold)" : "rgba(242,238,251,.55)",
            textDecoration: expeditionOn ? "none" : "underline",
            textUnderlineOffset: 3,
          }}
        >
          {t("weeksSkyNamed", { name: expeditionName })}
        </button>
      )}
    </div>
  );
}

/** Short HOLD label that names the selected mode. */
export function flightHoldLabel(
  t: (key: string, values?: Record<string, string | number>) => string,
  runMode: FlightRunMode,
  expeditionName?: string | null,
): string {
  if (runMode === "scout") return t("holdExplore");
  if (runMode === "expedition") {
    return t("holdExpedition", { name: (expeditionName || t("weeksSky")).toUpperCase() });
  }
  return t("hold");
}
