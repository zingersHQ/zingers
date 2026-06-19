"use client";
import { Sun, Moon } from "lucide-react";
import { useTheme, toggleTheme } from "@/lib/theme";

// Flip between the dark (native) and light (daytime) palettes. Two shapes:
//  • default — a nav pill matching the site-nav links
//  • compact — a square icon button matching the in-game HUD panels
export function ThemeToggle({ variant = "nav" }: { variant?: "nav" | "compact" }) {
  const theme = useTheme();
  const light = theme === "light";
  const label = light ? "Switch to dark mode" : "Switch to light mode";

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className="panel"
        suppressHydrationWarning
        aria-label={label}
        title={label}
        style={{
          padding: "8px 9px",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          color: "var(--ink)",
          lineHeight: 0,
        }}
      >
        <span suppressHydrationWarning style={{ display: "grid", placeItems: "center" }}>
          {light ? <Moon size={16} strokeWidth={2} /> : <Sun size={16} strokeWidth={2} />}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="site-nav__link mono"
      suppressHydrationWarning
      aria-label={label}
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        background: "none",
        border: "none",
      }}
    >
      <span suppressHydrationWarning style={{ display: "grid", placeItems: "center", lineHeight: 0 }}>
        {light ? <Moon size={14} strokeWidth={2} /> : <Sun size={14} strokeWidth={2} />}
      </span>
      <span suppressHydrationWarning>{light ? "Dark" : "Light"}</span>
    </button>
  );
}
