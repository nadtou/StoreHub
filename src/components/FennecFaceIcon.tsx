import React from 'react';

interface FennecFaceIconProps {
  className?: string;
}

/**
 * Minimalist frontal fennec fox face — thin gold line art matching the
 * StoreHub luxury palette. Used as a small brand marker next to "FENNCO IA"
 * (chat avatar), replacing the generic sparkle icon.
 */
export default function FennecFaceIcon({ className = 'w-4 h-4' }: FennecFaceIconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Left Ear (outer silhouette + inner detail line) */}
      <path d="M50,8 C35,10 18,20 15,42 C14,52 22,55 30,50 C40,44 46,28 50,8 Z" />
      <path d="M45,16 C36,21 27,30 25,44" strokeWidth="1.6" />

      {/* Right Ear (mirrored) */}
      <path d="M50,8 C65,10 82,20 85,42 C86,52 78,55 70,50 C60,44 54,28 50,8 Z" />
      <path d="M55,16 C64,21 73,30 75,44" strokeWidth="1.6" />

      {/* Face */}
      <path d="M30,50 C25,60 25,73 35,82 C42,88 58,88 65,82 C75,73 75,60 70,50 C63,58 37,58 30,50 Z" />

      {/* Eyes */}
      <path d="M35,61 C38,58 43,58 46,61" strokeWidth="2" />
      <circle cx="40.5" cy="64" r="1.8" fill="currentColor" stroke="none" />
      <path d="M54,61 C57,58 62,58 65,61" strokeWidth="2" />
      <circle cx="59.5" cy="64" r="1.8" fill="currentColor" stroke="none" />

      {/* Nose */}
      <path d="M47,74 C47,71.5 53,71.5 53,74 C53,76.5 50,78.5 50,78.5 C50,78.5 47,76.5 47,74 Z" fill="currentColor" stroke="none" />

      {/* Whiskers */}
      <path d="M34,75 L19,71" strokeWidth="1.4" />
      <path d="M33,79 L17,79" strokeWidth="1.4" />
      <path d="M34,83 L19,87" strokeWidth="1.4" />
      <path d="M66,75 L81,71" strokeWidth="1.4" />
      <path d="M67,79 L83,79" strokeWidth="1.4" />
      <path d="M66,83 L81,87" strokeWidth="1.4" />
    </svg>
  );
}
