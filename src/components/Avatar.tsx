"use client";

import { useState } from "react";

// Muted, earthy tones that sit comfortably alongside the site's own palette
// (dusty rose, sage, tan, slate) rather than a saturated rainbow.
const DOG_COLORS = [
  "hsl(20, 40%, 46%)",
  "hsl(150, 32%, 42%)",
  "hsl(205, 32%, 46%)",
  "hsl(25, 42%, 50%)",
  "hsl(290, 28%, 44%)",
  "hsl(55, 34%, 44%)",
  "hsl(200, 34%, 46%)",
  "hsl(35, 34%, 52%)",
  "hsl(260, 26%, 46%)",
  "hsl(145, 28%, 44%)",
  "hsl(5, 30%, 46%)",
  "hsl(235, 28%, 48%)",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function DogFaceIcon({ seed, className }: { seed: number; className?: string }) {
  const color = DOG_COLORS[seed % DOG_COLORS.length];

  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill={color} opacity="0.15" />
      {/* Ears are drawn first, with their base tucked well inside the head
          shape below, so the head paints over the seam and they read as
          attached rather than floating. */}
      <path d="M13 12 C 6 11, 2 17, 6 26 C 10 23, 13 18, 17 13 Z" fill={color} />
      <path d="M27 12 C 34 11, 38 17, 34 26 C 30 23, 27 18, 23 13 Z" fill={color} />
      <ellipse cx="20" cy="21" rx="14" ry="13" fill={color} />
      <ellipse cx="20" cy="27" rx="8" ry="6.5" fill="#ece0d1" />
      <circle cx="14.5" cy="19" r="2.3" fill="#1c1410" />
      <circle cx="13.7" cy="18.2" r="0.7" fill="#f0e6dc" />
      <circle cx="25.5" cy="19" r="2.3" fill="#1c1410" />
      <circle cx="24.7" cy="18.2" r="0.7" fill="#f0e6dc" />
      <ellipse cx="20" cy="25.5" rx="2.6" ry="2" fill="#1c1410" />
      <path
        d="M20 28 Q 18.5 30 16.5 27.8"
        stroke="#1c1410"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M20 28 Q 21.5 30 23.5 27.8"
        stroke="#1c1410"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Avatar({
  avatarUrl,
  seed,
  size = 28,
  className = "",
}: {
  avatarUrl: string | null | undefined;
  seed: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = avatarUrl && !failed;

  return (
    <span
      className={`inline-flex flex-none items-center justify-center overflow-hidden rounded-full bg-accent-soft ${className}`}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <DogFaceIcon seed={hashString(seed)} className="h-full w-full" />
      )}
    </span>
  );
}
