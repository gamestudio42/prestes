import type { SVGProps } from 'react';

export function RifleIcon({ size = 16, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 14h4l3-3h6l3 2v2h-5l-2 2H8l-2 2H4z" />
      <path d="M12 13l4-4 2 1-3 5" />
      <path d="M17 8h3" />
    </svg>
  );
}
