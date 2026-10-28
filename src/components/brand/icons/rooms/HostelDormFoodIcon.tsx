import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Hostel & Dorm (Food) Icon
 * Delectable isometric/flat illustrated slice of pizza with golden crust, warm melted cheese, and pepperoni slices
 */
export const HostelDormFoodIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
    >
      <defs>
        {/* Crust Gradient */}
        <linearGradient id="pizza-crust-grad" x1="40" y1="15" x2="95" y2="65" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="60%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>

        {/* Melted Cheese Gradient */}
        <linearGradient id="pizza-cheese-grad" x1="20" y1="25" x2="80" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="35%" stopColor="#FDE047" />
          <stop offset="70%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>

        {/* Pepperoni Gradient */}
        <linearGradient id="pepperoni-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="60%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>
      </defs>

      {/* 1. Crust Top Arc */}
      <path
        d="M 44 24
           C 54 18 72 23 88 44
           C 96 54 97 66 90 73
           C 87 76 83 75 80 70
           C 72 56 58 35 44 24 Z"
        fill="url(#pizza-crust-grad)"
      />
      {/* Crust Ridge Highlight */}
      <path
        d="M 48 24
           C 58 19 74 24 88 44
           C 92 50 93 57 91 62"
        stroke="#FDE68A"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* 2. Main Triangular Pizza Slice (with bite out on bottom-left) */}
      <path
        d="M 44 24
           L 84 71
           C 80 75 75 78 70 82
           L 12 85
           C 11 80 15 76 19 74
           C 16 68 18 64 22 62
           Z"
        fill="url(#pizza-cheese-grad)"
      />

      {/* Cheese Melt Droplets & Highlights */}
      <ellipse cx="64" cy="50" rx="3" ry="1.5" fill="#FEF9C3" opacity="0.8" />
      <ellipse cx="45" cy="65" rx="2.5" ry="1.2" fill="#FEF9C3" opacity="0.8" />
      <ellipse cx="32" cy="74" rx="2" ry="1" fill="#FEF9C3" opacity="0.8" />

      {/* 3. Pepperoni 1 (Top Center) */}
      <ellipse cx="40" cy="46" rx="10" ry="8" fill="url(#pepperoni-grad)" />
      <path
        d="M 34 43 C 35 41 38 40 42 41"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <circle cx="43" cy="48" r="1.2" fill="#7F1D1D" />

      {/* 4. Pepperoni 2 (Upper Right) */}
      <ellipse cx="68" cy="56" rx="9.5" ry="8" fill="url(#pepperoni-grad)" />
      <path
        d="M 62 53 C 63 51 66 50 70 51"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <circle cx="70" cy="58" r="1.2" fill="#7F1D1D" />

      {/* 5. Pepperoni 3 (Bottom Center) */}
      <ellipse cx="40" cy="70" rx="10.5" ry="8.5" fill="url(#pepperoni-grad)" />
      <path
        d="M 33 67 C 35 65 38 64 42 65"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <circle cx="42" cy="73" r="1.2" fill="#7F1D1D" />

      {/* 6. Pepperoni 4 (Bitten edge half-pepperoni at left) */}
      <path
        d="M 18 64
           C 22 66 22 72 19 75
           C 16 76 13 75 14 71
           Z"
        fill="url(#pepperoni-grad)"
      />

      {/* Seasoning flakes / oregano specks */}
      <circle cx="56" cy="42" r="1" fill="#047857" />
      <circle cx="52" cy="62" r="1.2" fill="#047857" />
      <circle cx="62" cy="74" r="1" fill="#047857" />
      <circle cx="30" cy="56" r="0.9" fill="#047857" />
    </svg>
  );
};
