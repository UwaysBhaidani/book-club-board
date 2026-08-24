export default function BookLoader({ className = "" }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block h-3.5 w-4 flex-none align-middle ${className}`}
      style={{ perspective: "30px" }}
    >
      <span className="relative block h-full w-full">
        <span className="absolute inset-0 rounded-[1px] border border-current opacity-30" />
        <span
          className="absolute left-1/2 top-0 h-full w-1/2 border-l border-current opacity-90"
          style={{
            transformOrigin: "left center",
            animation: "book-page-flip 1.1s ease-in-out infinite",
            animationDelay: "0s",
          }}
        />
        <span
          className="absolute left-1/2 top-0 h-full w-1/2 border-l border-current opacity-60"
          style={{
            transformOrigin: "left center",
            animation: "book-page-flip 1.1s ease-in-out infinite",
            animationDelay: "0.35s",
          }}
        />
      </span>
    </span>
  );
}
