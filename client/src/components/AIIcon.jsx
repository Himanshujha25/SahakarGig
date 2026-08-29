import React from 'react';

/**
 * Premium AI Icon inspired by modern AI design language (Flaticon/Vercel/Apple AI)
 * Features glowing gradient paths, sparkle stars, and futuristic micro-circuit nodes.
 */
export function AIIcon({ size = 24, className = '', glow = false, ...props }) {
  const m = /text-\[(\d+)px\]/.exec(className);
  const iconSize = m ? Number(m[1]) : size;

  const id = React.useId().replace(/:/g, '');
  const gradId = `ai-grad-${id}`;

  return (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 transition-transform duration-300 ${glow ? 'drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]' : ''} ${className}`}
      {...props}
    >
      <defs>
        <linearGradient id={gradId} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00288e" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>

      {/* Main AI Sparkle Core */}
      <path
        d="M12 2C12 5.86599 9.13401 9 5.26801 9C9.13401 9 12 12.134 12 16C12 12.134 14.866 9 18.732 9C14.866 9 12 5.86599 12 2Z"
        fill={`url(#${gradId})`}
      />
      {/* Secondary Sparkle */}
      <path
        d="M19 13C19 15.2091 17.2091 17 15 17C17.2091 17 19 18.7909 19 21C19 18.7909 20.7909 17 23 17C20.7909 17 19 15.2091 19 13Z"
        fill={`url(#${gradId})`}
        opacity="0.85"
      />
      {/* Micro Sparkle */}
      <path
        d="M4.5 16C4.5 17.1046 3.60457 18 2.5 18C3.60457 18 4.5 18.8954 4.5 20C4.5 18.8954 5.39543 18 6.5 18C5.39543 18 4.5 17.1046 4.5 16Z"
        fill={`url(#${gradId})`}
        opacity="0.75"
      />
    </svg>
  );
}

/**
 * Premium AI Microchip Icon
 */
export function AIChipIcon({ size = 24, className = '', ...props }) {
  const m = /text-\[(\d+)px\]/.exec(className);
  const iconSize = m ? Number(m[1]) : size;
  const id = React.useId().replace(/:/g, '');
  const gradId = `aichip-grad-${id}`;

  return (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      {...props}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00288e" />
          <stop offset="50%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      
      {/* Chip Outer Frame */}
      <rect x="4" y="4" width="16" height="16" rx="4" stroke={`url(#${gradId})`} strokeWidth="1.75" fill="none" />
      {/* Core AI Block */}
      <rect x="7" y="7" width="10" height="10" rx="2" fill={`url(#${gradId})`} opacity="0.15" />
      
      {/* Pin connectors */}
      <path d="M9 2V4M15 2V4M9 20V22M15 20V22M2 9H4M2 15H4M20 9H22M20 15H22" stroke={`url(#${gradId})`} strokeWidth="1.5" strokeLinecap="round" />
      
      {/* AI Lettering inside Chip */}
      <path d="M9.5 14L11 10L12.5 14M10 13H12" stroke={`url(#${gradId})`} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 10V14" stroke={`url(#${gradId})`} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Premium AI Badge with gradient pill and glowing icon
 */
export function AIBadge({ text = "AI Powered", className = "", iconSize = 14 }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#00288e]/10 via-[#6366f1]/10 to-[#06b6d4]/10 border border-[#00288e]/25 text-[#00288e] text-[11px] font-bold tracking-wide shadow-sm hover:shadow transition-all ${className}`}>
      <AIIcon size={iconSize} glow />
      <span>{text}</span>
    </span>
  );
}

export default AIIcon;
