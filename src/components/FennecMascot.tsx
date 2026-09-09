import React from 'react';

interface FennecMascotProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showGlow?: boolean;
}

export default function FennecMascot({ className = '', size = 'md', showGlow = true }: FennecMascotProps) {
  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${sizeClasses[size]} ${className}`}>
      {/* Luminous Gold Halo Glow */}
      {showGlow && (
        <div className="absolute inset-0 rounded-full bg-[#D4AF37]/30 blur-md animate-pulse pointer-events-none" />
      )}

      {/* StoreHub Fennec Fox Emblem (extracted from assets/logo.svg) */}
      <svg
        viewBox="30 30 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 filter drop-shadow-[0_4px_16px_rgba(212,175,55,0.4)]"
      >
        <defs>
          <linearGradient id="fennecGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF5C0" />
            <stop offset="30%" stopColor="#E5C158" />
            <stop offset="70%" stopColor="#B38728" />
            <stop offset="100%" stopColor="#8A6D1C" />
          </linearGradient>
        </defs>

        <g stroke="url(#fennecGold)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          {/* Left Big Ear (Outer Leaf) */}
          <path d="M 72.5,69.5 C 72.5,55 60.5,41 48,41 C 39,41 41.5,54.5 50.5,65.5 C 57.5,73.5 66.5,76.5 72.5,76.5 Z" strokeWidth="2.6" />
          <path d="M 56.5,48.5 C 51.5,55 51.5,62 58.5,68.5" strokeWidth="1.3" />
          <path d="M 45,45 C 42.5,51 45,58 51.5,63.5" strokeWidth="0.8" />

          {/* Right Ear (Outer Leaf) */}
          <path d="M 73.5,72 C 73.5,58.5 83.5,44 94,44 C 101,44 98.5,55.5 91.5,64.5 C 87,69 81.5,72 73.5,72 Z" strokeWidth="2.2" />
          <path d="M 84,48.5 C 86.5,54 85,59.5 80.5,64" strokeWidth="1.3" />

          {/* Head & Muzzle Profile */}
          <path d="M 72.5,76.5 C 72.5,81 81.5,81 84,83 C 86.5,84 84,86.5 80.5,86.5" strokeWidth="2.2" />
          {/* Eye (Closed/Sleeping curve) */}
          <path d="M 67.5,75.5 C 70,74.5 73,75.5 74.5,77.5" strokeWidth="1.6" />

          {/* Elegant body/neck lines */}
          <path d="M 59,83 C 52,92 57.5,107.5 61,118" strokeWidth="2.2" />
          <path d="M 72.5,81 C 70,92.5 69,103.5 68,118" strokeWidth="2.2" />

          {/* Sweeping Tail with split tips */}
          <path d="M 61,118 C 50.5,118 50.5,132.5 61,136 C 76.5,139.5 94.5,131.5 112.5,127 C 126,123.5 137.5,118 128.5,112.5 C 115,109 101.5,116 90.5,116 C 79,116 69,112.5 61,118 Z" strokeWidth="2.6" />
          <path d="M 112.5,127 C 117,123.5 121.5,119 128.5,112.5" strokeWidth="1.9" />
          <path d="M 95.5,129 C 102,126.5 107.5,123.5 114,118" strokeWidth="1.1" />
        </g>
      </svg>
    </div>
  );
}
