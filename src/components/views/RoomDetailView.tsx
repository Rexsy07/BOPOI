import React, { useState, useRef, useEffect } from 'react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { RoomMessage, RoomAssignedPersona } from '../../types/index.ts';
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
  Palette,
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

const EMOJI_REACTIONS = ['❤️', '🔥', '😂', '💀', '👏', '🤫'];

export const RoomDetailView: React.FC = () => {
  const {
    rooms,
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

  const [messageText, setMessageText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [showRoomInfo, setShowRoomInfo] = useState(false);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [showRequiredCustomModal, setShowRequiredCustomModal] = useState(false);
  const [showEditIconModal, setShowEditIconModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState<RoomMessage | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const prevMessagesCount = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find active room
  const activeRoom =
    rooms.find((r) => r.id === selectedRoomId) || rooms[0];

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

  // Scroll handling
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = 0;
    }
  }, [activeRoom?.id]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevMessagesCount.current = activeRoom?.messages?.length || 0;
      return;
    }

    const currentLength = activeRoom?.messages?.length || 0;
    if (currentLength > prevMessagesCount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesCount.current = currentLength;
  }, [activeRoom?.messages?.length]);

  if (!activeRoom) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-4">
        <p className="text-sm font-bold text-slate-600">No active room found.</p>
        <button
          onClick={() => setActiveView('rooms')}
          className="px-4 py-2 bg-[#5420F5] text-white text-xs font-black rounded-xl cursor-pointer"
        >
          Return to Rooms
        </button>
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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    if (activeRoom.isLocked && !isAdminUnlocked) {
      showToast('This room is locked by Campus Moderators.', 'error');
      return;
    }

    if (effectiveIsAnonymous && !assignedPersona) {
      setShowRequiredCustomModal(true);
      return;
    }

    sendRoomMessage(
      activeRoom.id,
      messageText.trim(),
      effectiveIsAnonymous,
      effectiveAlias,
      replyingTo
        ? {
            id: replyingTo.id,
            authorName: replyingTo.authorAlias || replyingTo.authorName,
            text: replyingTo.text,
          }
        : undefined,
      effectiveIsAnonymous ? effectiveMaskId : undefined
    );

    setMessageText('');
    setReplyingTo(null);

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
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

  const isCreator = Boolean(user.id && activeRoom.creatorUserId === user.id);
  const canEditRoomIcon = Boolean(isCreator || isAdminUnlocked);

  return (
    <div className="w-full max-w-2xl mx-auto px-3 sm:px-6 pt-2 pb-[74px] flex flex-col h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] overflow-hidden text-[#191525]">
      {/* 1. Sticky Room Header (Responsive, never overflows) */}
      <div className="flex items-center justify-between py-2 border-b border-[#EAE6F0] shrink-0 bg-[#FAF9FC]/95 backdrop-blur-md z-20 gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => goBack('rooms')}
            className="p-1.5 -ml-1 rounded-full hover:bg-slate-200/70 text-slate-700 transition-colors cursor-pointer flex items-center shrink-0"
            title="Go back"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {canEditRoomIcon ? (
            <button
              type="button"
              onClick={() => setShowEditIconModal(true)}
              title="Customize Room Icon"
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
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#191525] text-white flex items-center justify-center shadow-xs border border-white">
                <Palette className="w-2.5 h-2.5" />
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
              <h1 className="text-xs sm:text-base font-black text-[#191525] truncate">
                #{activeRoom.name}
              </h1>
              <span className="hidden md:inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-[#5420F5] shrink-0">
                {activeRoom.category}
              </span>
              {activeRoom.isLocked && (
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 shrink-0">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Locked</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 truncate flex-wrap">
              <span className="flex items-center gap-1 text-emerald-600 font-bold shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{activeRoom.onlineCount || 1} online</span>
              </span>
              <span>•</span>
              <span className="truncate">
                {activeRoom.membersCount}{' '}
                {activeRoom.membersCount === 1 ? 'member' : 'members'}
              </span>
              <span>•</span>
              {/* Subtle WebSocket Connection Status Badge */}
              <button
                type="button"
                onClick={reconnectRealtime}
                title="Real-time WebSocket connection status (click to resync)"
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold border transition-all cursor-pointer shrink-0 ${
                  connectionStatus === 'connected'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                    : connectionStatus === 'reconnecting'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {connectionStatus === 'reconnecting' ? (
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <Wifi className="w-2.5 h-2.5" />
                )}
                <span>
                  {connectionStatus === 'connected'
                    ? 'Live Sync'
                    : connectionStatus === 'reconnecting'
                    ? 'Reconnecting...'
                    : 'Offline (Tap)'}
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
            className="p-2 rounded-xl border border-[#EAE6F0] bg-white hover:bg-purple-50 text-slate-600 hover:text-[#5420F5] transition-colors cursor-pointer"
            title="Share Room link"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          {/* Info toggle */}
          <button
            type="button"
            onClick={() => setShowRoomInfo(!showRoomInfo)}
            className={`p-2 rounded-xl border border-[#EAE6F0] transition-colors cursor-pointer ${
              showRoomInfo ? 'bg-[#5420F5] text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
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
                ? 'bg-white border border-[#EAE6F0] text-slate-700 hover:bg-slate-100'
                : 'bg-[#5420F5] hover:bg-[#4314E2] text-white shadow-xs'
            }`}
          >
            {activeRoom.isJoined ? (
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
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
        <div className="mt-1.5 p-3 rounded-2xl bg-white border border-[#5420F5]/30 shadow-md space-y-2 shrink-0 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-[#5420F5]">
              <Shield className="w-4 h-4" />
              <span>Room Info &amp; Privacy</span>
            </div>
            <button
              onClick={() => setShowRoomInfo(false)}
              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-medium break-words">
            <strong>Topic:</strong> {activeRoom.description}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex-wrap">
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
                  className="text-[#5420F5] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Palette className="w-3 h-3" />
                  <span>Customize Icon</span>
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
        <div className="mt-1.5 px-3 py-2 rounded-xl bg-white border border-[#EAE6F0] flex items-center justify-between text-xs shrink-0 shadow-2xs gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-5 h-5 rounded-md bg-purple-50 flex items-center justify-center shrink-0">
              <PersonaMaskIcon mask="masked-student" size={14} />
            </div>
            <span className="text-slate-600 font-medium truncate text-[11px]">
              <strong className="text-[#191525]">Topic: </strong>
              {activeRoom.description}
            </span>
          </div>
          <button
            onClick={() => setShowRoomInfo(true)}
            className="text-[10px] font-bold text-[#5420F5] hover:underline shrink-0 cursor-pointer"
          >
            Details
          </button>
        </div>
      )}

      {/* 4. Messages Stream (Scrollable) */}
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto py-3 space-y-3 pr-1 relative"
      >
        {!activeRoom.messages || activeRoom.messages.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-3 bg-white rounded-3xl border border-dashed border-slate-200 my-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#5420F5] mx-auto flex items-center justify-center p-1.5">
              <PersonaMaskIcon mask="masked-student" size={32} />
            </div>
            <h3 className="text-sm font-black text-[#191525]">
              Welcome to #{activeRoom.name}!
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
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
                  className="px-3 py-1.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] hover:bg-[#F0EBFF] hover:border-[#5420F5]/30 text-xs font-bold text-slate-700 transition-all cursor-pointer"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          activeRoom.messages.map((msg) => {
            const isMe =
              msg.authorUsername === user.username && !msg.isAnonymous;

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse' : ''} group min-w-0`}
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
                      : 'bg-white border border-[#EAE6F0] text-[#191525] rounded-tl-xs'
                  }`}
                >
                  {/* Quoted Reply context if exists */}
                  {msg.replyTo && (
                    <div
                      className={`p-1.5 px-2.5 rounded-xl text-[10px] mb-1 border ${
                        isMe
                          ? 'bg-white/15 border-white/30 text-white/95'
                          : 'bg-[#FAF9FC] border-[#EAE6F0] text-slate-600'
                      }`}
                    >
                      <strong className="block truncate font-bold">
                        Replying to {msg.replyTo.authorName}:
                      </strong>
                      <span className="line-clamp-1 italic break-words">
                        "{msg.replyTo.text}"
                      </span>
                    </div>
                  )}

                  {/* Author Header */}
                  <div className="flex items-center justify-between gap-2 text-[10px] min-w-0">
                    <span
                      className={`font-black flex items-center gap-1 min-w-0 truncate ${
                        isMe ? 'text-white' : 'text-[#5420F5]'
                      }`}
                    >
                      <span className="truncate">{msg.authorName}</span>
                      {msg.isAnonymous && (
                        <span className="text-[9px] font-semibold opacity-75 shrink-0">
                          • Masked
                        </span>
                      )}
                    </span>
                    <span className={`shrink-0 ${isMe ? 'text-white/75' : 'text-slate-400'}`}>
                      {msg.createdAt}
                    </span>
                  </div>

                  {/* Message Text */}
                  <p className="text-xs font-medium leading-relaxed select-text whitespace-pre-wrap break-words">
                    {msg.text}
                  </p>

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
                                  : 'bg-[#F0EBFF] border-[#5420F5] text-[#5420F5]'
                                : isMe
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
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
                      isMe ? 'border-white/15 text-white/85' : 'border-slate-100 text-slate-400'
                    }`}
                  >
                    {/* Quick emoji reactions */}
                    <div className="flex items-center gap-0.5">
                      {EMOJI_REACTIONS.slice(0, 4).map((emoji) => (
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
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 5. Active Reply Bar (When replying to a specific message) */}
      {replyingTo && (
        <div className="shrink-0 mb-1.5 p-2 px-3 rounded-xl bg-[#191525] text-white flex items-center justify-between text-xs shadow-md animate-in slide-in-from-bottom-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <CornerDownRight className="w-3.5 h-3.5 text-[#FFC928] shrink-0" />
            <span className="truncate">
              Replying to <strong>{replyingTo.authorName}</strong>:{' '}
              <span className="text-slate-300">"{replyingTo.text}"</span>
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
            <div className="shrink-0 mb-1.5 px-2.5 py-1.5 rounded-2xl bg-[#F0EBFF]/90 border border-[#5420F5]/25 flex items-center justify-between gap-2 text-xs min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setShowRosterModal(true)}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white border border-[#5420F5]/30 flex items-center justify-center p-0.5 shadow-2xs hover:scale-105 transition-transform cursor-pointer shrink-0"
                  title="Click to view room aliases"
                >
                  <PersonaMaskIcon mask={effectiveIsAnonymous ? effectiveMaskId : 'public-profile'} size={20} />
                </button>

                <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 shrink-0 hidden xs:inline">
                  Speaking as:
                </span>

                <button
                  type="button"
                  onClick={() => setShowRosterModal(true)}
                  className="font-black text-[#5420F5] bg-white px-2 py-0.5 rounded-lg border border-[#5420F5]/30 min-w-0 max-w-[130px] sm:max-w-[180px] shadow-2xs flex items-center gap-1 cursor-pointer hover:border-[#5420F5]"
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
                        : 'bg-white border border-[#EAE6F0] text-slate-600 hover:bg-rose-50 hover:text-rose-700'
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
                  className="px-2 sm:px-2.5 py-1 rounded-xl bg-white border border-[#5420F5]/30 text-[#5420F5] hover:bg-purple-50 text-[10px] font-black transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
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
                        : 'bg-white border border-[#EAE6F0] text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{effectiveIsAnonymous ? 'Mask On' : 'Public'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* 7. Bottom Chat Composer Form */}
            <form
              onSubmit={handleSend}
              className="shrink-0 bg-white border border-[#EAE6F0] rounded-2xl p-1.5 pl-2.5 shadow-md flex items-center gap-2 min-w-0"
            >
              <button
                type="button"
                onClick={() => setShowRosterModal(true)}
                className="shrink-0 w-8 h-8 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center justify-center hover:bg-purple-50 transition-colors cursor-pointer"
                title="View your persona badge & room roster"
              >
                <PersonaMaskIcon mask={effectiveIsAnonymous ? effectiveMaskId : 'public-profile'} size={22} />
              </button>

              <input
                ref={inputRef}
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={
                  activeRoom.isLocked
                    ? `Message locked room as Admin (${effectiveAlias})...`
                    : `Message as ${effectiveAlias}...`
                }
                className="flex-1 min-w-0 px-1.5 py-1.5 bg-transparent text-xs sm:text-sm text-[#191525] placeholder:text-slate-400 focus:outline-none"
              />

              <button
                type="submit"
                disabled={!messageText.trim()}
                className="p-2.5 bg-[#5420F5] hover:bg-[#4314E2] text-white rounded-xl transition-all cursor-pointer disabled:opacity-40 shadow-xs active:scale-95 shrink-0"
                title="Send to anonymous room"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
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

      {/* 9. Room Aliases & Personas Directory Modal */}
      {showRosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-[#EAE6F0] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#EAE6F0] flex items-center justify-between shrink-0 bg-gradient-to-r from-[#FAF9FC] to-white">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-white border border-[#5420F5]/25 flex items-center justify-center p-1 shadow-xs shrink-0">
                  <PersonaMaskIcon mask={effectiveMaskId} size={28} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-[#191525] truncate">
                    Room Aliases
                  </h3>
                  <p className="text-xs text-[#706B7D] truncate">
                    #{activeRoom.name} · Anonymous members directory
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRosterModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-black cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto space-y-3.5">
              {/* Unlimited Room Banner */}
              <div className="px-3 py-2 rounded-xl bg-purple-50/70 border border-[#5420F5]/20 flex items-center gap-2 text-[11px] text-[#5420F5] font-semibold">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Unlimited room capacity — unlimited students can join!</span>
              </div>

              {/* Your Permanent Persona Banner */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-[#F0EBFF] to-white border border-[#5420F5]/30 flex items-center gap-3 shadow-xs">
                <div className="w-10 h-10 rounded-2xl bg-white border border-[#5420F5]/20 flex items-center justify-center p-1 shrink-0">
                  <PersonaMaskIcon mask={effectiveMaskId} size={30} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-[#191525] truncate">
                      {effectiveAlias}
                    </span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-[#5420F5] text-white shrink-0">
                      You ({assignedPersona?.isCustom ? 'Custom' : 'Default'})
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 shrink-0" />
                    <span>Preserved across visits until this room is deleted</span>
                  </p>
                </div>
              </div>

              {/* 10 Default Aliases Grid */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-[#191525]">
                    The 10 Default Aliases
                  </h4>
                  <span className="text-[10px] text-slate-500 font-bold">
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
                            ? 'bg-[#F0EBFF] border-[#5420F5] shadow-xs'
                            : assignedUser
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-white border-dashed border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-0.5 shrink-0">
                            <PersonaMaskIcon mask={preset.id} size={24} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-[#191525] truncate">
                              {preset.name}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
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
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                              In Use
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
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
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-[#191525]">
                      Custom Chatters in this Room
                    </h4>
                    <span className="text-[10px] text-slate-500 font-bold">
                      {Object.values(activeRoom.assignedPersonas || {}).filter((a) => a.isCustom).length} custom
                    </span>
                  </div>
                  <div className="space-y-1">
                    {Object.values(activeRoom.assignedPersonas || {})
                      .filter((a) => a.isCustom)
                      .map((custom) => (
                        <div
                          key={custom.userId}
                          className="p-2 rounded-xl bg-purple-50/50 border border-purple-200 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <PersonaMaskIcon mask={custom.maskId} size={20} />
                            <span className="font-bold text-[#191525] truncate">{custom.alias}</span>
                          </div>
                          <span className="text-[9px] font-bold text-purple-700 shrink-0">Custom Alias</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 bg-[#FAF9FC] flex justify-end">
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
    </div>
  );
};
