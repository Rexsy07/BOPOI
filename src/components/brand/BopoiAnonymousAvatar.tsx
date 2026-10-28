import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PersonaMaskIcon } from './masks/PersonaMaskIcon.tsx';

interface BopoiAnonymousAvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  idPrefix?: string;
  showSparkleBadge?: boolean;
  animateIdle?: boolean;
  interactive?: boolean;
  mask?: string;
}

export const BopoiAnonymousAvatar: React.FC<BopoiAnonymousAvatarProps> = ({
  size = 'md',
  className = '',
  idPrefix = 'bopoi-mascot',
  showSparkleBadge = false,
  animateIdle = true,
  interactive = true,
  mask,
}) => {
  const [isBlinking, setIsBlinking] = useState(false);

  const getDimension = () => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'xs': return 22;
      case 'sm': return 26;
      case 'md': return 38;
      case 'lg': return 48;
      case 'xl': return 64;
      default: return 38;
    }
  };

  const dim = getDimension();

  // Gentle natural idle eye blink
  useEffect(() => {
    if (!animateIdle) return;
    const interval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 4000 + Math.random() * 2500);

    return () => clearInterval(interval);
  }, [animateIdle]);

  if (mask) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, y: animateIdle ? [0, -2, 0] : 0 }}
        transition={{
          scale: { type: 'spring', stiffness: 380, damping: 16 },
          y: { repeat: Infinity, duration: 3.2, ease: 'easeInOut' },
        }}
        whileHover={interactive ? { scale: 1.15, transition: { duration: 0.15 } } : undefined}
        className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      >
        <PersonaMaskIcon mask={mask} size={dim} />
        {showSparkleBadge && (
          <span className="absolute -top-1 -right-1 text-xs select-none drop-shadow-xs">✨</span>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        y: animateIdle ? [0, -2, 0] : 0,
      }}
      transition={{
        scale: { type: 'spring', stiffness: 380, damping: 16 },
        opacity: { duration: 0.25 },
        y: { repeat: Infinity, duration: 3.2, ease: 'easeInOut' },
      }}
      whileHover={
        interactive
          ? {
              scale: 1.18,
              rotate: 6,
              y: -3,
              transition: { type: 'spring', stiffness: 450, damping: 12 },
            }
          : undefined
      }
      whileTap={
        interactive
          ? {
              scale: 0.88,
              rotate: -6,
              transition: { type: 'spring', stiffness: 500, damping: 15 },
            }
          : undefined
      }
      className={`relative inline-flex items-center justify-center shrink-0 select-none cursor-pointer ${className}`}
    >
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="select-none shrink-0"
        style={{ filter: 'drop-shadow(0 3px 6px rgba(40, 10, 160, 0.32))' }}
      >
        <defs>
          {/* Deep Royal Purple Mascot Gradient matching IMG_3421.png */}
          <linearGradient id={`${idPrefix}-body-grad`} x1="20" y1="8" x2="82" y2="92" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#5522F5" />
            <stop offset="35%" stopColor="#4314DE" />
            <stop offset="70%" stopColor="#350EB9" />
            <stop offset="100%" stopColor="#25068E" />
          </linearGradient>

          {/* Top-left specular 3D light reflection */}
          <linearGradient id={`${idPrefix}-top-shine`} x1="16" y1="12" x2="65" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#966EFF" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#632AFF" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#4314DE" stopOpacity="0" />
          </linearGradient>

          {/* Subtle bottom rim glow for depth */}
          <linearGradient id={`${idPrefix}-rim-glow`} x1="50" y1="75" x2="88" y2="92" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F52D85" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FFA62B" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Speech Bubble Mascot Body matching IMG_3421.png */}
        <path
          d="M 52 10
             C 74 10 92 25 92 47
             C 92 68.5 76 85 54 85
             C 43.5 85 36 82 28 85
             C 24 88.5 21 95 21.5 96.5
             C 22.5 98 24.5 97.5 27 94
             C 30.5 88.5 27 80 19.5 73.5
             C 13 65.5 10 56.5 10 47
             C 10 25 29 10 52 10 Z"
          fill={`url(#${idPrefix}-body-grad)`}
        />

        {/* Warm bottom-right rim glow */}
        <path
          d="M 54 85
             C 76 85 92 68.5 92 47
             C 92 60 80 82 54 85 Z"
          fill={`url(#${idPrefix}-rim-glow)`}
        />

        {/* Top 3D highlight reflection */}
        <path
          d="M 52 11.5
             C 71 11.5 87 25 89 42
             C 83 28 68 15.5 50 15.5
             C 31.5 15.5 18.5 27 14 42
             C 14.5 25 31.5 11.5 52 11.5 Z"
          fill={`url(#${idPrefix}-top-shine)`}
        />

        {/* Left Solid White Pill Eye - lifted and upright, looking directly forward */}
        <motion.rect
          x="32"
          y="27"
          width="16"
          height="32"
          rx="8"
          fill="#FFFFFF"
          animate={isBlinking ? { scaleY: 0.12 } : { scaleY: 1 }}
          transition={{ duration: 0.1 }}
          style={{ originX: '40px', originY: '43px' }}
        />

        {/* Right Solid White Pill Eye - lifted, proportional, looking directly forward */}
        <motion.rect
          x="54"
          y="23"
          width="16"
          height="32"
          rx="8"
          fill="#FFFFFF"
          animate={isBlinking ? { scaleY: 0.12 } : { scaleY: 1 }}
          transition={{ duration: 0.1 }}
          style={{ originX: '62px', originY: '39px' }}
        />
      </svg>

      {/* Interactive Sparkle Badge in corner */}
      {showSparkleBadge && dim >= 32 && (
        <motion.span
          initial={{ scale: 0, rotate: -40 }}
          animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
          transition={{
            scale: { delay: 0.15, type: 'spring', stiffness: 400, damping: 14 },
            rotate: { repeat: Infinity, duration: 3.8, ease: 'easeInOut' },
          }}
          whileHover={{ scale: 1.3, rotate: 180 }}
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#FFC928] border-2 border-white flex items-center justify-center text-[8px] font-black text-[#191525] shadow-xs"
          title="Anonymous Bopoi Submission"
        >
          ✨
        </motion.span>
      )}
    </motion.div>
  );
};
