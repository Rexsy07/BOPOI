import React, { useId } from 'react';
import {
  CharacterConfig,
  AURA_OPTIONS,
  SKIN_OPTIONS,
  HAIR_COLOR_OPTIONS,
  OUTFIT_OPTIONS,
  CHARACTER_MOODS,
  parseCharacterConfig,
} from './characterCatalog.ts';

export interface CampusCharacterAvatarProps {
  config?: CharacterConfig;
  value?: string | null;
  seed?: string;
  mood?: string;
  showMoodBadge?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  className?: string;
  rounded?: 'full' | '2xl' | '3xl' | 'xl';
  showRing?: boolean;
  onClick?: () => void;
  title?: string;
}

export const CampusCharacterAvatar: React.FC<CampusCharacterAvatarProps> = ({
  config,
  value,
  seed,
  mood,
  showMoodBadge = false,
  size = 'md',
  className = '',
  rounded = 'full',
  showRing = false,
  onClick,
  title,
}) => {
  const reactId = useId().replace(/:/g, '');
  const baseConfig = config || parseCharacterConfig(value, seed);
  const matchedMood = mood
    ? CHARACTER_MOODS.find((m) => m.id === mood || m.eyesId === mood)
    : undefined;
  const resolvedConfig: CharacterConfig = matchedMood
    ? { ...baseConfig, eyesId: matchedMood.eyesId, moodId: matchedMood.id }
    : baseConfig;
  const activeMoodObj =
    matchedMood ||
    CHARACTER_MOODS.find(
      (m) => m.id === (resolvedConfig.moodId || resolvedConfig.eyesId)
    );

  const getDimension = (): number => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'xs':
        return 24;
      case 'sm':
        return 32;
      case 'md':
        return 40;
      case 'lg':
        return 56;
      case 'xl':
        return 80;
      case '2xl':
        return 112;
      default:
        return 40;
    }
  };

  const dim = getDimension();

  const roundedClass =
    rounded === 'full'
      ? 'rounded-full'
      : rounded === '3xl'
      ? 'rounded-3xl'
      : rounded === '2xl'
      ? 'rounded-2xl'
      : 'rounded-xl';

  const aura =
    AURA_OPTIONS.find((a) => a.id === resolvedConfig.auraId) || AURA_OPTIONS[0];
  const skin =
    SKIN_OPTIONS.find((s) => s.id === resolvedConfig.skinId) || SKIN_OPTIONS[2];
  const hairColor =
    HAIR_COLOR_OPTIONS.find((c) => c.id === resolvedConfig.hairColorId) ||
    HAIR_COLOR_OPTIONS[0];
  const outfit =
    OUTFIT_OPTIONS.find((o) => o.id === resolvedConfig.outfitId) ||
    OUTFIT_OPTIONS[0];

  const p = `char_${reactId}`;

  return (
    <div
      onClick={onClick}
      title={title}
      style={{ width: dim, height: dim }}
      className={`relative inline-flex items-center justify-center overflow-hidden select-none shrink-0 ${roundedClass} ${
        showRing ? 'ring-2 ring-white shadow-md' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full block"
      >
        <defs>
          {/* Studio Aura Backdrop Gradient */}
          <linearGradient id={`${p}_aura`} x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={aura.stops[0]} />
            <stop offset="55%" stopColor={aura.stops[1]} />
            <stop offset="100%" stopColor={aura.stops[2]} />
          </linearGradient>

          <radialGradient id={`${p}_aura_glow`} cx="60" cy="42" r="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={aura.glowColor} stopOpacity="0.55" />
            <stop offset="65%" stopColor={aura.stops[1]} stopOpacity="0.1" />
            <stop offset="100%" stopColor={aura.stops[2]} stopOpacity="0" />
          </radialGradient>

          {/* 3D Sculpted Skin Gradient */}
          <radialGradient id={`${p}_skin`} cx="52" cy="46" r="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={skin.highlight} />
            <stop offset="58%" stopColor={skin.base} />
            <stop offset="92%" stopColor={skin.shadow} />
            <stop offset="100%" stopColor={skin.deepShadow} />
          </radialGradient>

          {/* Neck Shadow Gradient */}
          <linearGradient id={`${p}_neck`} x1="60" y1="74" x2="60" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={skin.deepShadow} />
            <stop offset="45%" stopColor={skin.shadow} />
            <stop offset="100%" stopColor={skin.base} />
          </linearGradient>

          {/* 3D Hair / Headgear Gradient */}
          <linearGradient id={`${p}_hair`} x1="35" y1="12" x2="85" y2="75" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={hairColor.highlight} />
            <stop offset="50%" stopColor={hairColor.base} />
            <stop offset="100%" stopColor={hairColor.shadow} />
          </linearGradient>

          {/* 3D Campus Outfit Gradient */}
          <linearGradient id={`${p}_outfit`} x1="25" y1="84" x2="95" y2="125" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={outfit.primary} />
            <stop offset="100%" stopColor={outfit.secondary} />
          </linearGradient>

          {/* Cyber Visor / Lens Gradient */}
          <linearGradient id={`${p}_visor`} x1="32" y1="46" x2="88" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00F5D4" />
            <stop offset="50%" stopColor="#7B2CBF" />
            <stop offset="100%" stopColor="#FF007F" />
          </linearGradient>

          <clipPath id={`${p}_clip`}>
            <rect width="120" height="120" rx="0" />
          </clipPath>
        </defs>

        <g clipPath={`url(#${p}_clip)`}>
          {/* 1. AURA STUDIO BACKDROP */}
          <rect width="120" height="120" fill={`url(#${p}_aura)`} />
          <circle cx="60" cy="46" r="52" fill={`url(#${p}_aura_glow)`} />
          {/* Subtle 3D Studio Rim Halo */}
          <circle
            cx="60"
            cy="52"
            r="44"
            stroke="#FFFFFF"
            strokeOpacity="0.14"
            strokeWidth="1.5"
          />

          {/* BACK HAIR LAYERS (for Afro Puffs, Braids, Curly Fro, Bob, Hoodie Back) */}
          {resolvedConfig.hairId === 'afro-puffs' && (
            <g>
              <circle cx="26" cy="36" r="18" fill={`url(#${p}_hair)`} />
              <circle cx="94" cy="36" r="18" fill={`url(#${p}_hair)`} />
              <circle cx="22" cy="31" r="6" fill={hairColor.highlight} opacity="0.35" />
              <circle cx="90" cy="31" r="6" fill={hairColor.highlight} opacity="0.35" />
            </g>
          )}

          {resolvedConfig.hairId === 'curly-fro' && (
            <g>
              <circle cx="60" cy="40" r="34" fill={`url(#${p}_hair)`} />
              <circle cx="34" cy="34" r="15" fill={`url(#${p}_hair)`} />
              <circle cx="86" cy="34" r="15" fill={`url(#${p}_hair)`} />
              <circle cx="46" cy="20" r="15" fill={`url(#${p}_hair)`} />
              <circle cx="74" cy="20" r="15" fill={`url(#${p}_hair)`} />
            </g>
          )}

          {resolvedConfig.hairId === 'sleek-bob' && (
            <path
              d="M27 46 C25 22 42 15 60 15 C78 15 95 22 93 46 C93 66 89 82 81 86 L39 86 C31 82 27 66 27 46 Z"
              fill={`url(#${p}_hair)`}
            />
          )}

          {resolvedConfig.hairId === 'braids-twists' && (
            <g fill={`url(#${p}_hair)`}>
              <rect x="26" y="42" width="8" height="44" rx="4" />
              <rect x="33" y="46" width="7" height="44" rx="3.5" />
              <rect x="80" y="46" width="7" height="44" rx="3.5" />
              <rect x="86" y="42" width="8" height="44" rx="4" />
              {/* Gold hair cuffs/beads */}
              <rect x="26" y="76" width="8" height="3.5" rx="1.5" fill="#FBBF24" />
              <rect x="86" y="76" width="8" height="3.5" rx="1.5" fill="#FBBF24" />
              <rect x="33" y="81" width="7" height="3" rx="1.5" fill="#F59E0B" />
              <rect x="80" y="81" width="7" height="3" rx="1.5" fill="#F59E0B" />
            </g>
          )}

          {resolvedConfig.hairId === 'cyber-hood' && (
            <path
              d="M18 96 C16 54 26 14 60 14 C94 14 104 54 102 96 Z"
              fill={outfit.secondary}
              stroke={outfit.accent}
              strokeWidth="2"
            />
          )}

          {/* 2. SCULPTED SHOULDERS, NECK & CAMPUS OUTFIT */}
          {/* Neck */}
          <rect x="49" y="75" width="22" height="22" rx="9" fill={`url(#${p}_neck)`} />
          {/* Chin cast shadow on neck */}
          <path
            d="M49 78 Q60 88 71 78 L71 85 Q60 93 49 85 Z"
            fill={skin.deepShadow}
            opacity="0.55"
          />

          {/* Shoulders & Torso Base */}
          <path
            d="M16 122 C18 96 35 88 60 88 C85 88 102 96 104 122 Z"
            fill={`url(#${p}_outfit)`}
          />

          {/* Outfit Style Details */}
          {outfit.style === 'hoodie' && (
            <g>
              {/* Hoodie Collar Cushions */}
              <path
                d="M36 90 C36 82 46 82 50 93 L60 104 L70 93 C74 82 84 82 84 90 C84 101 72 109 60 109 C48 109 36 101 36 90 Z"
                fill={outfit.primary}
                stroke="#FFFFFF"
                strokeOpacity="0.18"
                strokeWidth="1.2"
              />
              {/* Inner Tee */}
              <path d="M49 91 Q60 101 71 91 L60 105 Z" fill="#FFFFFF" opacity="0.92" />
              {/* Drawstrings */}
              <path
                d="M52 99 L51 115 M68 99 L69 115"
                stroke={outfit.accent}
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <circle cx="51" cy="115" r="2.2" fill="#FFFFFF" />
              <circle cx="69" cy="115" r="2.2" fill="#FFFFFF" />
            </g>
          )}

          {outfit.style === 'varsity' && (
            <g>
              {/* White Sleeves */}
              <path d="M16 122 C17 102 26 93 36 90 L42 122 Z" fill={outfit.secondary} />
              <path d="M104 122 C103 102 94 93 84 90 L78 122 Z" fill={outfit.secondary} />
              {/* Striped Ribbed Varsity Collar */}
              <path
                d="M44 88 Q60 102 76 88 L72 95 Q60 108 48 95 Z"
                fill={outfit.accent}
              />
              <line x1="60" y1="100" x2="60" y2="122" stroke={outfit.secondary} strokeWidth="2" />
              <circle cx="55" cy="107" r="1.8" fill={outfit.secondary} />
              <circle cx="55" cy="115" r="1.8" fill={outfit.secondary} />
            </g>
          )}

          {outfit.style === 'crewneck' && (
            <g>
              {/* Ribbed Crewneck Collar + Silver Chain */}
              <path
                d="M45 88 Q60 99 75 88 L78 93 Q60 105 42 93 Z"
                fill={outfit.accent}
              />
              <path
                d="M46 93 Q60 107 74 93"
                stroke="#F8FAFC"
                strokeWidth="2"
                strokeDasharray="3 2"
                fill="none"
              />
            </g>
          )}

          {outfit.style === 'techwear' && (
            <g>
              {/* High Techwear Collar & Neon Seam */}
              <path
                d="M41 84 L48 122 L72 122 L79 84 Q60 94 41 84 Z"
                fill={outfit.secondary}
                stroke={outfit.accent}
                strokeWidth="1.5"
              />
              <line x1="60" y1="90" x2="60" y2="122" stroke={outfit.accent} strokeWidth="2" />
            </g>
          )}

          {/* 3. SCULPTED 3D HEAD & EARS */}
          {/* Ears */}
          <ellipse cx="32" cy="56" rx="6.5" ry="9.5" fill={skin.shadow} />
          <ellipse cx="32.5" cy="56" rx="3.5" ry="5.5" fill={skin.deepShadow} opacity="0.45" />
          <ellipse cx="88" cy="56" rx="6.5" ry="9.5" fill={skin.shadow} />
          <ellipse cx="87.5" cy="56" rx="3.5" ry="5.5" fill={skin.deepShadow} opacity="0.45" />
          {/* Subtle Stud Earring */}
          <circle cx="30.5" cy="63" r="1.8" fill="#FDE047" />
          <circle cx="89.5" cy="63" r="1.8" fill="#FDE047" />

          {/* Main 3D Head Shape */}
          <path
            d="M33 48 C33 28 44 21 60 21 C76 21 87 28 87 48 C87 68 75 83 60 83 C45 83 33 68 33 48 Z"
            fill={`url(#${p}_skin)`}
          />

          {/* 3D Forehead & Cheek Specular Light Reflection */}
          <ellipse
            cx="50"
            cy="35"
            rx="14"
            ry="7"
            transform="rotate(-12 50 35)"
            fill="#FFFFFF"
            opacity="0.14"
          />

          {/* Warm Cheek Blush */}
          <ellipse cx="42" cy="61" rx="6.5" ry="3.6" fill={skin.blush} opacity="0.38" />
          <ellipse cx="78" cy="61" rx="6.5" ry="3.6" fill={skin.blush} opacity="0.38" />

          {/* 3D Sculpted Nose */}
          <path
            d="M59 49 L57.5 58.5 C57.5 60.5 62.5 60.5 63 58.5"
            stroke={skin.deepShadow}
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.55"
          />
          <circle cx="59.5" cy="57.5" r="1.6" fill="#FFFFFF" opacity="0.22" />

          {/* 4. EYES, EYEBROWS & FACIAL EXPRESSIONS */}
          {/* Eyebrows */}
          <path
            d={
              resolvedConfig.eyesId === 'cool-smirk'
                ? 'M39 43 Q46 40 52 43 M68 41 Q74 37 81 41'
                : 'M39 42.5 Q46 39 52 42 M68 42 Q74 39 81 42.5'
            }
            stroke={hairColor.shadow}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />

          {/* Eyes */}
          {resolvedConfig.eyesId === 'winking-vibe' ? (
            <g>
              {/* Left Eye Open with 3D Catchlight */}
              <ellipse cx="46" cy="51" rx="5.2" ry="5.6" fill="#FFFFFF" />
              <circle cx="46.5" cy="51" r="3.4" fill="#1E152A" />
              <circle cx="45" cy="49.5" r="1.4" fill="#FFFFFF" />
              {/* Right Eye Playful Wink */}
              <path
                d="M68 51.5 Q74 46.5 80 51.5"
                stroke="#1E152A"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          ) : resolvedConfig.eyesId === 'starstruck' ? (
            <g>
              <ellipse cx="46" cy="51" rx="5.5" ry="5.8" fill="#1E152A" />
              <ellipse cx="74" cy="51" rx="5.5" ry="5.8" fill="#1E152A" />
              {/* Golden Star Pupils */}
              <path
                d="M46 46.5 L47.3 49.5 L50.5 49.8 L48 51.9 L48.8 55 L46 53.3 L43.2 55 L44 51.9 L41.5 49.8 L44.7 49.5 Z"
                fill="#FDE047"
              />
              <path
                d="M74 46.5 L75.3 49.5 L78.5 49.8 L76 51.9 L76.8 55 L74 53.3 L71.2 55 L72 51.9 L69.5 49.8 L72.7 49.5 Z"
                fill="#FDE047"
              />
            </g>
          ) : resolvedConfig.eyesId === 'laughing-joy' ? (
            <g>
              <path
                d="M40 52 Q46 46 52 52 M68 52 Q74 46 80 52"
                stroke="#1E152A"
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          ) : (
            <g>
              {/* Crisp 3D Eyes with Dual Catchlights */}
              <ellipse cx="46" cy="51" rx="5.4" ry="5.6" fill="#FFFFFF" />
              <circle cx="46.5" cy="51.2" r="3.5" fill="#1A1225" />
              <circle cx="45" cy="49.5" r="1.4" fill="#FFFFFF" />
              <circle cx="48" cy="52.6" r="0.7" fill="#FFFFFF" />

              <ellipse cx="74" cy="51" rx="5.4" ry="5.6" fill="#FFFFFF" />
              <circle cx="73.5" cy="51.2" r="3.5" fill="#1A1225" />
              <circle cx="72" cy="49.5" r="1.4" fill="#FFFFFF" />
              <circle cx="75" cy="52.6" r="0.7" fill="#FFFFFF" />
            </g>
          )}

          {/* Mouth / Expression */}
          {resolvedConfig.eyesId === 'chill-grin' ||
          resolvedConfig.eyesId === 'laughing-joy' ||
          resolvedConfig.eyesId === 'starstruck' ? (
            <g>
              <path
                d="M49 65 Q60 75 71 65 Z"
                fill="#4A1525"
              />
              <path
                d="M50.5 65.5 Q60 69 69.5 65.5 L68.5 68.5 Q60 70.5 51.5 68.5 Z"
                fill="#FFFFFF"
              />
              <path
                d="M54 70.5 Q60 74 66 70.5 Q60 68.5 54 70.5 Z"
                fill="#FF758F"
              />
            </g>
          ) : resolvedConfig.eyesId === 'tongue-out' ? (
            <g>
              <path
                d="M50 66 Q60 73 70 66"
                stroke="#26110A"
                strokeWidth="2.8"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M56 68.5 L56 73 C56 76 64 76 64 73 L64 68.5 Z"
                fill="#FF5D8F"
              />
              <line x1="60" y1="69" x2="60" y2="73.5" stroke="#E03168" strokeWidth="1.2" />
            </g>
          ) : resolvedConfig.eyesId === 'cool-smirk' ? (
            <path
              d="M51 67.5 Q62 69 70 63.5"
              stroke="#26110A"
              strokeWidth="2.8"
              strokeLinecap="round"
              fill="none"
            />
          ) : resolvedConfig.eyesId === 'focused-scholar' ? (
            <path
              d="M53 67.5 Q60 69.5 67 67.5"
              stroke="#26110A"
              strokeWidth="2.6"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            /* Confident Smile / Winking Vibe */
            <g>
              <path
                d="M50 65.5 Q60 73.5 70 65.5"
                stroke="#26110A"
                strokeWidth="2.8"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M53 66.5 Q60 71 67 66.5"
                stroke="#FFFFFF"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
                opacity="0.9"
              />
            </g>
          )}

          {/* 5. FRONT HAIRSTYLES & HEADGEAR */}
          {resolvedConfig.hairId === 'taper-fade' && (
            <g>
              <path
                d="M33 44 C33 24 44 17 60 17 C76 17 87 24 87 44 C85 35 76 31 60 31 C44 31 35 35 33 44 Z"
                fill={`url(#${p}_hair)`}
              />
              {/* 3D Wave Line Texture + Sharp Hairline Cut */}
              <path
                d="M42 25 Q60 21 78 25 M39 30 Q60 26 81 30"
                stroke={hairColor.highlight}
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.45"
              />
            </g>
          )}

          {resolvedConfig.hairId === 'high-locs' && (
            <g>
              {/* Undercut base */}
              <path
                d="M35 38 C36 22 45 18 60 18 C75 18 84 22 85 38 C80 32 70 30 60 30 C50 30 40 32 35 38 Z"
                fill={`url(#${p}_hair)`}
              />
              {/* Sculpted High-Top Loc Pillars */}
              <rect x="38" y="10" width="8" height="24" rx="4" transform="rotate(-12 38 10)" fill={`url(#${p}_hair)`} />
              <rect x="46" y="7" width="8.5" height="25" rx="4" transform="rotate(-5 46 7)" fill={`url(#${p}_hair)`} />
              <rect x="56" y="6" width="8.5" height="26" rx="4" fill={`url(#${p}_hair)`} />
              <rect x="65" y="7" width="8.5" height="25" rx="4" transform="rotate(5 65 7)" fill={`url(#${p}_hair)`} />
              <rect x="73" y="10" width="8" height="24" rx="4" transform="rotate(12 73 10)" fill={`url(#${p}_hair)`} />
              {/* Gold Loc Cuffs */}
              <rect x="46.5" y="14" width="8" height="2.8" rx="1" fill="#FBBF24" />
              <rect x="65.5" y="16" width="8" height="2.8" rx="1" fill="#FBBF24" />
            </g>
          )}

          {(resolvedConfig.hairId === 'afro-puffs' ||
            resolvedConfig.hairId === 'braids-twists' ||
            resolvedConfig.hairId === 'sleek-bob') && (
            <g>
              <path
                d="M33 44 C33 23 45 17 60 17 C75 17 87 23 87 44 C82 32 71 29 60 33 C49 29 38 32 33 44 Z"
                fill={`url(#${p}_hair)`}
              />
              {/* Baby Hairs / Edges Detail */}
              <path
                d="M36 38 Q42 42 45 36 M84 38 Q78 42 75 36"
                stroke={hairColor.shadow}
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          )}

          {resolvedConfig.hairId === 'curly-fro' && (
            <path
              d="M32 42 C32 23 45 16 60 16 C75 16 88 23 88 42 C82 32 72 30 60 31 C48 30 38 32 32 42 Z"
              fill={`url(#${p}_hair)`}
            />
          )}

          {resolvedConfig.hairId === 'varsity-cap' && (
            <g>
              {/* Cap Dome */}
              <path
                d="M31 40 C31 19 44 13 60 13 C76 13 89 19 89 40 Z"
                fill={outfit.primary}
              />
              {/* Cap Front Panel Seam & Emblem */}
              <path
                d="M46 15 C52 13 68 13 74 15 L76 38 L44 38 Z"
                fill="#FFFFFF"
                opacity="0.14"
              />
              <circle cx="60" cy="26" r="5" fill={outfit.accent} />
              {/* Backward / Flat Snapback Brim */}
              <path
                d="M27 36 C42 32 78 32 95 37 C97 41 92 43 87 42 C72 38 46 38 31 41 C27 42 25 38 27 36 Z"
                fill={outfit.secondary}
              />
            </g>
          )}

          {resolvedConfig.hairId === 'studio-headphones' && (
            <g>
              {/* Low Fade Hair Top */}
              <path
                d="M34 42 C34 24 45 18 60 18 C75 18 86 24 86 42 C83 34 74 31 60 31 C46 31 37 34 34 42 Z"
                fill={`url(#${p}_hair)`}
              />
              {/* 3D Over-Ear Studio Headphone Arch */}
              <path
                d="M25 54 C23 23 39 11 60 11 C81 11 97 23 95 54"
                stroke="#F8FAFC"
                strokeWidth="5.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M44 12.5 Q60 9.5 76 12.5"
                stroke={outfit.accent}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
              {/* Left & Right Sculpted Ear Cups */}
              <rect x="19" y="43" width="11" height="22" rx="5.5" fill="#1E1B2E" stroke="#F8FAFC" strokeWidth="2" />
              <circle cx="24.5" cy="54" r="2.5" fill={outfit.accent} />
              <rect x="90" y="43" width="11" height="22" rx="5.5" fill="#1E1B2E" stroke="#F8FAFC" strokeWidth="2" />
              <circle cx="95.5" cy="54" r="2.5" fill={outfit.accent} />
            </g>
          )}

          {resolvedConfig.hairId === 'street-beanie' && (
            <g>
              <path
                d="M32 39 C32 18 44 12 60 12 C76 12 88 18 88 39 Z"
                fill={`url(#${p}_hair)`}
              />
              {/* Ribbed Folded Beanie Cuff */}
              <rect x="29" y="29" width="62" height="13" rx="6.5" fill={hairColor.highlight} />
              <path
                d="M38 30 L38 41 M48 30 L48 41 M58 30 L58 41 M68 30 L68 41 M78 30 L78 41"
                stroke={hairColor.shadow}
                strokeWidth="1.5"
                opacity="0.4"
              />
              {/* Mini Streetwear Woven Tag */}
              <rect x="69" y="33" width="10" height="5" rx="1.5" fill="#FFFFFF" />
              <circle cx="74" cy="35.5" r="1.4" fill="#5420F5" />
            </g>
          )}

          {resolvedConfig.hairId === 'royal-crown' && (
            <g>
              {/* Clean Taper Under Crown */}
              <path
                d="M33 43 C33 25 45 19 60 19 C75 19 87 25 87 43 C84 34 74 31 60 31 C46 31 36 34 33 43 Z"
                fill={`url(#${p}_hair)`}
              />
              {/* Sculpted 3D Golden Crown */}
              <path
                d="M35 33 L39 14 L50 24 L60 10 L70 24 L81 14 L85 33 Z"
                fill="#FBBF24"
                stroke="#FEF08A"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <rect x="35" y="30" width="50" height="5" rx="2.5" fill="#D97706" />
              <circle cx="60" cy="24" r="2.8" fill="#5420F5" />
              <circle cx="45" cy="26" r="2" fill="#F43F5E" />
              <circle cx="75" cy="26" r="2" fill="#10B981" />
            </g>
          )}

          {resolvedConfig.hairId === 'bucket-hat' && (
            <g>
              {/* Bucket Hat Crown */}
              <path
                d="M36 34 L41 15 C46 12 74 12 79 15 L84 34 Z"
                fill={`url(#${p}_hair)`}
              />
              {/* Bucket Hat Stripe */}
              <path d="M37 28 L83 28 L84 32 L36 32 Z" fill={outfit.accent} />
              {/* Wide Sloped Bucket Hat Brim */}
              <path
                d="M22 39 C35 29 85 29 98 39 C99 43 92 45 86 43 C70 37 50 37 34 43 C28 45 21 43 22 39 Z"
                fill={hairColor.base}
                stroke={hairColor.highlight}
                strokeWidth="1.2"
              />
            </g>
          )}

          {resolvedConfig.hairId === 'cyber-hood' && (
            <path
              d="M33 42 C33 25 45 19 60 19 C75 19 87 25 87 42 C84 34 74 31 60 31 C46 31 36 34 33 42 Z"
              fill={`url(#${p}_hair)`}
            />
          )}

          {/* 6. EYEWEAR LAYER (SHADES, VISORS, FRAMES) */}
          {resolvedConfig.eyewearId === 'wayfarer-shades' && (
            <g>
              <rect x="34" y="44" width="23" height="14" rx="4" fill="#111827" stroke="#374151" strokeWidth="2" />
              <rect x="63" y="44" width="23" height="14" rx="4" fill="#111827" stroke="#374151" strokeWidth="2" />
              <path d="M57 48 L63 48" stroke="#374151" strokeWidth="2.8" />
              <path d="M38 46 L45 55" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
              <path d="M67 46 L74 55" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
            </g>
          )}

          {resolvedConfig.eyewearId === 'cyber-visor' && (
            <g>
              <path
                d="M32 44 C46 41 74 41 88 44 L86 57 C74 59 64 54 60 54 C56 54 46 59 34 57 Z"
                fill={`url(#${p}_visor)`}
                fillOpacity="0.88"
                stroke="#FFFFFF"
                strokeWidth="1.8"
              />
              <path
                d="M38 46 L82 46"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.65"
              />
            </g>
          )}

          {resolvedConfig.eyewearId === 'scholar-frames' && (
            <g>
              <circle cx="46" cy="51" r="10" fill="#FFFFFF" fillOpacity="0.12" stroke="#1E1B2E" strokeWidth="2.4" />
              <circle cx="74" cy="51" r="10" fill="#FFFFFF" fillOpacity="0.12" stroke="#1E1B2E" strokeWidth="2.4" />
              <path d="M56 50 Q60 48 64 50" stroke="#1E1B2E" strokeWidth="2.2" fill="none" />
              <path d="M40 46 L45 51" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
              <path d="M68 46 L73 51" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
            </g>
          )}

          {resolvedConfig.eyewearId === 'gold-aviators' && (
            <g>
              <path
                d="M35 46 L56 46 C57 54 52 59 45 59 C38 59 34 54 35 46 Z"
                fill="#0F172A"
                fillOpacity="0.55"
                stroke="#FBBF24"
                strokeWidth="2"
              />
              <path
                d="M64 46 L85 46 C86 54 82 59 75 59 C68 59 63 54 64 46 Z"
                fill="#0F172A"
                fillOpacity="0.55"
                stroke="#FBBF24"
                strokeWidth="2"
              />
              <line x1="55" y1="46" x2="65" y2="46" stroke="#FBBF24" strokeWidth="2" />
              <line x1="56" y1="49" x2="64" y2="49" stroke="#FBBF24" strokeWidth="1.4" />
            </g>
          )}

          {resolvedConfig.eyewearId === 'clout-goggles' && (
            <g>
              <ellipse cx="45.5" cy="51" rx="12" ry="8.5" fill="#111827" stroke="#FFFFFF" strokeWidth="3.8" />
              <ellipse cx="74.5" cy="51" rx="12" ry="8.5" fill="#111827" stroke="#FFFFFF" strokeWidth="3.8" />
              <line x1="57" y1="50" x2="63" y2="50" stroke="#FFFFFF" strokeWidth="4" />
              <path d="M41 47 L46 53" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
              <path d="M70 47 L75 53" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
            </g>
          )}

          {resolvedConfig.eyewearId === 'rose-tint' && (
            <g>
              <rect
                x="35"
                y="44"
                width="22"
                height="13.5"
                rx="5"
                fill="#F43F5E"
                fillOpacity="0.45"
                stroke="#FDA4AF"
                strokeWidth="2"
              />
              <rect
                x="63"
                y="44"
                width="22"
                height="13.5"
                rx="5"
                fill="#F43F5E"
                fillOpacity="0.45"
                stroke="#FDA4AF"
                strokeWidth="2"
              />
              <line x1="57" y1="49" x2="63" y2="49" stroke="#FDA4AF" strokeWidth="2.2" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};

/**
 * Generates an inline SVG data URI for HTML5 Canvas drawing (used in ShareCardCanvas 1080x1350 PNG export)
 */
export function getCharacterSvgDataUri(
  valueOrConfig?: string | CharacterConfig | null,
  fallbackSeed?: string
): string {
  const cfg =
    typeof valueOrConfig === 'object' && valueOrConfig !== null
      ? valueOrConfig
      : parseCharacterConfig(valueOrConfig, fallbackSeed);

  const aura = AURA_OPTIONS.find((a) => a.id === cfg.auraId) || AURA_OPTIONS[0];
  const skin = SKIN_OPTIONS.find((s) => s.id === cfg.skinId) || SKIN_OPTIONS[2];
  const hairColor =
    HAIR_COLOR_OPTIONS.find((c) => c.id === cfg.hairColorId) || HAIR_COLOR_OPTIONS[0];
  const outfit =
    OUTFIT_OPTIONS.find((o) => o.id === cfg.outfitId) || OUTFIT_OPTIONS[0];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 120 120" fill="none">
    <defs>
      <linearGradient id="c_aura" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${aura.stops[0]}" />
        <stop offset="55%" stop-color="${aura.stops[1]}" />
        <stop offset="100%" stop-color="${aura.stops[2]}" />
      </linearGradient>
      <radialGradient id="c_skin" cx="52" cy="46" r="42" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${skin.highlight}" />
        <stop offset="58%" stop-color="${skin.base}" />
        <stop offset="92%" stop-color="${skin.shadow}" />
        <stop offset="100%" stop-color="${skin.deepShadow}" />
      </radialGradient>
      <linearGradient id="c_hair" x1="35" y1="12" x2="85" y2="75" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${hairColor.highlight}" />
        <stop offset="50%" stop-color="${hairColor.base}" />
        <stop offset="100%" stop-color="${hairColor.shadow}" />
      </linearGradient>
      <linearGradient id="c_outfit" x1="25" y1="84" x2="95" y2="125" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${outfit.primary}" />
        <stop offset="100%" stop-color="${outfit.secondary}" />
      </linearGradient>
    </defs>
    <rect width="120" height="120" fill="url(#c_aura)" />
    <path d="M16 122 C18 96 35 88 60 88 C85 88 102 96 104 122 Z" fill="url(#c_outfit)" />
    <rect x="49" y="75" width="22" height="22" rx="9" fill="${skin.shadow}" />
    <ellipse cx="32" cy="56" rx="6.5" ry="9.5" fill="${skin.shadow}" />
    <ellipse cx="88" cy="56" rx="6.5" ry="9.5" fill="${skin.shadow}" />
    <path d="M33 48 C33 28 44 21 60 21 C76 21 87 28 87 48 C87 68 75 83 60 83 C45 83 33 68 33 48 Z" fill="url(#c_skin)" />
    <ellipse cx="46" cy="51" rx="5.2" ry="5.5" fill="#FFFFFF" />
    <circle cx="46.5" cy="51.2" r="3.4" fill="#1A1225" />
    <ellipse cx="74" cy="51" rx="5.2" ry="5.5" fill="#FFFFFF" />
    <circle cx="73.5" cy="51.2" r="3.4" fill="#1A1225" />
    <path d="M50 65.5 Q60 73.5 70 65.5" stroke="#26110A" stroke-width="2.8" stroke-linecap="round" fill="none" />
    <path d="M33 43 C33 23 45 17 60 17 C75 17 87 23 87 43 C83 33 72 30 60 31 C48 30 37 33 33 43 Z" fill="url(#c_hair)" />
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
