import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReadStatusBadgeProps {
  isRead: boolean;
  readAt?: string;
  recipientName?: string;
  size?: 'sm' | 'md';
  variant?: 'badge' | 'minimal';
  className?: string;
}

export const ReadStatusBadge: React.FC<ReadStatusBadgeProps> = ({
  isRead,
  readAt,
  recipientName,
  size = 'sm',
  variant = 'badge',
  className = '',
}) => {
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  if (variant === 'minimal') {
    return (
      <div
        className={`inline-flex items-center gap-1 font-semibold select-none ${className} ${
          isRead ? 'text-[#5420F5]' : 'text-slate-400'
        }`}
        title={
          isRead
            ? `Opened by ${recipientName || 'recipient'}${readAt ? ` (${readAt})` : ''}`
            : `Delivered to ${recipientName || 'recipient'} · Not yet opened`
        }
      >
        {isRead ? (
          <CheckCheck className={`${iconSize} text-[#5420F5] shrink-0 stroke-[2.5]`} />
        ) : (
          <Check className={`${iconSize} text-slate-400 shrink-0 stroke-[2]`} />
        )}
        <span className={textSize}>{isRead ? 'Read' : 'Sent'}</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 20 }}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all select-none ${textSize} ${
        isRead
          ? 'bg-[#F0EBFF] text-[#5420F5] border-[#5420F5]/25 font-bold shadow-2xs'
          : 'bg-slate-100/90 text-slate-500 border-slate-200 font-medium'
      } ${className}`}
      title={
        isRead
          ? `Opened by ${recipientName || 'recipient'}${readAt ? ` (${readAt})` : ''}`
          : `Delivered to ${recipientName || 'recipient'} · Waiting to be opened`
      }
    >
      {isRead ? (
        <CheckCheck className={`${iconSize} text-[#5420F5] shrink-0 stroke-[2.5]`} />
      ) : (
        <Check className={`${iconSize} text-slate-400 shrink-0 stroke-[2]`} />
      )}
      <span>{isRead ? 'Read' : 'Sent · Unopened'}</span>
    </motion.div>
  );
};
