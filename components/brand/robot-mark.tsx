/** Monochrome Trainer robot head — favicon + hub menu affordance. */
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
      {/* antenna */}
      <path
        d="M12 3.2V6.1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="12" cy="2.4" r="1.35" fill="currentColor" />
      {/* head */}
      <rect
        x="4.75"
        y="6.1"
        width="14.5"
        height="13.4"
        rx="3.6"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      {/* ear nubs */}
      <path
        d="M4.75 11.2H3.4c-.4 0-.7.3-.7.7v1.8c0 .4.3.7.7.7h1.35"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.25 11.2h1.35c.4 0 .7.3.7.7v1.8c0 .4-.3.7-.7.7H19.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* eyes */}
      <rect x="7.6" y="10.1" width="3.1" height="3.4" rx="0.85" fill="currentColor" />
      <rect x="13.3" y="10.1" width="3.1" height="3.4" rx="0.85" fill="currentColor" />
      {/* mouth slot */}
      <path
        d="M9.2 16.6h5.6"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
      />
    </svg>
  );
}
