import type { SVGProps } from 'react';

export function PerklyLogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="perklyLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="12" fill="url(#perklyLogoGrad)" />
      <path
        fill="#FFFFFF"
        d="M8.5 5.5H13a3.5 3.5 0 0 1 0 7H10.5V18.5H8.5V5.5ZM10.5 7.5V11H13a1.75 1.75 0 0 0 0-3.5H10.5Z"
      />
    </svg>
  );
}
