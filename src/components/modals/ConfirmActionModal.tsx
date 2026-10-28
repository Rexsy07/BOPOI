import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  Users2,
  UserMinus,
  LogOut,
  Unlock,
  CheckCircle2,
  Shield,
  ArrowRight,
  X,
} from 'lucide-react';
import { useBopoi, ConfirmDialogState } from '../../context/BopoiContext.tsx';
import {
  BopoiIcon,
  RoomBadgeIcon,
  CreateRoomIcon,
  CreateConfessionIcon,
  DeleteRemoveIcon,
  SparklePolishIcon,
  RealPeopleIcon,
  LaunchTrendingIcon,
} from '../brand/icons/index.ts';
import { PersonaMaskIcon } from '../brand/masks/PersonaMaskIcon.tsx';

const renderHeaderBrandIcon = (dialog: ConfirmDialogState) => {
  const iconType = dialog.icon || 'default';
  switch (iconType) {
    case 'delete':
      return <DeleteRemoveIcon size={28} />;
    case 'join':
      return <CreateRoomIcon size={30} />;
    case 'leave':
      return <LogOut className="w-5 h-5 text-amber-600" />;
    case 'follow':
      return <RealPeopleIcon size={28} />;
    case 'unfollow':
      return <UserMinus className="w-5 h-5 text-rose-600" />;
    case 'logout':
      return <LogOut className="w-5 h-5 text-rose-600" />;
    case 'lock':
    case 'shield':
      return <CreateConfessionIcon size={30} />;
    case 'unlock':
      return <Unlock className="w-5 h-5 text-emerald-600" />;
    case 'sparkle':
      return <SparklePolishIcon size={28} />;
    case 'verify':
      return <CheckCircle2 className="w-5 h-5 text-[#5420F5]" />;
    default:
      if (dialog.variant === 'danger') {
        return <DeleteRemoveIcon size={28} />;
      }
      if (dialog.variant === 'warning') {
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      }
      return <SparklePolishIcon size={28} />;
  }
};

export const ConfirmActionModal: React.FC = () => {
  const { confirmDialog, closeConfirmDialog } = useBopoi();

  useEffect(() => {
    if (!confirmDialog) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeConfirmDialog();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmDialog, closeConfirmDialog]);

  if (!confirmDialog || typeof document === 'undefined') return null;

  const isDanger = confirmDialog.variant === 'danger';
  const isWarning = confirmDialog.variant === 'warning';
  const roomPreview = confirmDialog.roomPreview;
  const isRoomJoinAction = Boolean(roomPreview && !isDanger && !isWarning);

  const handleConfirm = () => {
    const callback = confirmDialog.onConfirm;
    closeConfirmDialog();
    callback();
  };

  return createPortal(
    <div
      onClick={closeConfirmDialog}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bopoi-confirm-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-md w-full overflow-hidden flex flex-col shadow-2xl border border-[#EAE6F0] animate-in zoom-in-95 duration-200"
      >
        {/* Structured Platform Header (Matches CreateRoomModal & RequiredCustomPersonaModal) */}
        <div
          className={`p-4 sm:p-5 border-b border-[#EAE6F0] flex items-start justify-between gap-3 shrink-0 ${
            isDanger
              ? 'bg-gradient-to-r from-rose-50/70 via-[#FAF9FC] to-white'
              : isWarning
              ? 'bg-gradient-to-r from-amber-50/70 via-[#FAF9FC] to-white'
              : 'bg-gradient-to-r from-[#FAF9FC] via-[#F0EBFF]/35 to-white'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-2xl bg-white flex items-center justify-center p-1.5 shadow-2xs shrink-0 border ${
                isDanger
                  ? 'border-rose-200/90'
                  : isWarning
                  ? 'border-amber-200/90'
                  : 'border-[#5420F5]/25'
              }`}
            >
              {renderHeaderBrandIcon(confirmDialog)}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                {confirmDialog.badge && (
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isDanger
                        ? 'bg-rose-100 text-rose-700'
                        : isWarning
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-[#F0EBFF] text-[#5420F5]'
                    }`}
                  >
                    {confirmDialog.badge}
                  </span>
                )}
                <span className="text-[10px] font-bold text-[#706B7D]">
                  {roomPreview ? 'Campus Group Room' : 'Bopoi Safety Check'}
                </span>
              </div>

              <h2
                id="bopoi-confirm-title"
                className="text-sm sm:text-base font-black text-[#191525] leading-snug"
              >
                {confirmDialog.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={closeConfirmDialog}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-black transition-colors cursor-pointer shrink-0"
            aria-label="Cancel"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-3.5">
          {roomPreview ? (
            <>
              {/* Campus Group Preview Card (Matches RoomsView & CreateRoomModal Directory Card) */}
              <div className="p-3.5 rounded-2xl border border-[#EAE6F0] bg-[#FAF9FC] flex items-start gap-3 shadow-2xs">
                <RoomBadgeIcon
                  iconEmoji={roomPreview.iconEmoji}
                  iconBg={roomPreview.iconBg}
                  category={roomPreview.category}
                  roomName={roomPreview.name}
                  size="md"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-black text-[#191525] truncate">
                      #{roomPreview.name}
                    </h4>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-[#EAE6F0] text-[#5420F5] inline-flex items-center gap-1">
                      <BopoiIcon name={roomPreview.category} size={11} />
                      <span>{roomPreview.category}</span>
                    </span>

                    {roomPreview.isJoined ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Joined
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F0EBFF] text-[#5420F5]">
                        Open to All
                      </span>
                    )}
                  </div>

                  {roomPreview.description && (
                    <p className="text-xs text-[#706B7D] line-clamp-2 leading-snug mt-1">
                      {roomPreview.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-2 text-[11px] font-bold text-slate-500">
                    <span className="flex items-center gap-1 text-[#191525]">
                      <Users2 className="w-3.5 h-3.5 text-[#5420F5]" />
                      <span>
                        {roomPreview.membersCount}{' '}
                        {roomPreview.membersCount === 1 ? 'member' : 'members'}
                      </span>
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{roomPreview.onlineCount} online</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Anonymous Persona Assurance Banner or Leave/Delete Notice */}
              {isRoomJoinAction ? (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-[#F0EBFF] via-purple-50 to-white border border-[#5420F5]/20 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#5420F5]/20 flex items-center justify-center p-1 shrink-0 shadow-2xs">
                    <PersonaMaskIcon mask="masked-student" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-[#191525] flex items-center gap-1">
                      <Shield className="w-3 h-3 text-[#5420F5] shrink-0" />
                      <span>100% Anonymous Campus Mask</span>
                    </p>
                    <p className="text-[11px] text-[#706B7D] leading-snug mt-0.5">
                      {confirmDialog.description}
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className={`p-3.5 rounded-2xl border ${
                    isDanger
                      ? 'bg-rose-50/60 border-rose-200/80'
                      : 'bg-amber-50/60 border-amber-200/80'
                  }`}
                >
                  <p className="text-xs text-[#191525] font-medium leading-relaxed">
                    {confirmDialog.description}
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Standard Platform Action Confirmation Body */
            <div
              className={`p-3.5 rounded-2xl border space-y-2 ${
                isDanger
                  ? 'bg-rose-50/50 border-rose-200/80'
                  : isWarning
                  ? 'bg-amber-50/50 border-amber-200/80'
                  : 'bg-gradient-to-r from-[#F0EBFF]/60 via-[#FAF9FC] to-white border-[#5420F5]/20'
              }`}
            >
              <p className="text-xs sm:text-sm text-[#191525] font-semibold leading-relaxed break-words">
                {confirmDialog.description}
              </p>
              <p className="text-[11px] text-[#706B7D] flex items-center gap-1.5">
                <Shield
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isDanger
                      ? 'text-rose-500'
                      : isWarning
                      ? 'text-amber-600'
                      : 'text-[#5420F5]'
                  }`}
                />
                <span>
                  {isDanger
                    ? 'Please double-check before confirming this permanent action.'
                    : 'Confirm below to proceed or cancel to stay where you are.'}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Platform Footer Action Bar (Matches CreateRoomModal & RequiredCustomPersonaModal) */}
        <div className="p-4 sm:p-5 border-t border-[#EAE6F0] bg-[#FAF9FC] flex items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={closeConfirmDialog}
            className="px-4 py-2.5 rounded-xl border border-[#EAE6F0] bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer active:scale-95"
          >
            {confirmDialog.cancelLabel || 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className={`px-5 py-2.5 rounded-xl text-white text-xs font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 active:scale-95 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                : isWarning
                ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                : 'bg-[#5420F5] hover:bg-[#4314E2] shadow-[#5420F5]/25'
            }`}
          >
            {isRoomJoinAction && <LaunchTrendingIcon size={15} />}
            <span>{confirmDialog.confirmLabel || 'Confirm'}</span>
            {!isRoomJoinAction && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

