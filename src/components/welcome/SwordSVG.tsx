interface SwordSVGProps {
  className?: string;
}

export function SwordSVG({ className }: SwordSVGProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.8))" }}
    >
      <defs>
        <linearGradient
          id="blade-left"
          x1="50"
          y1="160"
          x2="15"
          y2="500"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <linearGradient
          id="blade-right"
          x1="50"
          y1="160"
          x2="85"
          y2="500"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient
          id="gold"
          x1="0"
          y1="130"
          x2="100"
          y2="160"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="20%" stopColor="#fde68a" />
          <stop offset="50%" stopColor="#b45309" />
          <stop offset="80%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <radialGradient
          id="gem"
          cx="50"
          cy="150"
          r="8"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </radialGradient>
        <radialGradient
          id="pommel-gem"
          cx="50"
          cy="40"
          r="8"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </radialGradient>
      </defs>

      {/* Blade */}
      <path
        d="M50 160 L25 160 Q36 220 36 300 L36 440 L50 500 Z"
        fill="url(#blade-left)"
      />
      <path
        d="M50 160 L75 160 Q64 220 64 300 L64 440 L50 500 Z"
        fill="url(#blade-right)"
      />
      {/* Fuller */}
      <path
        d="M48 160 L48 420 L50 450 L52 420 L52 160 Z"
        fill="#0f172a"
        opacity="0.35"
      />
      <path
        d="M50 160 L50 500"
        stroke="#ffffff"
        strokeWidth="1"
        opacity="0.7"
      />

      {/* Grip */}
      <rect x="42" y="60" width="16" height="90" fill="#1e293b" />
      <path
        d="M42 70 L58 78 M42 85 L58 93 M42 100 L58 108 M42 115 L58 123 M42 130 L58 138"
        stroke="#fde68a"
        strokeWidth="2"
      />

      {/* Crossguard */}
      <path
        d="M50 165 Q15 170 0 130 Q25 150 50 145 Q75 150 100 130 Q85 170 50 165 Z"
        fill="url(#gold)"
      />
      <path d="M50 140 L60 150 L50 160 L40 150 Z" fill="#fbbf24" />
      <path d="M50 143 L57 150 L50 157 L43 150 Z" fill="url(#gem)" />

      {/* Pommel */}
      <path
        d="M50 20 Q65 20 65 40 Q65 60 50 60 Q35 60 35 40 Q35 20 50 20 Z"
        fill="url(#gold)"
      />
      <circle cx="50" cy="40" r="8" fill="url(#pommel-gem)" />
      <circle
        cx="50"
        cy="40"
        r="8"
        fill="none"
        stroke="#fde68a"
        strokeWidth="1"
      />
    </svg>
  );
}
