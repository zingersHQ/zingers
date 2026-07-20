"use client";
import { useId } from "react";

/**
 * Monochrome Trainer robot head — favicon twin for UI.
 * Filled silhouette (not strokes) so it still reads at ~14–16px.
 */
export function RobotMark({
  size = 18,
  title,
  className,
}: {
  size?: number;
  /** Accessible name when the mark stands alone. Omit when decorative. */
  title?: string;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const maskId = `robot-mark-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <rect x="1.6" y="5.4" width="20.8" height="16.8" rx="4.6" fill="#fff" />
          <rect x="5" y="9.2" width="5" height="5.6" rx="1.5" fill="#000" />
          <rect x="14" y="9.2" width="5" height="5.6" rx="1.5" fill="#000" />
          <rect x="8.2" y="17.2" width="7.6" height="2.1" rx="1.05" fill="#000" />
        </mask>
      </defs>
      {/* antenna */}
      <circle cx="12" cy="2.6" r="2.1" fill="currentColor" />
      <rect x="10.2" y="3" width="3.6" height="3.6" rx="1.6" fill="currentColor" />
      {/* head with eye/mouth cutouts */}
      <rect
        x="1.6"
        y="5.4"
        width="20.8"
        height="16.8"
        rx="4.6"
        fill="currentColor"
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}
