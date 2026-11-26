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
  Info,
  Share2,
  Trash2,
  CornerDownRight,
  X,
  Lock,
  RefreshCw,
  ImagePlus,
  Film,
  Loader2,
  ArrowDown,
  AtSign,
  SmilePlus,
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
  const [openReactionMsgId, setOpenReactionMsgId] = useState<string | null>(null);

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
      } else if (openReactionMsgId) {
        e.preventDefault();
        setOpenReactionMsgId(null);
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
    openReactionMsgId,
    roomMention.isOpen,
    roomMention.dismiss,
    replyingTo,
  ]);

  if (!activeRoom) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4 bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA] rounded-3xl">
        <div className="w-12 h-12 rounded-2xl bg-[#F0EBFF] dark:bg-[#231A45] text-[#5420F5] dark:text-[#B9A7FF] flex items-center justify-center mx-auto">
          <Users2 className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-black text-[#191525] dark:text-[#F4F2FA]">Room not available</h2>
          <p className="text-xs text-[#706B7D] dark:text-[#9E97B3]">
            This room may still be loading or may have been removed.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView('rooms')}
            className="min-h-[44px] px-4 py-2 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black rounded-xl cursor-pointer transition-colors"
          >
            Browse All Rooms
          </button>
          <button
            type="button"
            onClick={() => goBack('home')}
            className="min-h-[44px] px-4 py-2 bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-[#191525] dark:text-[#F4F2FA] text-xs font-bold rounded-xl cursor-pointer hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] transition-colors"
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
      {/* 1. Clean Chat Header */}
      <div className="flex items-center justify-between py-2.5 border-b border-[#EFEFF4] dark:border-[#211C2E] shrink-0 bg-white/95 dark:bg-[#0E0C14]/95 backdrop-blur-md z-20 gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => goBack('rooms')}
            className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] -ml-1.5 rounded-full hover:bg-[#F4F3F7] dark:hover:bg-[#191625] text-[#191525] dark:text-[#F4F2FA] transition-colors cursor-pointer flex items-center justify-center shrink-0"
            title="Go back"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {canEditRoomIcon ? (
            <button
              type="button"
              onClick={() => setShowEditIconModal(true)}
              title="Change room icon"
              className="relative group cursor-pointer shrink-0 rounded-2xl focus:outline-none"
            >
              <RoomBadgeIcon
                iconEmoji={activeRoom.iconEmoji}
                iconBg={activeRoom.iconBg}
                category={activeRoom.category}
                roomName={activeRoom.name}
                size="sm"
                className="group-hover:opacity-90 transition-opacity"
              />
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

          <button
            type="button"
            onClick={() => setShowRoomInfo((prev) => !prev)}
            className="min-w-0 flex-1 text-left cursor-pointer group"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className="text-[14px] sm:text-[15px] font-extrabold text-[#191525] dark:text-[#F4F2FA] truncate">
                #{activeRoom.name}
              </h1>
              {activeRoom.isLocked && (
                <Lock className="w-3 h-3 text-rose-500 shrink-0" />
              )}
            </div>
            <p className="text-[11.5px] text-[#706B7D] dark:text-[#9E97B3] truncate tabular-nums">
              {activeRoom.onlineCount ?? 0} online · {activeRoom.membersCount}{' '}
              {activeRoom.membersCount === 1 ? 'member' : 'members'}
              {activeRoom.description ? ` · ${activeRoom.description}` : ''}
            </p>
          </button>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {connectionStatus !== 'connected' && (
            <button
              type="button"
              onClick={reconnectRealtime}
              title="Reconnect chat"
              className="min-h-[36px] px-2 rounded-full text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:bg-[#F4F3F7] dark:hover:bg-[#191625] transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <RefreshCw
                className={`w-3 h-3 ${connectionStatus === 'reconnecting' ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">
                {connectionStatus === 'reconnecting' ? 'Syncing' : 'Retry'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleShareRoom}
            className="min-w-[40px] min-h-[40px] sm:min-w-[36px] sm:min-h-[36px] rounded-full hover:bg-[#F4F3F7] dark:hover:bg-[#191625] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] transition-colors cursor-pointer flex items-center justify-center"
            title="Share room link"
            aria-label="Share room link"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowRoomInfo(!showRoomInfo)}
            className={`min-w-[40px] min-h-[40px] sm:min-w-[36px] sm:min-h-[36px] rounded-full transition-colors cursor-pointer flex items-center justify-center ${
              showRoomInfo
                ? 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525]'
                : 'hover:bg-[#F4F3F7] dark:hover:bg-[#191625] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
            }`}
            title="Room info"
            aria-label="Room info"
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => toggleJoinRoom(activeRoom.id)}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-bold transition-opacity cursor-pointer shrink-0 ml-0.5 ${
              activeRoom.isJoined
                ? 'bg-[#F4F3F7] dark:bg-[#1A1726] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                : 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525] hover:opacity-90'
            }`}
          >
            {activeRoom.isJoined ? (
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3 stroke-[2.5]" />
                <span>Joined</span>
              </span>
            ) : (
              <span>Join</span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Collapsible Room Details Sheet (Hidden by default so chat takes center stage) */}
      {showRoomInfo && (
        <div className="mt-2 p-3.5 rounded-2xl bg-[#F5F4F8] dark:bg-[#161320] space-y-2.5 shrink-0 animate-in fade-in duration-150">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#191525] dark:text-[#F4F2FA]">
                <Shield className="w-3.5 h-3.5 text-[#706B7D] dark:text-[#9E97B3]" />
                <span>About #{activeRoom.name}</span>
              </div>
              <p className="text-[13px] text-[#4A4558] dark:text-[#C5BFD6] leading-relaxed break-words">
                {activeRoom.description || 'Masked campus conversation'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRoomInfo(false)}
              className="min-w-[32px] min-h-[32px] rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#706B7D] dark:text-[#9E97B3] flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Close room info"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 text-[11.5px] text-[#706B7D] dark:text-[#9E97B3] flex-wrap pt-1">
            <span>
              Anonymous · {activeRoom.category}
              {activeRoom.creatorAlias ? ` · Host ${activeRoom.creatorAlias}` : ''}
            </span>

            <div className="flex items-center gap-3">
              {canEditRoomIcon && (
                <button
                  type="button"
                  onClick={() => setShowEditIconModal(true)}
                  className="font-semibold text-[#191525] dark:text-[#F4F2FA] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ImagePlus className="w-3 h-3" />
                  <span>Change icon</span>
                </button>
              )}
              {isCreator && (
                <button
                  type="button"
                  onClick={() => deleteRoom(activeRoom.id)}
                  className="text-rose-600 dark:text-rose-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Messages Stream (Grouped, calm bubbles) */}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        onClick={() => {
          if (openReactionMsgId) setOpenReactionMsgId(null);
        }}
        className="flex-1 min-h-0 overflow-y-auto py-3 pr-1 relative"
      >
        {!activeRoom.messages || activeRoom.messages.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3 my-4">
            <div className="w-12 h-12 rounded-2xl bg-[#F4F3F7] dark:bg-[#171422] mx-auto flex items-center justify-center p-1.5">
              <PersonaMaskIcon mask="masked-student" size={30} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#191525] dark:text-[#F4F2FA]">
                #{activeRoom.name}
              </h3>
              <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] max-w-xs mx-auto leading-relaxed">
                Quiet in here right now. Say hello behind your mask to start the thread.
              </p>
            </div>
            <div className="pt-1 flex flex-wrap justify-center gap-2">
              {[
                'Hey everyone',
                'What is everyone up to?',
                'Anyone awake right now?',
              ].map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => {
                    setMessageText(starter);
                    inputRef.current?.focus();
                  }}
                  className="px-3.5 py-2 rounded-full bg-[#F4F3F7] dark:bg-[#171422] hover:bg-[#EAE7F2] dark:hover:bg-[#211C2E] text-xs font-semibold text-[#191525] dark:text-[#E7E3F3] transition-colors cursor-pointer"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {activeRoom.messages.map((msg, msgIdx) => {
              const isMe =
                msg.authorUsername === user.username && !msg.isAnonymous;
              const prevMsg = msgIdx > 0 ? activeRoom.messages?.[msgIdx - 1] : null;
              const nextMsg =
                msgIdx < (activeRoom.messages?.length || 0) - 1
                  ? activeRoom.messages?.[msgIdx + 1]
                  : null;

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

              const isSameSenderAsPrev = Boolean(
                prevMsg &&
                  !showDayDivider &&
                  prevMsg.isAnonymous === msg.isAnonymous &&
                  (prevMsg.authorUsername || prevMsg.authorName) ===
                    (msg.authorUsername || msg.authorName) &&
                  prevMsg.authorName === msg.authorName &&
                  Math.abs((msg.createdTimestamp || 0) - (prevMsg.createdTimestamp || 0)) <
                    5 * 60 * 1000
              );

              const isSameSenderAsNext = Boolean(
                nextMsg &&
                  nextMsg.isAnonymous === msg.isAnonymous &&
                  (nextMsg.authorUsername || nextMsg.authorName) ===
                    (msg.authorUsername || msg.authorName) &&
                  nextMsg.authorName === msg.authorName &&
                  Math.abs((nextMsg.createdTimestamp || 0) - (msg.createdTimestamp || 0)) <
                    5 * 60 * 1000
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

              const hasReactions =
                msg.reactions &&
                Object.values(msg.reactions).some((count) => count > 0);
              const isPickerOpen = openReactionMsgId === msg.id;

              return (
                <React.Fragment key={msg.id}>
                  {showDayDivider && msgDate && (
                    <div className="flex items-center gap-3 py-3 select-none">
                      <div className="flex-1 h-px bg-[#EFEFF4] dark:bg-[#211C2E]" />
                      <span className="text-[11px] font-semibold text-[#7A748A] dark:text-[#8E87A3] tabular-nums">
                        {formatDayLabel(msgDate)}
                      </span>
                      <div className="flex-1 h-px bg-[#EFEFF4] dark:bg-[#211C2E]" />
                    </div>
                  )}

                  <div
                    ref={(el) => {
                      messageRefs.current[msg.id] = el;
                    }}
                    className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''} ${
                      isSameSenderAsPrev ? 'mt-0.5' : 'mt-3'
                    } group min-w-0 rounded-2xl transition-colors duration-300 ${
                      highlightedMessageId === msg.id
                        ? 'animate-reply-flash bg-[#F0EBFF]/75 dark:bg-[#231A45]/75 p-1.5 -m-1.5'
                        : ''
                    }`}
                  >
                    {/* Author Avatar (shown on last message of a grouped run, like iMessage/Telegram) */}
                    <div className="w-8 shrink-0 flex justify-center">
                      {!isSameSenderAsNext ? (
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
                          className={!msg.isAnonymous ? 'cursor-pointer hover:opacity-85' : ''}
                          title={
                            msg.isAnonymous
                              ? msg.authorName
                              : `View ${msg.authorName}'s profile`
                          }
                        >
                          {msg.isAnonymous ? (
                            <div className="w-8 h-8 rounded-full bg-[#F4F3F7] dark:bg-[#191625] flex items-center justify-center select-none p-0.5">
                              <PersonaMaskIcon
                                mask={msg.authorMaskEmoji || msg.authorName || 'masked-student'}
                                size={22}
                              />
                            </div>
                          ) : (
                            <CampusCharacterAvatar
                              value={msg.authorAvatar}
                              seed={msg.authorUsername}
                              size={32}
                              rounded="full"
                            />
                          )}
                        </div>
                      ) : null}
                    </div>

                    {/* Message Column */}
                    <div
                      className={`max-w-[82%] sm:max-w-[74%] min-w-0 flex flex-col ${
                        isMe ? 'items-end' : 'items-start'
                      }`}
                    >
                      {/* Sender Name above first bubble in a group */}
                      {!isSameSenderAsPrev && !isMe && (
                        <div className="flex items-center gap-1.5 px-1 pb-1 text-[11px] min-w-0">
                          <span className="font-bold text-[#191525] dark:text-[#F4F2FA] truncate">
                            {msg.authorName}
                          </span>
                          <span className="text-[#8E87A3] tabular-nums shrink-0">
                            {msg.createdAt}
                          </span>
                        </div>
                      )}

                      {/* Bubble */}
                      <div
                        className={`min-w-0 rounded-2xl px-3.5 py-2.5 space-y-1.5 relative overflow-hidden ${
                          isMe
                            ? 'bg-[#5420F5] text-white'
                            : 'bg-[#F3F2F7] dark:bg-[#181523] text-[#191525] dark:text-[#F4F2FA]'
                        }`}
                      >
                        {msg.replyTo && (
                          <button
                            type="button"
                            onClick={jumpToQuotedOriginal}
                            className={`w-full text-left py-1.5 px-2.5 rounded-xl text-[11px] mb-1 transition-opacity hover:opacity-85 cursor-pointer ${
                              isMe
                                ? 'bg-white/15 text-white/95'
                                : 'bg-white/80 dark:bg-[#0E0C14]/70 text-[#5F5970] dark:text-[#A9A2BD]'
                            }`}
                            title="Jump to original message"
                          >
                            <span className="block truncate font-bold">
                              {msg.replyTo.authorName}
                            </span>
                            <span className="line-clamp-1 break-words opacity-90">
                              {msg.replyTo.text}
                            </span>
                          </button>
                        )}

                        {msg.mediaUrl && (
                          <div className="pt-0.5">
                            {msg.mediaType === 'video' ||
                            msg.mediaUrl.startsWith('data:video/') ||
                            /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(msg.mediaUrl) ? (
                              <div className="rounded-xl overflow-hidden bg-black/95 max-h-72">
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
                                className="block w-full rounded-xl overflow-hidden bg-black/5 cursor-pointer focus:outline-none"
                                title="View full image"
                              >
                                <img
                                  src={msg.mediaUrl}
                                  alt={msg.text || 'Room photo'}
                                  loading="lazy"
                                  className="w-full max-h-72 object-cover"
                                />
                              </button>
                            )}
                          </div>
                        )}

                        {msg.text && (
                          <p className="text-[13.5px] leading-[1.45] select-text whitespace-pre-wrap break-words">
                            <MentionText
                              text={msg.text}
                              tone={isMe ? 'inverted' : 'default'}
                            />
                          </p>
                        )}

                        {isMe && !isSameSenderAsPrev && (
                          <span className="block text-[10px] text-white/70 text-right tabular-nums pt-0.5">
                            {msg.createdAt}
                          </span>
                        )}
                      </div>

                      {/* Existing Reactions + Quiet Action Row */}
                      <div
                        className={`flex items-center gap-1.5 flex-wrap px-1 pt-1 ${
                          isMe ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {hasReactions &&
                          Object.entries(msg.reactions!).map(([emoji, count]) => {
                            if (count <= 0) return null;
                            const hasReacted = msg.userReactions?.[emoji];
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() =>
                                  addRoomMessageReaction(activeRoom.id, msg.id, emoji)
                                }
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors tabular-nums ${
                                  hasReacted
                                    ? 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525]'
                                    : 'bg-[#F4F3F7] dark:bg-[#191625] text-[#4A4558] dark:text-[#CFC9DE] hover:bg-[#EAE7F2] dark:hover:bg-[#231F33]'
                                }`}
                              >
                                <span>{emoji}</span>
                                <span>{count}</span>
                              </button>
                            );
                          })}

                        {/* Subtle inline actions: Like, Reply, React */}
                        <div
                          className={`inline-flex items-center gap-1 transition-opacity ${
                            msg.likes > 0 || isPickerOpen
                              ? 'opacity-100'
                              : 'opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleRoomMessageLike(activeRoom.id, msg.id)}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full transition-colors cursor-pointer ${
                              msg.hasLiked
                                ? 'text-[#F52D85]'
                                : 'text-[#8E87A3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                            }`}
                            aria-label="Like message"
                          >
                            <Heart
                              className={`w-3 h-3 ${
                                msg.hasLiked ? 'fill-[#F52D85] text-[#F52D85]' : ''
                              }`}
                            />
                            {msg.likes > 0 && <span className="tabular-nums">{msg.likes}</span>}
                          </button>

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
                            className="text-[11px] font-semibold text-[#8E87A3] hover:text-[#191525] dark:hover:text-[#F4F2FA] px-1.5 py-0.5 rounded-full cursor-pointer inline-flex items-center gap-1"
                            title="Reply"
                          >
                            <CornerDownRight className="w-3 h-3" />
                            <span>Reply</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenReactionMsgId((curr) =>
                                curr === msg.id ? null : msg.id
                              );
                            }}
                            className={`p-1 rounded-full transition-colors cursor-pointer ${
                              isPickerOpen
                                ? 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525]'
                                : 'text-[#8E87A3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                            }`}
                            title="Add reaction"
                            aria-label="Add reaction"
                          >
                            <SmilePlus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* On-demand 6-emoji reaction tray */}
                      {isPickerOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 inline-flex items-center gap-0.5 px-2 py-1 rounded-full bg-white dark:bg-[#191625] border border-[#EAE6F0] dark:border-[#262036] shadow-md animate-in fade-in zoom-in-95 duration-100"
                        >
                          {EMOJI_REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                addRoomMessageReaction(activeRoom.id, msg.id, emoji);
                                setOpenReactionMsgId(null);
                              }}
                              className="w-7 h-7 flex items-center justify-center text-sm hover:scale-125 transition-transform cursor-pointer rounded-full"
                              title={`React ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Jump-to-latest Pill */}
      {isScrolledUp && (activeRoom.messages?.length || 0) > 4 && (
        <div className="shrink-0 flex justify-center -mt-9 mb-2 z-20 pointer-events-none">
          <button
            type="button"
            onClick={scrollToLatestMessages}
            className="pointer-events-auto px-3.5 py-1.5 rounded-full bg-[#191525]/92 dark:bg-[#F4F2FA]/95 text-white dark:text-[#191525] text-[11px] font-bold shadow-lg backdrop-blur-md transition-opacity cursor-pointer inline-flex items-center gap-1.5"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>
              {unreadWhileScrolledUp > 0
                ? `${unreadWhileScrolledUp} new`
                : 'Latest'}
            </span>
          </button>
        </div>
      )}

      {/* 4. Active Reply Bar */}
      {replyingTo && (
        <div className="shrink-0 mb-1.5 py-1.5 px-3 rounded-xl bg-[#F4F3F7] dark:bg-[#171422] flex items-center justify-between gap-2 text-xs min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <CornerDownRight className="w-3.5 h-3.5 text-[#5420F5] dark:text-[#B9A7FF] shrink-0" />
            <span className="truncate text-[#4A4558] dark:text-[#CFC9DE]">
              Replying to{' '}
              <strong className="text-[#191525] dark:text-[#F4F2FA]">
                {replyingTo.authorName}
              </strong>{' '}
              ·{' '}
              {replyingTo.text ||
                (replyingTo.mediaType === 'video'
                  ? 'Video'
                  : replyingTo.mediaType === 'gif'
                  ? 'GIF'
                  : replyingTo.mediaUrl
                  ? 'Photo'
                  : '')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-white p-1 cursor-pointer shrink-0"
            title="Cancel reply"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isLoggedIn ? (
        activeRoom.isLocked && !isAdminUnlocked ? (
          <div className="shrink-0 bg-[#F5F4F8] dark:bg-[#161320] rounded-2xl p-3 flex items-center gap-2 text-xs text-[#706B7D] dark:text-[#9E97B3]">
            <Lock className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="font-semibold truncate">
              This room is locked by moderators.
            </span>
          </div>
        ) : (
          <div className="shrink-0 pt-1 space-y-1.5">
            {/* Compact Identity Line */}
            <div className="flex items-center justify-between gap-2 px-1 text-[11.5px] min-w-0">
              <button
                type="button"
                onClick={() => setShowRosterModal(true)}
                className="inline-flex items-center gap-1.5 min-w-0 text-[#5F5970] dark:text-[#A9A2BD] hover:text-[#191525] dark:hover:text-[#F4F2FA] transition-colors cursor-pointer"
                title="View room aliases"
              >
                <PersonaMaskIcon
                  mask={effectiveIsAnonymous ? effectiveMaskId : 'public-profile'}
                  size={16}
                />
                <span className="truncate font-semibold">
                  {effectiveAlias}
                </span>
                <span className="text-[#8E87A3] shrink-0">· Aliases</span>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                {isAdminUnlocked && (
                  <button
                    type="button"
                    onClick={() =>
                      adminUpdateRoom(activeRoom.id, { isLocked: !activeRoom.isLocked })
                    }
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1 ${
                      activeRoom.isLocked
                        ? 'bg-rose-600 text-white'
                        : 'bg-[#F4F3F7] dark:bg-[#171422] text-[#706B7D] dark:text-[#9E97B3] hover:text-rose-600'
                    }`}
                  >
                    <Lock className="w-2.5 h-2.5" />
                    <span>{activeRoom.isLocked ? 'Unlock' : 'Lock'}</span>
                  </button>
                )}

                {!activeRoom.isAnonymousOnly && (
                  <button
                    type="button"
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                      effectiveIsAnonymous
                        ? 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525]'
                        : 'bg-[#F4F3F7] dark:bg-[#171422] text-[#706B7D] dark:text-[#9E97B3]'
                    }`}
                  >
                    {effectiveIsAnonymous ? 'Mask On' : 'Public'}
                  </button>
                )}
              </div>
            </div>

            {/* Pending Image / Video Attachment Preview */}
            {(pendingMedia || isUploadingMedia) && (
              <div className="p-2 px-3 rounded-2xl bg-[#F4F3F7] dark:bg-[#171422] flex items-center justify-between gap-2.5">
                {isUploadingMedia ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#5F5970] dark:text-[#A9A2BD]">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Uploading media...</span>
                  </div>
                ) : pendingMedia ? (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {pendingMedia.mediaType === 'video' ? (
                        <div className="w-11 h-11 rounded-xl bg-slate-900 overflow-hidden shrink-0 relative flex items-center justify-center">
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
                          className="w-11 h-11 rounded-xl object-cover shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#191525] dark:text-[#F4F2FA] truncate">
                          {pendingMedia.mediaType === 'video'
                            ? 'Video attached'
                            : pendingMedia.mediaType === 'gif'
                            ? 'GIF attached'
                            : 'Photo attached'}
                        </p>
                        <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] truncate">
                          Add a message or send
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingMedia(null)}
                      className="min-w-[36px] min-h-[36px] rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#706B7D] dark:text-[#9E97B3] hover:text-rose-600 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                      title="Remove attachment"
                      aria-label="Remove attachment"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : null}
              </div>
            )}

            {/* Single Cohesive Composer Bar */}
            <div className="relative">
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
                className="bg-[#F4F3F7] dark:bg-[#171422] rounded-2xl p-1.5 pl-2 flex items-center gap-1 min-w-0"
              >
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="image/*,video/*,.mp4,.webm,.mov,.m4v,.heic,.heif"
                  className="hidden"
                  onChange={(e) => handleMediaFileSelected(e.target.files?.[0])}
                />

                <button
                  type="button"
                  disabled={isUploadingMedia}
                  onClick={() => mediaInputRef.current?.click()}
                  className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                    pendingMedia && pendingMedia.mediaType !== 'gif'
                      ? 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525]'
                      : 'text-[#5F5970] dark:text-[#9E97B3] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                  } disabled:opacity-50`}
                  title="Attach photo or video"
                  aria-label="Attach photo or video"
                >
                  {isUploadingMedia ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImagePlus className="w-4 h-4" />
                  )}
                </button>

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
                  className={`shrink-0 h-9 px-2 rounded-xl text-[11px] font-extrabold tracking-wide flex items-center justify-center transition-colors cursor-pointer ${
                    pendingMedia?.mediaType === 'gif'
                      ? 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525]'
                      : 'text-[#5F5970] dark:text-[#9E97B3] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                  }`}
                  title="Add a GIF"
                >
                  GIF
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={roomMention.togglePicker}
                  className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                    roomMention.isOpen
                      ? 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525]'
                      : 'text-[#5F5970] dark:text-[#9E97B3] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                  }`}
                  title="Mention someone (@)"
                  aria-label="Mention someone"
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
                      ? 'Add a caption...'
                      : activeRoom.isLocked
                      ? `Message as ${effectiveAlias}...`
                      : `Message #${activeRoom.name}`
                  }
                  className="flex-1 min-w-0 px-2 py-1.5 bg-transparent text-base sm:text-sm text-[#191525] dark:text-[#F4F2FA] placeholder:text-[#7E788E] dark:placeholder:text-[#7D7594] focus:outline-none"
                />

                <button
                  type="submit"
                  disabled={(!messageText.trim() && !pendingMedia) || isUploadingMedia}
                  className="min-w-[38px] min-h-[38px] p-2 bg-[#5420F5] hover:bg-[#4314E2] text-white rounded-xl transition-opacity cursor-pointer disabled:opacity-35 shrink-0 flex items-center justify-center"
                  title="Send message"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )
      ) : (
        <div
          onClick={() => {
            showToast('Please sign in to join & chat in rooms.', 'info');
            setActiveView('profile');
          }}
          className="shrink-0 bg-[#F4F3F7] dark:bg-[#171422] rounded-2xl p-2 pl-4 flex items-center justify-between gap-2 min-w-0 cursor-pointer"
        >
          <span className="text-xs font-semibold text-[#706B7D] dark:text-[#9E97B3] truncate min-w-0 flex-1">
            Sign in to join &amp; chat in #{activeRoom.name}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveView('profile');
            }}
            className="min-h-[40px] px-4 py-1.5 bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525] text-xs font-bold rounded-xl cursor-pointer shrink-0"
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

      {/* 9. Room Aliases Modal */}
      {showRosterModal && (
        <div
          onClick={() => setShowRosterModal(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/55 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0E0C14] rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-[#EAE6F0] dark:border-[#262036] animate-in zoom-in-95 duration-150"
          >
            <div className="w-10 h-1 bg-[#EAE6F0] dark:bg-[#262036] rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

            {/* Header */}
            <div className="px-5 py-4 border-b border-[#EFEFF4] dark:border-[#211C2E] flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-[#191525] dark:text-[#F4F2FA] truncate">
                  Room Aliases
                </h3>
                <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] truncate">
                  #{activeRoom.name} · Anonymous masks in this room
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRosterModal(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-[#F4F3F7] dark:hover:bg-[#191625] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-white cursor-pointer shrink-0 -mr-2"
                aria-label="Close room aliases"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-5">
              {/* Your Current Persona */}
              <div className="p-3.5 rounded-2xl bg-[#F5F4F8] dark:bg-[#161320] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-[#0E0C14] flex items-center justify-center p-1 shrink-0">
                  <PersonaMaskIcon mask={effectiveMaskId} size={28} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#191525] dark:text-[#F4F2FA] truncate">
                      {effectiveAlias}
                    </span>
                    <span className="text-[11px] font-bold text-[#5420F5] dark:text-[#B9A7FF] shrink-0">
                      You
                    </span>
                  </div>
                  <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] mt-0.5 truncate">
                    Locked for your visits in #{activeRoom.name}
                  </p>
                </div>
              </div>

              {/* Default Aliases */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <h4 className="text-xs font-extrabold text-[#191525] dark:text-[#F4F2FA]">
                    Default Aliases
                  </h4>
                  <span className="text-[11px] text-[#706B7D] dark:text-[#9E97B3]">
                    First 10 members
                  </span>
                </div>

                <div className="divide-y divide-[#EFEFF4] dark:divide-[#211C2E]">
                  {ROOM_PRESET_ALIASES.map((preset) => {
                    const assignedUser = Object.values(activeRoom.assignedPersonas || {}).find(
                      (a) =>
                        !a.isCustom &&
                        (a.maskId === preset.id ||
                          a.alias.toLowerCase() === preset.name.toLowerCase())
                    );
                    const isCurrentUser = assignedUser?.userId === user.id;

                    return (
                      <div
                        key={preset.id}
                        className="py-2.5 flex items-center justify-between gap-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#F4F3F7] dark:bg-[#171422] flex items-center justify-center p-0.5 shrink-0">
                            <PersonaMaskIcon mask={preset.id} size={22} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#191525] dark:text-[#F4F2FA] truncate">
                              {preset.name}
                            </p>
                            <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] truncate">
                              {preset.tagline}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[11px] font-semibold shrink-0 ${
                            isCurrentUser
                              ? 'text-[#5420F5] dark:text-[#B9A7FF] font-bold'
                              : assignedUser
                              ? 'text-[#706B7D] dark:text-[#9E97B3]'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {isCurrentUser
                            ? 'Yours'
                            : assignedUser
                            ? 'Taken'
                            : 'Open'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Personas in this room */}
              {Object.values(activeRoom.assignedPersonas || {}).some((a) => a.isCustom) && (
                <div className="space-y-2 pt-2 border-t border-[#EFEFF4] dark:border-[#211C2E]">
                  <div className="flex items-baseline justify-between">
                    <h4 className="text-xs font-extrabold text-[#191525] dark:text-[#F4F2FA]">
                      Custom Aliases
                    </h4>
                    <span className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] tabular-nums">
                      {
                        Object.values(activeRoom.assignedPersonas || {}).filter(
                          (a) => a.isCustom
                        ).length
                      }
                    </span>
                  </div>
                  <div className="divide-y divide-[#EFEFF4] dark:divide-[#211C2E]">
                    {Object.values(activeRoom.assignedPersonas || {})
                      .filter((a) => a.isCustom)
                      .map((custom) => (
                        <div
                          key={custom.userId}
                          className="py-2 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <PersonaMaskIcon mask={custom.maskId} size={20} />
                            <span className="font-semibold text-[#191525] dark:text-[#F4F2FA] truncate">
                              {custom.alias}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] shrink-0">
                            Custom
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-[#EFEFF4] dark:border-[#211C2E] flex justify-end">
              <button
                type="button"
                onClick={() => setShowRosterModal(false)}
                className="min-h-[40px] px-5 py-1.5 rounded-full bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525] text-xs font-bold cursor-pointer"
              >
                Done
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
            className="absolute top-4 right-4 min-w-[44px] min-h-[44px] rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Close image preview"
            aria-label="Close image preview"
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
