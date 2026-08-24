export default function PadlockIcon({
  unlocked,
  className,
}: {
  unlocked: boolean;
  className?: string;
}) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <circle cx="12" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
      <path d="M12 16.6V18.5" />
      {unlocked ? <path d="M7 11V7a5 5 0 0 1 9.9-1" /> : <path d="M7 11V7a5 5 0 0 1 10 0v4" />}
    </svg>
  );
}
