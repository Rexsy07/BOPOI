import React from 'react';
import { NightOwlIcon } from './NightOwlIcon.tsx';
import { PhantomChatterIcon } from './PhantomChatterIcon.tsx';
import { SecretConfessionIcon } from './SecretConfessionIcon.tsx';
import { PublicProfileIcon } from './PublicProfileIcon.tsx';
import { MaskedStudentIcon } from './MaskedStudentIcon.tsx';
import { SecretAdmirerIcon } from './SecretAdmirerIcon.tsx';
import { MidnightScholarIcon } from './MidnightScholarIcon.tsx';
import { HostelPhantomIcon } from './HostelPhantomIcon.tsx';
import { CampusRebelIcon } from './CampusRebelIcon.tsx';
import { NeonPantherIcon } from './NeonPantherIcon.tsx';

export interface PersonaMaskDefinition {
  id: string;
  name: string;
  tagline: string;
  legacyEmoji: string;
  iconComponent: React.FC<{ size?: number | string; className?: string }>;
}

export const ANONYMOUS_PERSONA_MASKS: PersonaMaskDefinition[] = [
  {
    id: 'masked-student',
    name: 'Masked Student',
    tagline: 'Anonymous Founder',
    legacyEmoji: '🎭',
    iconComponent: MaskedStudentIcon,
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    tagline: 'Late Night',
    legacyEmoji: '🦉',
    iconComponent: NightOwlIcon,
  },
  {
    id: 'secret-confession',
    name: 'Secret Confession',
    tagline: 'Silent Brain',
    legacyEmoji: '🤫',
    iconComponent: SecretConfessionIcon,
  },
  {
    id: 'midnight-scholar',
    name: 'Midnight Scholar',
    tagline: 'Deep Thinker',
    legacyEmoji: '🧠',
    iconComponent: MidnightScholarIcon,
  },
  {
    id: 'hostel-phantom',
    name: 'Hostel Phantom',
    tagline: 'Ghost Student',
    legacyEmoji: '👻',
    iconComponent: HostelPhantomIcon,
  },
  {
    id: 'campus-rebel',
    name: 'Campus Rebel',
    tagline: 'Hot Takes',
    legacyEmoji: '⚡',
    iconComponent: CampusRebelIcon,
  },
  {
    id: 'secret-admirer',
    name: 'Secret Admirer',
    tagline: 'Love & Match',
    legacyEmoji: '💘',
    iconComponent: SecretAdmirerIcon,
  },
  {
    id: 'phantom-chatter',
    name: 'Phantom Chatter',
    tagline: 'Incognito',
    legacyEmoji: '🕶️',
    iconComponent: PhantomChatterIcon,
  },
  {
    id: 'neon-panther',
    name: 'Neon Panther',
    tagline: 'Campus Insider',
    legacyEmoji: '🐾',
    iconComponent: NeonPantherIcon,
  },
  {
    id: 'public-profile',
    name: 'Public Profile',
    tagline: 'Fallback',
    legacyEmoji: '👤',
    iconComponent: PublicProfileIcon,
  },
];

interface PersonaMaskIconProps {
  mask?: string;
  size?: number | string;
  className?: string;
}

/**
 * Universal Persona Mask Icon Dispatcher
 * Resolves any persona name, emoji, or mask ID to its high-fidelity custom SVG
 */
export const PersonaMaskIcon: React.FC<PersonaMaskIconProps> = ({
  mask = 'masked-student',
  size = 32,
  className = '',
}) => {
  const normalized = String(mask || '').toLowerCase().trim();

  // Match Night Owl
  if (normalized.includes('owl') || normalized === '🦉' || normalized === 'night-owl') {
    return <NightOwlIcon size={size} className={className} />;
  }

  // Match Phantom Chatter (Sunglasses)
  if (normalized.includes('sunglasses') || normalized.includes('chatter') || normalized.includes('incognito') || normalized === '🕶️' || normalized === '🕶' || normalized === 'phantom-chatter') {
    return <PhantomChatterIcon size={size} className={className} />;
  }

  // Match Secret Confession / Silent Brain (Hooded Shushing)
  if (normalized.includes('confession') || normalized.includes('silent') || normalized.includes('shh') || normalized === '🤫' || normalized === 'secret-confession') {
    return <SecretConfessionIcon size={size} className={className} />;
  }

  // Match Midnight Scholar (Brain)
  if (normalized.includes('scholar') || normalized.includes('thinker') || normalized.includes('brain') || normalized === '🧠' || normalized === 'midnight-scholar') {
    return <MidnightScholarIcon size={size} className={className} />;
  }

  // Match Hostel Phantom / Ghost Student
  if (normalized.includes('ghost') || normalized.includes('phantom') || normalized === '👻' || normalized === 'hostel-phantom') {
    return <HostelPhantomIcon size={size} className={className} />;
  }

  // Match Campus Rebel (Lightning Bolt)
  if (normalized.includes('rebel') || normalized.includes('lightning') || normalized.includes('bolt') || normalized === '⚡' || normalized === 'campus-rebel') {
    return <CampusRebelIcon size={size} className={className} />;
  }

  // Match Secret Admirer (Heart & Arrow)
  if (normalized.includes('admirer') || normalized.includes('crush') || normalized.includes('match') || normalized === '💘' || normalized === '💖' || normalized === 'secret-admirer') {
    return <SecretAdmirerIcon size={size} className={className} />;
  }

  // Match Neon Panther (Paw Print)
  if (normalized.includes('panther') || normalized.includes('paw') || normalized === '🐾' || normalized === 'neon-panther') {
    return <NeonPantherIcon size={size} className={className} />;
  }

  // Match Public Profile (User Silhouette)
  if (normalized.includes('public') || normalized.includes('user') || normalized === '👤' || normalized === 'public-profile') {
    return <PublicProfileIcon size={size} className={className} />;
  }

  // Default / Founder: Masked Student (Purple Drama Mask)
  return <MaskedStudentIcon size={size} className={className} />;
};
