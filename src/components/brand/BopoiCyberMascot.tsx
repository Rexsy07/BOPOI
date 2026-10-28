import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

export type MascotMood = 'happy' | 'curious' | 'winking' | 'floating' | 'listening' | 'excited' | 'cyber';
export type MascotEntrance = 'pop' | 'bounce' | 'teleport' | 'float' | 'none';
export type MascotIdle = 'playful' | 'float' | 'breathe' | 'chill' | 'none';

export interface BopoiCyberMascotProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  speechBubbleText?: string;
  mood?: MascotMood;
  interactive?: boolean;
  entranceAnimation?: MascotEntrance;
  idleAnimation?: MascotIdle;
  showCyberGlow?: boolean;
  showParticles?: boolean;
  onMascotClick?: () => void;
}

export const BopoiCyberMascot: React.FC<BopoiCyberMascotProps> = ({
  size = 'md',
  className = '',
  speechBubbleText,
  mood = 'floating',
  interactive = true,
  entranceAnimation = 'pop',
  idleAnimation = 'playful',
  showCyberGlow = true,
  showParticles = true,
  onMascotClick,
}) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [isWinking, setIsWinking] = useState(mood === 'winking');
  const [tapCounter, setTapCounter] = useState(0);
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  const getDimension = () => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'xs': return 32;
      case 'sm': return 44;
      case 'md': return 64;
      case 'lg': return 88;
      case 'xl': return 116;
      default: return 64;
    }
  };

  const dim = getDimension();

  // Natural idle blinking intervals
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 160);
    }, 3200 + Math.random() * 2400);

    return () => clearInterval(blinkInterval);
  }, []);

  const handleClick = () => {
    setTapCounter((prev) => prev + 1);
    setIsWinking(true);
    setShowHeartBurst(true);
    setTimeout(() => setIsWinking(false), 900);
    setTimeout(() => setShowHeartBurst(false), 1100);
    if (onMascotClick) onMascotClick();
  };

  // Entrance variants using Framer Motion springs and transforms
  const entranceVariants: Variants = {
    pop: {
      scale: [0, 1.2, 0.95, 1],
      rotate: [-18, 6, -3, 0],
      opacity: [0, 1, 1, 1],
      y: [35, -8, 2, 0],
      transition: {
        type: 'spring',
        stiffness: 420,
        damping: 14,
        mass: 0.8,
      },
    },
    bounce: {
      y: [-90, 8, -6, 0],
      scaleY: [1.3, 0.85, 1.05, 1],
      scaleX: [0.8, 1.15, 0.98, 1],
      opacity: [0, 1, 1, 1],
      transition: {
        type: 'spring',
        stiffness: 380,
        damping: 12,
        duration: 0.85,
      },
    },
    teleport: {
      scale: [0.2, 1.18, 0.96, 1],
      opacity: [0, 0.9, 1, 1],
      filter: [
        'blur(12px) brightness(2.2)',
        'blur(2px) brightness(1.3)',
        'blur(0px) brightness(1)',
      ],
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
    float: {
      opacity: [0, 1],
      y: [20, 0],
      scale: [0.9, 1],
      transition: { duration: 0.6, ease: 'easeOut' },
    },
    none: {
      opacity: 1,
      scale: 1,
      y: 0,
    },
  };

  // Idle animation presets using Framer Motion
  const getIdleAnimation = () => {
    switch (idleAnimation) {
      case 'playful':
        return {
          y: [0, -7, 2, -6, 0],
          rotate: [0, -3.5, 3, -2, 0],
          scale: [1, 1.025, 0.99, 1.02, 1],
          transition: {
            repeat: Infinity,
            duration: 4.2,
            ease: 'easeInOut' as const,
          },
        };
      case 'float':
        return {
          y: [0, -9, 0],
          transition: {
            repeat: Infinity,
            duration: 3,
            ease: 'easeInOut' as const,
          },
        };
      case 'breathe':
        return {
          scale: [1, 1.04, 1],
          transition: {
            repeat: Infinity,
            duration: 2.8,
            ease: 'easeInOut' as const,
          },
        };
      case 'chill':
        return {
          rotate: [-2, 2, -2],
          y: [0, -3, 0],
          transition: {
            repeat: Infinity,
            duration: 5,
            ease: 'easeInOut' as const,
          },
        };
      case 'none':
      default:
        return {};
    }
  };

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center select-none ${className}`}
      style={{ minWidth: dim, minHeight: dim }}
    >
      {/* Optional Animated Speech Bubble */}
      <AnimatePresence>
        {speechBubbleText && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 450, damping: 22 }}
            className="mb-2 px-3 py-1.5 bg-white text-[#191525] text-xs font-black rounded-2xl shadow-xl border border-[#5420F5]/25 flex items-center gap-1.5 max-w-xs text-center z-20 pointer-events-none"
          >
            <span>{speechBubbleText}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cyber Glow Aura Ring behind Mascot */}
      {showCyberGlow && (
        <motion.div
          animate={{
            scale: [0.92, 1.14, 0.92],
            opacity: [0.28, 0.55, 0.28],
          }}
          transition={{
            repeat: Infinity,
            duration: 3.4,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#5420F5]/40 via-purple-400/25 to-[#FF922E]/20 blur-md pointer-events-none"
        />
      )}

      {/* Mascot Main Body with Framer Motion Entrance, Idle & Interaction */}
      <motion.div
        key={`mascot-body-${tapCounter}`}
        variants={entranceVariants}
        initial={entranceAnimation}
        animate={{
          ...getIdleAnimation(),
        }}
        whileHover={
          interactive
            ? {
                scale: 1.15,
                rotate: 7,
                y: -9,
                transition: { type: 'spring', stiffness: 450, damping: 12 },
              }
            : undefined
        }
        whileTap={
          interactive
            ? {
                scale: 0.88,
                rotate: -9,
                transition: { type: 'spring', stiffness: 500, damping: 14 },
              }
            : undefined
        }
        onClick={handleClick}
        className={`cursor-pointer shrink-0 relative flex items-center justify-center ${
          interactive ? 'hover:brightness-105 active:scale-95' : ''
        }`}
        title="Tap the Bopoi Mascot! 🎭"
      >
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0 overflow-visible"
          style={{
            filter: 'drop-shadow(0 7px 16px rgba(45, 10, 180, 0.38))',
          }}
        >
          <defs>
            {/* Deep Royal Purple Mascot Body Gradient */}
            <linearGradient
              id="cyber-mascot-grad"
              x1="18"
              y1="8"
              x2="84"
              y2="92"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#5B25F8" />
              <stop offset="35%" stopColor="#4314DE" />
              <stop offset="70%" stopColor="#350EB9" />
              <stop offset="100%" stopColor="#220582" />
            </linearGradient>

            {/* Specular 3D Light Dome */}
            <linearGradient
              id="cyber-light-dome"
              x1="16"
              y1="10"
              x2="70"
              y2="40"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#A47DFF" stopOpacity="0.88" />
              <stop offset="50%" stopColor="#6E38FF" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#4314DE" stopOpacity="0" />
            </linearGradient>

            {/* Warm Sunset Shoulder Rim Glow */}
            <linearGradient
              id="cyber-warm-glow"
              x1="50"
              y1="70"
              x2="92"
              y2="92"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#FFA62B" stopOpacity="0.38" />
              <stop offset="50%" stopColor="#F52D85" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#5420F5" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Speech Bubble Mascot Silhouette with bottom-left tail */}
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
            fill="url(#cyber-mascot-grad)"
          />

          {/* Warm Sunset Rim Glow on curve */}
          <path
            d="M 54 85
               C 76 85 92 68.5 92 47
               C 92 62 78 82 54 85 Z"
            fill="url(#cyber-warm-glow)"
          />

          {/* 3D Specular Highlight Reflection */}
          <path
            d="M 52 11.5
               C 71 11.5 87 25 89 42
               C 83 28 68 15.5 50 15.5
               C 31.5 15.5 18.5 27 14 42
               C 14.5 25 31.5 11.5 52 11.5 Z"
            fill="url(#cyber-light-dome)"
          />

          {/* Left Solid White Pill Eye */}
          <motion.rect
            x="32"
            y="27"
            width="16"
            height="32"
            rx="8"
            fill="#FFFFFF"
            animate={
              isBlinking
                ? { scaleY: 0.1 }
                : isWinking
                ? { scaleY: 0.15 }
                : { scaleY: [1, 1, 0.94, 1] }
            }
            transition={{ duration: 0.12 }}
            style={{ originX: '40px', originY: '43px' }}
          />

          {/* Right Solid White Pill Eye */}
          <motion.rect
            x="54"
            y="23"
            width="16"
            height="32"
            rx="8"
            fill="#FFFFFF"
            animate={
              isBlinking
                ? { scaleY: 0.1 }
                : { scaleY: [1, 1, 0.94, 1] }
            }
            transition={{ duration: 0.12 }}
            style={{ originX: '62px', originY: '39px' }}
          />
        </svg>

        {/* Orbiting Sparkle Satellite */}
        {showParticles && (
          <motion.span
            animate={{
              y: [-4, 4, -4],
              rotate: [0, 180, 360],
              scale: [0.9, 1.25, 0.9],
            }}
            transition={{
              repeat: Infinity,
              duration: 3.2,
              ease: 'easeInOut',
            }}
            className="absolute -top-1 -right-1 text-sm pointer-events-none drop-shadow-md select-none"
          >
            ✨
          </motion.span>
        )}

        {/* Interactive Tap Heart Burst */}
        <AnimatePresence>
          {showHeartBurst && (
            <motion.span
              initial={{ scale: 0, opacity: 1, y: 0 }}
              animate={{ scale: 1.4, opacity: 0, y: -28 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute -top-3 left-1/2 -translate-x-1/2 text-base pointer-events-none select-none z-30"
            >
              💜
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
