export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Chainglass"
    >
      <defs>
        <linearGradient id="cg-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <path
        d="M20 3 L34 11 V29 L20 37 L6 29 V11 Z"
        stroke="url(#cg-grad)"
        strokeWidth="1.8"
        fill="rgba(94,234,212,0.06)"
      />
      <circle cx="20" cy="20" r="6" fill="url(#cg-grad)" opacity="0.85" />
      <circle cx="20" cy="20" r="2.5" fill="#05070a" />
    </svg>
  );
}
