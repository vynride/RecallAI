export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="11" fill="#ff7759" />
      <path
        d="M24 12 A12 12 0 1 1 12 24"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <polygon points="8,21 12,27 16,21" fill="white" />
      <circle cx="24" cy="24" r="3.5" fill="white" />
    </svg>
  );
}
