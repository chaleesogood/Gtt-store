import React, { useId } from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = "h-10 w-10", size = 40 }: LogoProps) {
  const textPathId = useId().replace(/:/g, '-'); // standard unique id to avoid textPath collisions in SVG tree

  return (
    <svg 
      viewBox="0 0 120 120" 
      className={`${className} overflow-visible`} 
      width={size} 
      height={size} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      id={`logo-svg-${textPathId}`}
    >
      <defs>
        {/* Modern high-tech gradient from electric indigo to bright cyan/teal */}
        <linearGradient id={`logo-grad-${textPathId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" /> {/* Electric Indigo */}
          <stop offset="60%" stopColor="#3B52CE" /> {/* Deep Royal Blue */}
          <stop offset="100%" stopColor="#06B6D4" /> {/* Cyan/Teal Accent */}
        </linearGradient>
        
        <linearGradient id={`lever-grad-${textPathId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#3B52CE" />
        </linearGradient>
      </defs>

      {/* The Top Right Lever */}
      <path 
        d="M 46,46 L 82,18 C 84,16 88,16 90,18 L 102,30 C 104,32 104,36 102,38 L 54,54 Z" 
        fill={`url(#lever-grad-${textPathId})`} 
      />
      {/* Small pivot circle */}
      <circle cx="48" cy="48" r="3" fill="#FFFFFF" />
      {/* Large lever head circle (ring) */}
      <circle cx="94" cy="26" r="8" fill="#FFFFFF" />
      <circle cx="94" cy="26" r="5" fill="#3B52CE" />

      {/* Main Blue Circular Body with new gradient */}
      <circle cx="45" cy="65" r="32" fill={`url(#logo-grad-${textPathId})`} />
      
      {/* Letters G and T inside */}
      <text 
        x="21" 
        y="75" 
        fill="#FFFFFF" 
        fontSize="27" 
        fontWeight="900" 
        fontFamily="'Inter', 'Arial Black', sans-serif"
      >
        G
      </text>
      <text 
        x="43" 
        y="73" 
        fill="#FFFFFF" 
        fontSize="22" 
        fontWeight="900" 
        fontFamily="'Inter', 'Arial Black', sans-serif"
      >
        T
      </text>

      {/* Thin outer boundary arc for text on the right */}
      <path 
        id={textPathId} 
        d="M 82,49 A 42,42 0 0,1 42,107" 
        fill="none" 
        stroke="#06B6D4" 
        strokeWidth="1.5" 
      />
      
      {/* Curving text */}
      <text 
        fontSize="5.2" 
        fontWeight="bold" 
        fontFamily="'Inter', sans-serif" 
        letterSpacing="0.4"
      >
        <textPath href={`#${textPathId}`} startOffset="5%" fill="#3B52CE">
          GLOBAL TRANSYS TECHNOLOGY CO.,LTD
        </textPath>
      </text>
    </svg>
  );
}
