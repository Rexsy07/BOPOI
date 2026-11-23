import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { RoomMessage, RoomAssignedPersona } from '../../types/index.ts';
import { uploadRoomMediaFile, detectRoomMediaFileType } from '../../lib/supabase.ts';
import {
  ChevronLeft,
  Users2,
  Send,
  Heart,
  Check,
  Shield,
  Sparkles,
  Info,
  Share2,
  Trash2,
  CornerDownRight,
  X,
  Lock,
  RefreshCw,
  Wifi,
  ImagePlus,
  Film,
  Loader2,
  ArrowDown,
  AtSign,
} from 'lucide-react';
import { PersonaMaskIcon } from '../brand/masks/index.ts';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { BopoiIcon, RoomBadgeIcon } from '../brand/icons/index.ts';
import {
  ROOM_PRESET_ALIASES,
  getSavedRoomPersona,
  getAvailablePresetAliases,
} from '../../utils/roomPersonas.ts';
import { RequiredCustomPersonaModal } from '../modals/RequiredCustomPersonaModal.tsx';
import { EditRoomIconModal } from '../modals/RoomIconStudioPicker.tsx';
import { KlipyGifPicker } from '../modals/KlipyGifPicker.tsx';
import { GifPreviewMedia } from '../ui/GifPreviewMedia.tsx';
import { MentionText } from '../ui/MentionText.tsx';
import { MentionAutocompleteDropdown } from '../comments/MentionAutocompleteDropdown.tsx';
import {
  buildMentionCandidates,
  useMentionAutocomplete,
} from '../../hooks/useMentionAutocomplete.ts';
import { useMobileKeyboard } from '../../hooks/useMobileKeyboard.ts';

const EMOJI_REACTIONS = ['❤️', '🔥', '😂', '💀', '👏', '🤫'];

export const RoomDetailView: React.FC = () => {
  const {
    rooms,
    creators,
    selectedRoomId,
    enterRoom,
    sendRoomMessage,
    toggleRoomMessageLike,
    addRoomMessageReaction,
    toggleJoinRoom,
    setActiveView,
    goBack,
    viewUserProfile,
    user,
    showToast,
    deleteRoom,
    updateRoomIcon,
    adminUpdateRoom,
    isAdminUnlocked,
    assignPersonaToRoom,
    connectionStatus,
    reconnectRealtime,
    isAuthenticated,
  } = useBopoi();

  const isLoggedIn = Boolean(isAuthenticated && user.username && user.username !== 'student');
  const { isKeyboardOpen, visualViewportHeight } = useMobileKeyboard();

  const [messageText, setMessageText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [showRoomInfo, setShowRoomInfo] = useState(false);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [showRequiredCustomModal, setShowRequiredCustomModal] = useState(false);
  const [showEditIconModal, setShowEditIconModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState<RoomMessage | null>(null);
  const [pendingMedia, setPendingMedia] = useState<{
    mediaUrl: string;
    mediaType: 'image' | 'video' | 'gif';
    fileName: string;
  } | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [unreadWhileScrolledUp, setUnreadWhileScrolledUp] = useState(0);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isInitialMount = useRef(true);
  const prevMessagesCount = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const roomMention = useMentionAutocomplete({
    text: messageText,
    setText: setMessageText,
    inputRef,
  });

  // Find active room
  const activeRoom =
    rooms.find((r) => r.id === selectedRoomId) || rooms[0];

  const roomMentionCandidates = useMemo(
    () =>
      buildMentionCandidates({
        creators,
        participants: (activeRoom?.messages || []).map((m) => ({
          id: `room-speaker-${m.authorUsername}`,
          name: m.authorName,
          username: m.authorUsername,
          avatarUrl: m.authorAvatar,
          campus: m.authorCampus,
          isAnon: m.isAnonymous,
          badge: 'In Room',
          detail: 'Active in this room',
        })),
        excludeUsername: user.username,
      }),
    [activeRoom?.messages, creators, user.username]
  );

  // Assigned persona for this user in this room
  const [assignedPersona, setAssignedPersona] = useState<RoomAssignedPersona | null>(() => {
    if (!activeRoom) return null;
    return getSavedRoomPersona(activeRoom.id, user.id, activeRoom.assignedPersonas);
  });

  // Evaluate & enforce persona assignment upon room entry (only when signed in)
  useEffect(() => {
    if (!activeRoom || !isLoggedIn) return;

    const existing = getSavedRoomPersona(activeRoom.id, user.id, activeRoom.assignedPersonas);
    if (existing) {
      setAssignedPersona(existing);
      setShowRequiredCustomModal(false);
      return;
    }

    const available = getAvailablePresetAliases(activeRoom.assignedPersonas, activeRoom.creatorAlias);
    if (available.length > 0) {
      const next = available[0];
      const newPersona: RoomAssignedPersona = {
        userId: user.id,
        alias: next.name,
        maskId: next.id,
        maskEmoji: next.emoji,
        isCustom: false,
        assignedAt: Date.now(),
      };
      assignPersonaToRoom(activeRoom.id, newPersona);
      setAssignedPersona(newPersona);
      setShowRequiredCustomModal(false);
      showToast(`Assigned anonymous persona: ${next.name}`, 'info');
    } else {
      setAssignedPersona(null);
      setShowRequiredCustomModal(true);
    }
  }, [activeRoom?.id, user.id, isLoggedIn]);

  const handleConfirmCustomPersona = (customAlias: string, maskId: string, maskEmoji: string) => {
    if (!activeRoom) return;
    const newPersona: RoomAssignedPersona = {
      userId: user.id,
      alias: customAlias.trim(),
      maskId,
      maskEmoji,
      isCustom: true,
      assignedAt: Date.now(),
    };
    assignPersonaToRoom(activeRoom.id, newPersona);
    setAssignedPersona(newPersona);
    setShowRequiredCustomModal(false);
    showToast(`Joined #${activeRoom.name} as ${newPersona.alias}!`, 'success');
  };

  const handleCancelCustomPersona = () => {
    setShowRequiredCustomModal(false);
    setActiveView('rooms');
  };

  // Scroll handling & reset per room
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    setIsScrolledUp(false);
    setUnreadWhileScrolledUp(0);
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [activeRoom?.id]);

  // Keep chat composer flush with the keyboard and latest messages visible when keyboard opens
  useEffect(() => {
    if (!isKeyboardOpen) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
      setIsScrolledUp(false);
      setUnreadWhileScrolledUp(0);
    }
  }, [isKeyboardOpen, visualViewportHeight]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevMessagesCount.current = activeRoom?.messages?.length || 0;
      return;
    }

    const currentLength = activeRoom?.messages?.length || 0;
    const delta = currentLength - prevMessagesCount.current;
    if (delta > 0) {
      const el = messagesContainerRef.current;
      const nearBottom =
        !el || el.scrollHeight - el.scrollTop - el.clientHeight < 140;
      if (nearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setIsScrolledUp(false);
        setUnreadWhileScrolledUp(0);
      } else {
        setIsScrolledUp(true);
        setUnreadWhileScrolledUp((prev) => prev + delta);
      }
    }
    prevMessagesCount.current = currentLength;
  }, [activeRoom?.messages?.length]);

  // Escape key dismissal for lightbox, modals, mentions, and reply bar
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (lightboxImageUrl) {
        e.preventDefault();
        setLightboxImageUrl(null);
      } else if (showRosterModal) {
        e.preventDefault();
        setShowRosterModal(false);
      } else if (showEditIconModal) {
        e.preventDefault();
        setShowEditIconModal(false);
      } else if (showRoomInfo) {
        e.preventDefault();
        setShowRoomInfo(false);
      } else if (roomMention.isOpen) {
        e.preventDefault();
        roomMention.dismiss();
      } else if (replyingTo) {
        e.preventDefault();
        setReplyingTo(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    lightboxImageUrl,
    showRosterModal,
    showEditIconModal,
    showRoomInfo,
    roomMention.isOpen,
    roomMention.dismiss,
    replyingTo,
  ]);

  if (!activeRoom) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#F0EBFF] text-[#5420F5] flex items-center justify-center mx-auto">
          <Users2 className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-black text-[#191525]">Room not available</h2>
          <p className="text-xs text-[#706B7D]">
            This room may still be loading or may have been removed.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView('rooms')}
            className="px-4 py-2 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black rounded-xl cursor-pointer transition-colors"
          >
            Browse All Rooms
          </button>
          <button
            type="button"
            onClick={() => goBack('home')}
            className="px-4 py-2 bg-[#FAF9FC] border border-[#EAE6F0] text-[#191525] text-xs font-bold rounded-xl cursor-pointer hover:bg-[#F0EBFF] transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const effectiveIsAnonymous = activeRoom.isAnonymousOnly ? true : isAnonymous;

  const effectiveAlias = effectiveIsAnonymous
    ? (assignedPersona?.alias || 'Masked Student')
    : user.displayName;

  const effectiveMaskId = effectiveIsAnonymous
    ? (assignedPersona?.maskId || 'masked-student')
    : 'public-profile';

  const handleMediaFileSelected = async (file: File | null | undefined) => {
    if (!file || !activeRoom) return;
    if (!detectRoomMediaFileType(file)) {
      showToast('Please select an image or video file.', 'error');
      return;
    }

    setIsUploadingMedia(true);
    try {
      const uploaded = await uploadRoomMediaFile(file, activeRoom.id);
      setPendingMedia({
        mediaUrl: uploaded.mediaUrl,
        mediaType: uploaded.mediaType,
        fileName: file.name || (uploaded.mediaType === 'video' ? 'video.mp4' : 'photo.jpg'),
      });
      setTimeout(() => {
        inputRef.current?.focus();
      }, 40);
    } catch (err: any) {
      showToast(err?.message || 'Failed to upload media file.', 'error');
    } finally {
      setIsUploadingMedia(false);
      if (mediaInputRef.current) {
        mediaInputRef.current.value = '';
      }
    }
  };

  const handlePasteMedia = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && detectRoomMediaFileType(file)) {
          e.preventDefault();
          handleMediaFileSelected(file);
          break;
        }
      }
    }
  };

  const handleDropMedia = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isLoggedIn || (activeRoom.isLocked && !isAdminUnlocked)) return;
    const file = e.dataTransfer?.files?.[0];
    if (file && detectRoomMediaFileType(file)) {
      handleMediaFileSelected(file);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageText.trim() && !pendingMedia) || isUploadingMedia) return;

    if (activeRoom.isLocked && !isAdminUnlocked) {
      showToast('This room is locked by Campus Moderators.', 'error');
      return;
    }

    if (effectiveIsAnonymous && !assignedPersona) {
      setShowRequiredCustomModal(true);
      return;
    }

    const replyPreviewText = replyingTo
      ? replyingTo.text ||
        (replyingTo.mediaType === 'video'
          ? '🎬 Video'
          : replyingTo.mediaType === 'gif'
          ? '🎞️ GIF'
          : replyingTo.mediaUrl
          ? '📷 Photo'
          : '')
      : '';

    sendRoomMessage(
      activeRoom.id,
      messageText.trim(),
      effectiveIsAnonymous,
      effectiveAlias,
      replyingTo
        ? {
            id: replyingTo.id,
            authorName: replyingTo.authorAlias || replyingTo.authorName,
            text: replyPreviewText,
          }
        : undefined,
      effectiveIsAnonymous ? effectiveMaskId : undefined,
      pendingMedia
        ? {
            mediaUrl: pendingMedia.mediaUrl,
            mediaType: pendingMedia.mediaType,
          }
        : undefined
    );

    setMessageText('');
    setPendingMedia(null);
    setReplyingTo(null);
    roomMention.reset();

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setIsScrolledUp(false);
      setUnreadWhileScrolledUp(0);
    }, 50);
  };

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distFromBottom < 110;
    setIsScrolledUp(!nearBottom);
    if (nearBottom) {
      setUnreadWhileScrolledUp(0);
    }
  };

  const scrollToLatestMessages = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsScrolledUp(false);
    setUnreadWhileScrolledUp(0);
  };

  const handleShareRoom = () => {
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://bopoi.app';
    const roomUrl = `${origin}/#room-${activeRoom.id}`;
    const shareText = `Join the anonymous #${activeRoom.name} chat room on Bopoi: ${activeRoom.description}\n${roomUrl}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share({
          title: `#${activeRoom.name} Anonymous Room`,
          text: shareText,
          url: roomUrl,
        })
        .then(() => showToast('Room link shared!', 'success'))
        .catch(() => {
          navigator.clipboard?.writeText(roomUrl);
          showToast('Room link copied to clipboard!', 'success');
        });
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(roomUrl);
      showToast('Room link copied to clipboard!', 'success');
    } else {
      showToast('Share link: ' + roomUrl, 'info');
    }
  };

  const isCreator = Boolean(
    (user.id && activeRoom.creatorUserId === user.id) ||
      (user.displayName && activeRoom.creatorName === user.displayName)
  );
  const canEditRoomIcon = Boolean(
    isLoggedIn && (isCreator || !activeRoom.creatorUserId || isAdminUnlocked)
  );

  const dynamicChatHeight =
    isKeyboardOpen && visualViewportHeight
      ? `${Math.max(220, visualViewportHeight)}px`
      : undefined;

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropMedia}
      style={
        dynamicChatHeight
          ? { height: dynamicChatHeight, maxHeight: dynamicChatHeight }
          : undefined
      }
      className={`w-full px-3 sm:px-4 pt-1 ${
        isKeyboardOpen ? 'pb-1.5' : 'pb-2'
      } flex flex-col h-[calc(100dvh-58px-env(safe-area-inset-bottom))] max-h-[calc(100dvh-58px-env(safe-area-inset-bottom))] lg:h-dvh lg:max-h-dvh overflow-hidden bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA]`}
    >
      {/* 1. Sticky Room Header (Responsive, never overflows) */}
      <div className="flex items-center justify-between py-2.5 border-b border-[#EAE6F0] dark:border-[#262036] shrink-0 bg-white/95 dark:bg-[#0E0C14]/95 backdrop-blur-md z-20 gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => goBack('rooms')}
            className="min-w-[44px] min-h-[44px] sm:min-w-[38px] sm:min-h-[38px] -ml-1.5 rounded-full hover:bg-[#FAF9FC] dark:hover:bg-[#171322] text-[#191525] dark:text-[#F4F2FA] transition-colors cursor-pointer flex items-center justify-center shrink-0"
            title="Go back"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {canEditRoomIcon ? (
            <button
              type="button"
              onClick={() => setShowEditIconModal(true)}
              title="Upload Room Profile Icon"
              className="relative group cursor-pointer shrink-0 rounded-2xl focus:outline-none"
            >
              <RoomBadgeIcon
                iconEmoji={activeRoom.iconEmoji}
                iconBg={activeRoom.iconBg}
                category={activeRoom.category}
                roomName={activeRoom.name}
                size="sm"
                className="group-hover:scale-105 transition-transform"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#5420F5] text-white flex items-center justify-center shadow-xs border border-white dark:border-[#0E0C14]">
                <ImagePlus className="w-2.5 h-2.5" />
              </span>
            </button>
          ) : (
            <RoomBadgeIcon
              iconEmoji={activeRoom.iconEmoji}
              iconBg={activeRoom.iconBg}
              category={activeRoom.category}
              roomName={activeRoom.name}
              size="sm"
            />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className="text-xs sm:text-sm font-black text-[#191525] dark:text-[#F4F2FA] truncate">
                #{activeRoom.name}
              </h1>
              {activeRoom.isLocked && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-400 shrink-0">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Locked</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#706B7D] dark:text-[#9E97B3] truncate flex-wrap tabular-nums">
              <span className="text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
                {activeRoom.onlineCount || 1} online
              </span>
              <span>·</span>
              <span className="truncate">
                {activeRoom.membersCount}{' '}
                {activeRoom.membersCount === 1 ? 'member' : 'members'}
              </span>
              <span>·</span>
              <button
                type="button"
                onClick={reconnectRealtime}
                title="Real-time sync status (tap to resync)"
                className={`inline-flex items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer shrink-0 ${
                  connectionStatus === 'connected'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : connectionStatus === 'reconnecting'
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {connectionStatus === 'reconnecting' ? (
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <Wifi className="w-2.5 h-2.5" />
                )}
                <span>
                  {connectionStatus === 'connected'
                    ? 'Live'
                    : connectionStatus === 'reconnecting'
                    ? 'Syncing'
                    : 'Offline'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Header Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Share Room */}
          <button
            type="button"
            onClick={handleShareRoom}
            className="p-2 rounded-xl border border-[#EAE6F0] dark:border-[#262036] bg-white dark:bg-[#171322] hover:bg-purple-50 dark:hover:bg-[#231A45] text-slate-600 dark:text-[#9E97B3] hover:text-[#5420F5] dark:hover:text-[#B9A7FF] transition-colors cursor-pointer"
            title="Share Room link"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          {/* Info toggle */}
          <button
            type="button"
            onClick={() => setShowRoomInfo(!showRoomInfo)}
            className={`p-2 rounded-xl border border-[#EAE6F0] dark:border-[#262036] transition-colors cursor-pointer ${
              showRoomInfo
                ? 'bg-[#5420F5] text-white'
                : 'bg-white dark:bg-[#171322] text-slate-600 dark:text-[#9E97B3] hover:bg-slate-100 dark:hover:bg-[#231A45]'
            }`}
            title="Room Details"
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          {/* Join / Leave Room Button */}
          <button
            onClick={() => toggleJoinRoom(activeRoom.id)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer shrink-0 ${
              activeRoom.isJoined
                ? 'bg-white dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-slate-700 dark:text-[#F4F2FA] hover:bg-slate-100 dark:hover:bg-[#231A45]'
                : 'bg-[#5420F5] hover:bg-[#4314E2] text-white shadow-xs'
            }`}
          >
            {activeRoom.isJoined ? (
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                <span>Joined</span>
              </span>
            ) : (
              <span>+ Join</span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Room Details Drawer / Info Banner */}
      {showRoomInfo ? (
        <div className="mt-1.5 p-3 rounded-2xl bg-white dark:bg-[#171322] border border-[#5420F5]/30 shadow-md space-y-2 shrink-0 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-[#5420F5] dark:text-[#B9A7FF]">
              <Shield className="w-4 h-4" />
              <span>Room Info &amp; Privacy</span>
            </div>
            <button
              onClick={() => setShowRoomInfo(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-700 dark:text-[#D5D0E6] leading-relaxed font-medium break-words">
            <strong>Topic:</strong> {activeRoom.description}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-[#9E97B3] pt-1 border-t border-slate-100 dark:border-[#262036] flex-wrap">
            <span className="inline-flex items-center gap-1">
              <PersonaMaskIcon mask="masked-student" size={14} />
              <span>100% Anonymous</span>
            </span>
            <span>•</span>
            <span>Category: {activeRoom.category}</span>
            {activeRoom.creatorAlias && (
              <>
                <span>•</span>
                <span>Host: {activeRoom.creatorAlias}</span>
              </>
            )}
            <div className="ml-auto flex items-center gap-3">
              {canEditRoomIcon && (
                <button
                  type="button"
                  onClick={() => setShowEditIconModal(true)}
                  className="text-[#5420F5] dark:text-[#B9A7FF] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ImagePlus className="w-3 h-3" />
                  <span>Upload Room Icon</span>
                </button>
              )}
              {isCreator && (
                <button
                  type="button"
                  onClick={() => {
                    deleteRoom(activeRoom.id);
                  }}
                  className="text-red-500 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Room</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-between text-xs shrink-0 shadow-2xs gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-5 h-5 rounded-md bg-purple-50 dark:bg-[#231A45] flex items-center justify-center shrink-0">
              <PersonaMaskIcon mask="masked-student" size={14} />
            </div>
            <span className="text-slate-600 dark:text-[#9E97B3] font-medium truncate text-[11px]">
              <strong className="text-[#191525] dark:text-[#F4F2FA]">Topic: </strong>
              {activeRoom.description}
            </span>
          </div>
          <button
            onClick={() => setShowRoomInfo(true)}
            className="text-[10px] font-bold text-[#5420F5] dark:text-[#B9A7FF] hover:underline shrink-0 cursor-pointer"
          >
            Details
          </button>
        </div>
      )}

      {/* 4. Messages Stream (Scrollable) */}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="flex-1 min-h-0 overflow-y-auto py-3 space-y-3 pr-1 relative"
      >
        {!activeRoom.messages || activeRoom.messages.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-3 bg-white dark:bg-[#171322] rounded-3xl border border-dashed border-slate-200 dark:border-[#262036] my-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-[#231A45] text-[#5420F5] mx-auto flex items-center justify-center p-1.5">
              <PersonaMaskIcon mask="masked-student" size={32} />
            </div>
            <h3 className="text-sm font-black text-[#191525] dark:text-[#F4F2FA]">
              Welcome to #{activeRoom.name}!
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#9E97B3] max-w-sm mx-auto">
              This is a private, anonymous chat room. Everyone speaks behind a mask. Say hello or share your thoughts!
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-2">
              {[
                'Hey everyone! 👋',
                'What is going on here? 👀',
                'Anyone awake right now? 🌙',
              ].map((starter) => (
                <button
                  key={starter}
                  onClick={() => {
                    setMessageText(starter);
                    inputRef.current?.focus();
                  }}
                  className="px-3 py-1.5 rounded-xl border border-[#EAE6F0] dark:border-[#262036] bg-[#FAF9FC] dark:bg-[#0E0C14] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] hover:border-[#5420F5]/30 text-xs font-bold text-slate-700 dark:text-[#D5D0E6] transition-all cursor-pointer"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          activeRoom.messages.map((msg, msgIdx) => {
            const isMe =
              msg.authorUsername === user.username && !msg.isAnonymous;
            const prevMsg = msgIdx > 0 ? activeRoom.messages?.[msgIdx - 1] : null;
            const msgDate = msg.createdTimestamp ? new Date(msg.createdTimestamp) : null;
            const prevDate = prevMsg?.createdTimestamp ? new Date(prevMsg.createdTimestamp) : null;
            const msgDayKey =
              msgDate && !Number.isNaN(msgDate.getTime())
                ? `${msgDate.getFullYear()}-${msgDate.getMonth()}-${msgDate.getDate()}`
                : null;
            const prevDayKey =
              prevDate && !Number.isNaN(prevDate.getTime())
                ? `${prevDate.getFullYear()}-${prevDate.getMonth()}-${prevDate.getDate()}`
                : null;
            const showDayDivider = Boolean(
              msgDayKey && (!prevDayKey || msgDayKey !== prevDayKey)
            );
            const formatDayLabel = (d: Date) => {
              const now = new Date();
              const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
              const yest = new Date(now);
              yest.setDate(now.getDate() - 1);
              const yestKey = `${yest.getFullYear()}-${yest.getMonth()}-${yest.getDate()}`;
              const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
              if (key === todayKey) return 'Today';
              if (key === yestKey) return 'Yesterday';
              return d.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
              });
            };

            const jumpToQuotedOriginal = () => {
              if (!msg.replyTo) return;
              const target = (activeRoom.messages || []).find(
                (candidate) =>
                  candidate.id !== msg.id &&
                  candidate.authorName === msg.replyTo?.authorName &&
                  (candidate.text === msg.replyTo?.text ||
                    (candidate.text &&
                      msg.replyTo?.text &&
                      candidate.text.includes(msg.replyTo.text.slice(0, 24))))
              );
              if (!target) return;
              const el = messageRefs.current[target.id];
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setHighlightedMessageId(target.id);
                window.setTimeout(() => {
                  setHighlightedMessageId((curr) => (curr === target.id ? null : curr));
                }, 1400);
              }
            };

            return (
              <React.Fragment key={msg.id}>
                {showDayDivider && msgDate && (
                  <div className="flex items-center gap-3 py-1.5 select-none">
                    <div className="flex-1 h-px bg-[#EAE6F0]" />
                    <span className="text-[10px] font-bold text-[#706B7D] tabular-nums">
                      {formatDayLabel(msgDate)}
                    </span>
                    <div className="flex-1 h-px bg-[#EAE6F0]" />
                  </div>
                )}

                <div
                  ref={(el) => {
                    messageRefs.current[msg.id] = el;
                  }}
                  className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse' : ''} group min-w-0 rounded-2xl transition-colors duration-300 ${
                    highlightedMessageId === msg.id ? 'bg-[#F0EBFF]/75 p-1 -m-1' : ''
                  }`}
                >
                  {/* Author Avatar */}
                  <div
                    onClick={() => {
                      if (!msg.isAnonymous) {
                        viewUserProfile(
                          msg.authorUsername,
                          false,
                          msg.authorCampus
                        );
                      }
                    }}
                    className={`shrink-0 ${!msg.isAnonymous ? 'cursor-pointer hover:opacity-85' : ''}`}
                    title={
                      msg.isAnonymous
                        ? 'Anonymous Campus Member'
                        : `View ${msg.authorName}'s public profile`
                    }
                  >
                    {msg.isAnonymous ? (
                      <div className="w-8 h-8 rounded-xl bg-white border border-[#5420F5]/25 flex items-center justify-center shadow-2xs select-none p-0.5 hover:scale-105 transition-transform">
                        <PersonaMaskIcon mask={msg.authorMaskEmoji || msg.authorName || 'masked-student'} size={24} />
                      </div>
                    ) : (
                      <CampusCharacterAvatar
                        value={msg.authorAvatar}
                        seed={msg.authorUsername}
                        size={32}
                        rounded="full"
                        className="ring-1 ring-slate-200"
                      />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[84%] sm:max-w-[76%] min-w-0 rounded-2xl p-3 shadow-2xs space-y-1.5 relative overflow-hidden ${
                      isMe
                        ? 'bg-[#5420F5] text-white rounded-tr-xs'
                        : 'bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-[#191525] dark:text-[#F4F2FA] rounded-tl-xs'
                    }`}
                  >
                    {/* Quoted Reply context if exists (tap to jump to original) */}
                    {msg.replyTo && (
                      <button
                        type="button"
                        onClick={jumpToQuotedOriginal}
                        className={`w-full text-left p-1.5 px-2.5 rounded-xl text-[10px] mb-1 border transition-opacity hover:opacity-85 cursor-pointer ${
                          isMe
                            ? 'bg-white/15 border-white/30 text-white/95'
                            : 'bg-white dark:bg-[#0E0C14] border-[#EAE6F0] dark:border-[#262036] text-slate-600 dark:text-[#9E97B3]'
                        }`}
                        title="Tap to jump to original message"
                      >
                        <strong className="block truncate font-bold">
                          Replying to {msg.replyTo.authorName}:
                        </strong>
                        <span className="line-clamp-1 italic break-words">
                          "{msg.replyTo.text}"
                        </span>
                      </button>
                    )}

                  {/* Author Header */}
                  <div className="flex items-center justify-between gap-2 text-[10px] min-w-0">
                    <span
                      className={`font-black flex items-center gap-1 min-w-0 truncate ${
                        isMe ? 'text-white' : 'text-[#5420F5] dark:text-[#B9A7FF]'
                      }`}
                    >
                      <span className="truncate">{msg.authorName}</span>
                      {msg.isAnonymous && (
                        <span className="text-[9px] font-semibold opacity-75 shrink-0">
                          • Masked
                        </span>
                      )}
                    </span>
                    <span className={`shrink-0 ${isMe ? 'text-white/75' : 'text-slate-400 dark:text-[#9E97B3]'}`}>
                      {msg.createdAt}
                    </span>
                  </div>

                  {/* Uploaded Image, Video, or GIF Attachment */}
                  {msg.mediaUrl && (
                    <div className="pt-0.5">
                      {msg.mediaType === 'video' ||
                      msg.mediaUrl.startsWith('data:video/') ||
                      /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(msg.mediaUrl) ? (
                        <div className="rounded-xl overflow-hidden bg-black/95 border border-black/10 max-h-72">
                          <video
                            src={msg.mediaUrl}
                            controls
                            playsInline
                            preload="metadata"
                            className="w-full max-h-72 object-contain rounded-xl"
                          />
                        </div>
                      ) : msg.mediaType === 'gif' ? (
                        <GifPreviewMedia
                          url={msg.mediaUrl}
                          alt={msg.text || 'Room GIF'}
                          onClick={() => setLightboxImageUrl(msg.mediaUrl || null)}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setLightboxImageUrl(msg.mediaUrl || null)}
                          className="block w-full rounded-xl overflow-hidden border border-black/10 bg-black/5 cursor-pointer group/img focus:outline-none"
                          title="Tap to view full image"
                        >
                          <img
                            src={msg.mediaUrl}
                            alt={msg.text || 'Room photo'}
                            loading="lazy"
                            className="w-full max-h-72 object-cover group-hover/img:scale-[1.01] transition-transform"
                          />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Message Text */}
                  {msg.text && (
                    <p className="text-xs font-medium leading-relaxed select-text whitespace-pre-wrap break-words">
                      <MentionText
                        text={msg.text}
                        tone={isMe ? 'inverted' : 'default'}
                      />
                    </p>
                  )}

                  {/* Reactions Display */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {Object.entries(msg.reactions).map(([emoji, count]) => {
                        if (count <= 0) return null;
                        const hasReacted = msg.userReactions?.[emoji];
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() =>
                              addRoomMessageReaction(activeRoom.id, msg.id, emoji)
                            }
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 border cursor-pointer transition-all ${
                              hasReacted
                                ? isMe
                                  ? 'bg-white/25 border-white text-white'
                                  : 'bg-[#F0EBFF] dark:bg-[#231A45] border-[#5420F5] text-[#5420F5] dark:text-[#B9A7FF]'
                                : isMe
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'bg-slate-50 dark:bg-[#0E0C14] border-slate-200 dark:border-[#262036] text-slate-600 dark:text-[#9E97B3]'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span>{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Message Action Toolbar (Reactions, Like, Reply) */}
                  <div
                    className={`flex items-center justify-between pt-1.5 gap-2 border-t flex-wrap ${
                      isMe ? 'border-white/15 text-white/85' : 'border-slate-100 dark:border-[#262036] text-slate-400 dark:text-[#9E97B3]'
                    }`}
                  >
                    {/* Quick emoji reactions */}
                    <div className="flex items-center gap-0.5">
                      {EMOJI_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() =>
                            addRoomMessageReaction(activeRoom.id, msg.id, emoji)
                          }
                          className="hover:scale-125 transition-transform p-0.5 text-xs cursor-pointer"
                          title={`React ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2.5">
                      {/* Reply button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!isLoggedIn) {
                            showToast('Please sign in to reply in rooms.', 'info');
                            setActiveView('profile');
                            return;
                          }
                          setReplyingTo(msg);
                          inputRef.current?.focus();
                        }}
                        className="text-[10px] font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                        title="Reply to message"
                      >
                        <CornerDownRight className="w-3 h-3" />
                        <span>Reply</span>
                      </button>

                      {/* Like button */}
                      <button
                        type="button"
                        onClick={() =>
                          toggleRoomMessageLike(activeRoom.id, msg.id)
                        }
                        className="flex items-center gap-1 text-[10px] font-bold hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Heart
                          className={`w-3 h-3 ${
                            msg.hasLiked
                              ? isMe
                                ? 'fill-white text-white'
                                : 'fill-[#F52D85] text-[#F52D85]'
                              : ''
                          }`}
                        />
                        {msg.likes > 0 && <span>{msg.likes}</span>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Jump-to-Latest Pill when scrolled up */}
      {isScrolledUp && (activeRoom.messages?.length || 0) > 4 && (
        <div className="shrink-0 flex justify-center -mt-9 mb-2 z-20 pointer-events-none">
          <button
            type="button"
            onClick={scrollToLatestMessages}
            className="pointer-events-auto px-3.5 py-1.5 rounded-full bg-[#191525]/92 hover:bg-[#5420F5] text-white text-[11px] font-black shadow-lg backdrop-blur-md transition-all cursor-pointer inline-flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-1"
          >
            <ArrowDown className="w-3.5 h-3.5 stroke-[2.75]" />
            <span>
              {unreadWhileScrolledUp > 0
                ? `${unreadWhileScrolledUp} new ${
                    unreadWhileScrolledUp === 1 ? 'message' : 'messages'
                  }`
                : 'Jump to latest'}
            </span>
          </button>
        </div>
      )}

      {/* 5. Active Reply Bar (When replying to a specific message) */}
      {replyingTo && (
        <div className="shrink-0 mb-1.5 p-2 px-3 rounded-xl bg-[#191525] text-white flex items-center justify-between text-xs shadow-md animate-in slide-in-from-bottom-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <CornerDownRight className="w-3.5 h-3.5 text-[#FFC928] shrink-0" />
            <span className="truncate">
              Replying to <strong>{replyingTo.authorName}</strong>:{' '}
              <span className="text-slate-300">
                "
                {replyingTo.text ||
                  (replyingTo.mediaType === 'video'
                    ? '🎬 Video'
                    : replyingTo.mediaType === 'gif'
                    ? '🎞️ GIF'
                    : replyingTo.mediaUrl
                    ? '📷 Photo'
                    : '')}
                "
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="text-slate-400 hover:text-white p-1 cursor-pointer shrink-0"
            title="Cancel reply"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isLoggedIn ? (
        activeRoom.isLocked && !isAdminUnlocked ? (
          <div className="shrink-0 bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-center justify-between gap-2 text-xs text-rose-800 shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Lock className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-bold truncate">
                This room is currently locked by Campus Moderators. Only admins can post right now.
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* 6. Anonymous Persona & Identity Status Bar (Clean responsive layout, never overflows) */}
            <div className="shrink-0 mb-1.5 px-2.5 py-1.5 rounded-2xl bg-[#F0EBFF]/90 dark:bg-[#231A45]/80 border border-[#5420F5]/25 dark:border-[#7C5CFF]/30 flex items-center justify-between gap-2 text-xs min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setShowRosterModal(true)}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white dark:bg-[#0E0C14] border border-[#5420F5]/30 flex items-center justify-center p-0.5 shadow-2xs hover:scale-105 transition-transform cursor-pointer shrink-0"
                  title="Click to view room aliases"
                >
                  <PersonaMaskIcon mask={effectiveIsAnonymous ? effectiveMaskId : 'public-profile'} size={20} />
                </button>

                <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-[#9E97B3] shrink-0 hidden xs:inline">
                  Speaking as:
                </span>

                <button
                  type="button"
                  onClick={() => setShowRosterModal(true)}
                  className="font-black text-[#5420F5] dark:text-[#B9A7FF] bg-white dark:bg-[#0E0C14] px-2 py-0.5 rounded-lg border border-[#5420F5]/30 min-w-0 max-w-[130px] sm:max-w-[180px] shadow-2xs flex items-center gap-1 cursor-pointer hover:border-[#5420F5]"
                  title="Your locked persona for this room"
                >
                  <span className="truncate text-[11px]">{effectiveAlias}</span>
                  <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                </button>
              </div>

              {/* Room Aliases Button & Anonymity toggle */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isAdminUnlocked && (
                  <button
                    type="button"
                    onClick={() => adminUpdateRoom(activeRoom.id, { isLocked: !activeRoom.isLocked })}
                    className={`px-2 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer shrink-0 inline-flex items-center gap-1 ${
                      activeRoom.isLocked
                        ? 'bg-rose-600 text-white'
                        : 'bg-white dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] text-slate-600 dark:text-[#9E97B3] hover:bg-rose-50 hover:text-rose-700'
                    }`}
                    title={activeRoom.isLocked ? 'Unlock this room' : 'Lock this room'}
                  >
                    <Lock className="w-3 h-3 shrink-0" />
                    <span>{activeRoom.isLocked ? 'Unlock' : 'Lock'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowRosterModal(true)}
                  className="px-2 sm:px-2.5 py-1 rounded-xl bg-white dark:bg-[#0E0C14] border border-[#5420F5]/30 text-[#5420F5] dark:text-[#B9A7FF] hover:bg-purple-50 dark:hover:bg-[#171322] text-[10px] font-black transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  title="View room aliases and members"
                >
                  <Users2 className="w-3 h-3 shrink-0" />
                  <span>Aliases</span>
                </button>

                {!activeRoom.isAnonymousOnly && (
                  <button
                    type="button"
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className={`px-2 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer shrink-0 inline-flex items-center gap-1 ${
                      effectiveIsAnonymous
                        ? 'bg-[#5420F5] text-white shadow-2xs'
                        : 'bg-white dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] text-slate-600 dark:text-[#9E97B3] hover:bg-slate-50 dark:hover:bg-[#171322]'
                    }`}
                  >
                    <span>{effectiveIsAnonymous ? 'Mask On' : 'Public'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Pending Image / Video Attachment Preview Bar */}
            {(pendingMedia || isUploadingMedia) && (
              <div className="shrink-0 mb-1.5 p-2 px-3 rounded-2xl bg-white border border-[#5420F5]/30 shadow-xs flex items-center justify-between gap-2.5 animate-in fade-in duration-150">
                {isUploadingMedia ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-[#5420F5]">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Uploading media to room...</span>
                  </div>
                ) : pendingMedia ? (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {pendingMedia.mediaType === 'video' ? (
                        <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden shrink-0 relative flex items-center justify-center border border-slate-200">
                          <video
                            src={pendingMedia.mediaUrl}
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <Film className="w-4 h-4 text-white" />
                          </span>
                        </div>
                      ) : (
                        <img
                          src={pendingMedia.mediaUrl}
                          alt="Upload preview"
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[#EAE6F0]"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#5420F5] bg-[#F0EBFF] px-2 py-0.5 rounded-md">
                          {pendingMedia.mediaType === 'video'
                            ? '🎬 Video Ready'
                            : pendingMedia.mediaType === 'gif'
                            ? '🎞️ GIF Ready'
                            : '📷 Photo Ready'}
                        </span>
                        <p className="text-[11px] font-semibold text-[#706B7D] truncate mt-0.5">
                          Add a caption below or hit send
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingMedia(null)}
                      className="p-1.5 rounded-full bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                      title="Remove attachment"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : null}
              </div>
            )}

            {/* Floating @Mention Autocomplete + Bottom Chat Composer Form */}
            <div className="relative shrink-0">
              <MentionAutocompleteDropdown
                isOpen={roomMention.isOpen}
                query={roomMention.query}
                candidates={roomMentionCandidates}
                onSelect={roomMention.insertMention}
                onClose={roomMention.dismiss}
                placement="top"
              />

              <form
                onSubmit={handleSend}
                className="bg-white border border-[#EAE6F0] rounded-2xl p-1.5 pl-2 shadow-md flex items-center gap-1.5 min-w-0"
              >
                <button
                  type="button"
                  onClick={() => setShowRosterModal(true)}
                  className="shrink-0 w-8 h-8 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center justify-center hover:bg-purple-50 transition-colors cursor-pointer"
                  title="View your persona badge & room roster"
                >
                  <PersonaMaskIcon mask={effectiveIsAnonymous ? effectiveMaskId : 'public-profile'} size={22} />
                </button>

                {/* Hidden file input for Photo & Video upload */}
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="image/*,video/*,.mp4,.webm,.mov,.m4v,.heic,.heif"
                  className="hidden"
                  onChange={(e) => handleMediaFileSelected(e.target.files?.[0])}
                />

                {/* Photo / Video Upload Trigger Button */}
                <button
                  type="button"
                  disabled={isUploadingMedia}
                  onClick={() => mediaInputRef.current?.click()}
                  className={`shrink-0 w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                    pendingMedia && pendingMedia.mediaType !== 'gif'
                      ? 'bg-[#F0EBFF] border-[#5420F5]/40 text-[#5420F5]'
                      : 'bg-[#FAF9FC] border-[#EAE6F0] text-[#5420F5] hover:bg-[#F0EBFF]'
                  } disabled:opacity-50`}
                  title="Upload photo or video"
                >
                  {isUploadingMedia ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImagePlus className="w-4 h-4" />
                  )}
                </button>

                {/* Klipy GIF Picker Trigger Button */}
                <button
                  type="button"
                  onClick={() => {
                    inputRef.current?.blur();
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                    roomMention.dismiss();
                    setShowGifPicker(true);
                  }}
                  className={`shrink-0 h-8 px-2 rounded-xl border text-[10px] font-black tracking-wide flex items-center justify-center transition-all cursor-pointer ${
                    pendingMedia?.mediaType === 'gif'
                      ? 'bg-[#5420F5] border-[#5420F5] text-white'
                      : 'bg-[#FAF9FC] border-[#EAE6F0] text-[#5420F5] hover:bg-[#F0EBFF]'
                  }`}
                  title="Attach a GIF from Klipy"
                >
                  GIF
                </button>

                {/* @Mention Picker Button */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={roomMention.togglePicker}
                  className={`shrink-0 w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                    roomMention.isOpen
                      ? 'bg-[#5420F5] border-[#5420F5] text-white'
                      : 'bg-[#FAF9FC] border-[#EAE6F0] text-[#5420F5] hover:bg-[#F0EBFF]'
                  }`}
                  title="Mention a student (@)"
                  aria-label="Mention a student"
                >
                  <AtSign className="w-4 h-4" />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={messageText}
                  onChange={roomMention.handleChange}
                  onClick={(e) => roomMention.syncCursorFromEvent(e.currentTarget)}
                  onKeyUp={(e) => roomMention.syncCursorFromEvent(e.currentTarget)}
                  onSelect={(e) => roomMention.syncCursorFromEvent(e.currentTarget)}
                  onPaste={handlePasteMedia}
                  placeholder={
                    pendingMedia
                      ? `Add a caption as ${effectiveAlias} (optional)...`
                      : activeRoom.isLocked
                      ? `Message locked room as Admin (${effectiveAlias})...`
                      : `Message as ${effectiveAlias}...`
                  }
                  className="flex-1 min-w-0 px-1.5 py-1.5 bg-transparent text-base sm:text-sm text-[#191525] placeholder:text-slate-400 focus:outline-none"
                />

                <button
                  type="submit"
                  disabled={(!messageText.trim() && !pendingMedia) || isUploadingMedia}
                  className="p-2.5 bg-[#5420F5] hover:bg-[#4314E2] text-white rounded-xl transition-all cursor-pointer disabled:opacity-40 shadow-xs active:scale-95 shrink-0"
                  title="Send to anonymous room"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        )
      ) : (
        <div
          onClick={() => {
            showToast('Please sign in to join & chat in rooms.', 'info');
            setActiveView('profile');
          }}
          className="shrink-0 bg-white border border-[#5420F5]/25 rounded-2xl p-2 pl-3.5 shadow-md flex items-center justify-between gap-2 min-w-0 cursor-pointer hover:border-[#5420F5]/50 transition-all"
        >
          <span className="text-xs font-bold text-[#706B7D] truncate min-w-0 flex-1">
            Sign in to join &amp; chat anonymously in this room
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveView('profile');
            }}
            className="px-3.5 py-2 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black rounded-xl transition-all cursor-pointer shrink-0 shadow-xs"
          >
            Sign In
          </button>
        </div>
      )}

      {/* 8. Required Custom Persona Modal (Mandatory when all 10 aliases are filled) */}
      <RequiredCustomPersonaModal
        isOpen={showRequiredCustomModal}
        roomName={activeRoom.name}
        roomId={activeRoom.id}
        onConfirm={handleConfirmCustomPersona}
        onCancel={handleCancelCustomPersona}
        existingAliasesInRoom={Object.values(activeRoom.assignedPersonas || {}).map((p) => p.alias)}
      />

      {/* Klipy GIF Picker Modal */}
      <KlipyGifPicker
        isOpen={showGifPicker}
        customerId={user.id || user.username || 'bopoi_student'}
        onSelect={(gif) => {
          setPendingMedia({
            mediaUrl: gif.url,
            mediaType: 'gif',
            fileName: gif.title || 'klipy.gif',
          });
          setTimeout(() => inputRef.current?.focus(), 40);
        }}
        onClose={() => setShowGifPicker(false)}
      />

      {/* 9. Room Aliases & Personas Directory Modal */}
      {showRosterModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0E0C14] rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-[#EAE6F0] dark:border-[#262036] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#EAE6F0] dark:border-[#262036] flex items-center justify-between shrink-0 bg-gradient-to-r from-[#FAF9FC] to-white dark:from-[#171322] dark:to-[#0E0C14]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#171322] border border-[#5420F5]/25 flex items-center justify-center p-1 shadow-xs shrink-0">
                  <PersonaMaskIcon mask={effectiveMaskId} size={28} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-[#191525] dark:text-[#F4F2FA] truncate">
                    Room Aliases
                  </h3>
                  <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] truncate">
                    #{activeRoom.name} · Anonymous members directory
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRosterModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#171322] text-slate-400 hover:text-black dark:hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto space-y-3.5">
              {/* Unlimited Room Banner */}
              <div className="px-3 py-2 rounded-xl bg-purple-50/70 dark:bg-[#231A45] border border-[#5420F5]/20 flex items-center gap-2 text-[11px] text-[#5420F5] dark:text-[#B9A7FF] font-semibold">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Unlimited room capacity — unlimited students can join!</span>
              </div>

              {/* Your Permanent Persona Banner */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-[#F0EBFF] to-white dark:from-[#231A45] dark:to-[#171322] border border-[#5420F5]/30 flex items-center gap-3 shadow-xs">
                <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#0E0C14] border border-[#5420F5]/20 flex items-center justify-center p-1 shrink-0">
                  <PersonaMaskIcon mask={effectiveMaskId} size={30} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-[#191525] dark:text-[#F4F2FA] truncate">
                      {effectiveAlias}
                    </span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-[#5420F5] text-white shrink-0">
                      You ({assignedPersona?.isCustom ? 'Custom' : 'Default'})
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-[#9E97B3] mt-0.5 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 shrink-0" />
                    <span>Preserved across visits until this room is deleted</span>
                  </p>
                </div>
              </div>

              {/* 10 Default Aliases Grid */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-[#191525] dark:text-[#F4F2FA]">
                    The 10 Default Aliases
                  </h4>
                  <span className="text-[10px] text-slate-500 dark:text-[#9E97B3] font-bold">
                    Auto-assigned to first 10 members
                  </span>
                </div>

                <div className="space-y-1.5">
                  {ROOM_PRESET_ALIASES.map((preset) => {
                    const assignedUser = Object.values(activeRoom.assignedPersonas || {}).find(
                      (a) => !a.isCustom && (a.maskId === preset.id || a.alias.toLowerCase() === preset.name.toLowerCase())
                    );
                    const isCurrentUser = assignedUser?.userId === user.id;

                    return (
                      <div
                        key={preset.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all ${
                          isCurrentUser
                            ? 'bg-[#F0EBFF] dark:bg-[#231A45] border-[#5420F5] shadow-xs'
                            : assignedUser
                            ? 'bg-slate-50 dark:bg-[#171322] border-slate-200 dark:border-[#262036]'
                            : 'bg-white dark:bg-[#0E0C14] border-dashed border-slate-200 dark:border-[#262036]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#171322] border border-slate-200 dark:border-[#262036] flex items-center justify-center p-0.5 shrink-0">
                            <PersonaMaskIcon mask={preset.id} size={24} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-[#191525] dark:text-[#F4F2FA] truncate">
                              {preset.name}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-[#9E97B3] truncate">
                              {preset.tagline}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isCurrentUser ? (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#5420F5] text-white">
                              Your Alias
                            </span>
                          ) : assignedUser ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-[#262036] text-slate-600 dark:text-[#9E97B3]">
                              In Use
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                              Available
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Personas in this room */}
              {Object.values(activeRoom.assignedPersonas || {}).some((a) => a.isCustom) && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-[#262036]">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-[#191525] dark:text-[#F4F2FA]">
                      Custom Chatters in this Room
                    </h4>
                    <span className="text-[10px] text-slate-500 dark:text-[#9E97B3] font-bold">
                      {Object.values(activeRoom.assignedPersonas || {}).filter((a) => a.isCustom).length} custom
                    </span>
                  </div>
                  <div className="space-y-1">
                    {Object.values(activeRoom.assignedPersonas || {})
                      .filter((a) => a.isCustom)
                      .map((custom) => (
                        <div
                          key={custom.userId}
                          className="p-2 rounded-xl bg-purple-50/50 dark:bg-[#231A45]/60 border border-purple-200 dark:border-[#5420F5]/30 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <PersonaMaskIcon mask={custom.maskId} size={20} />
                            <span className="font-bold text-[#191525] dark:text-[#F4F2FA] truncate">{custom.alias}</span>
                          </div>
                          <span className="text-[9px] font-bold text-purple-700 dark:text-[#B9A7FF] shrink-0">Custom Alias</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 dark:border-[#262036] bg-[#FAF9FC] dark:bg-[#171322] flex justify-end">
              <button
                type="button"
                onClick={() => setShowRosterModal(false)}
                className="px-4 py-2 rounded-xl bg-[#5420F5] text-white text-xs font-black shadow-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Room Icon Modal (Creator & Admin) */}
      <EditRoomIconModal
        isOpen={showEditIconModal}
        onClose={() => setShowEditIconModal(false)}
        roomName={activeRoom.name}
        category={activeRoom.category}
        currentIconEmoji={activeRoom.iconEmoji || 'svg:campus-life'}
        currentIconBg={activeRoom.iconBg || '#5420F5'}
        onSave={(nextEmoji, nextBg) => {
          updateRoomIcon(activeRoom.id, nextEmoji, nextBg);
        }}
      />

      {/* Fullscreen Image Lightbox Modal */}
      {lightboxImageUrl && (
        <div
          onClick={() => setLightboxImageUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <button
            type="button"
            onClick={() => setLightboxImageUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Close image preview"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxImageUrl}
            alt="Room full view"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[88vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
