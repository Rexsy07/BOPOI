import React from 'react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { VerifiedCreatorBadgeIcon } from '../brand/icons/actions/VerifiedCreatorBadgeIcon.tsx';

interface VerifiedCreatorBadgeProps {
  /** Explicit verified state from post/profile payload (used as fallback if user not in directory) */
  isVerified?: boolean;
  /** Username to resolve live verification status from admin-updated directory */
  username?: string;
  /** Hide completely for anonymous personas */
  isAnonymous?: boolean;
  /** Icon size in px (default 15) */
  size?: number;
  /** Optional inline label next to badge */
  showLabel?: boolean;
  className?: string;
}

/**
 * Displays the custom Bopoi Verification Badge exclusively for creators/users
 * verified by platform admins. Resolves live status from directory state so
 * grant/revoke changes appear instantaneously across feeds, profiles, comments, and search.
 */
export const VerifiedCreatorBadge: React.FC<VerifiedCreatorBadgeProps> = ({
  isVerified,
  username,
  isAnonymous = false,
  size = 15,
  showLabel = false,
  className = '',
}) => {
  const { accounts, creators, user } = useBopoi();

  if (isAnonymous) return null;

  const cleanUsername = (username || '').replace(/^@/, '').trim().toLowerCase();
  let resolved = Boolean(isVerified);

  if (cleanUsername) {
    if (user?.username && user.username.toLowerCase() === cleanUsername) {
      resolved = Boolean(user.isVerified || user.isCreator);
    } else {
      const matchedAccount = accounts.find(
        (a) => a.username && a.username.toLowerCase() === cleanUsername
      );
      if (matchedAccount) {
        resolved = Boolean(matchedAccount.isVerified || matchedAccount.isCreator);
      } else {
        const matchedCreator = creators.find(
          (c) => c.username && c.username.toLowerCase() === cleanUsername
        );
        if (matchedCreator) {
          resolved = Boolean(matchedCreator.isVerified);
        }
      }
    }
  }

  if (!resolved) return null;

  return (
    <span
      title="Verified Creator on Bopoi"
      aria-label="Verified Creator"
      className={`inline-flex items-center gap-1 shrink-0 align-middle ${className}`}
    >
      <VerifiedCreatorBadgeIcon size={size} />
      {showLabel && (
        <span className="text-[10px] font-extrabold text-[#5420F5] tracking-tight">
          Verified
        </span>
      )}
    </span>
  );
};
