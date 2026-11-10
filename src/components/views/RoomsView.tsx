import React, { useState, useMemo } from 'react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { CommunityRoom } from '../../types/index.ts';
import {
  ChevronLeft,
  Users2,
  Check,
  Plus,
  MessageCircle,
  Search,
  Share2,
  X,
} from 'lucide-react';
import { PersonaMaskIcon } from '../brand/masks/PersonaMaskIcon.tsx';
import {
  BopoiIcon,
  BopoiSearchIcon,
  SearchEmptyIcon,
  LaunchTrendingIcon,
  CreateRoomIcon,
  RoomBadgeIcon,
} from '../brand/icons/index.ts';

export const RoomsView: React.FC = () => {
  const {
    rooms,
    toggleJoinRoom,
    enterRoom,
    setActiveView,
    goBack,
    showToast,
    setIsCreateRoomModalOpen,
  } = useBopoi();

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = [
    'All',
    'Joined',
    'Campus Life & Academics',
    'Study & Exam Survival',
    'Hostel & Dorm (Food)',
    'Coffee & Chill',
    'Gaming & Entertainment',
    'Music & Podcasts',
    'Tech & Coding',
    'Campus Sports',
    'Midnight Chat / Late Night',
    'Ideas & Life Hacks',
    'Dating & Romance',
    'Launch & Trending',
  ];

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // 1. Category / Joined filter
      if (activeCategory === 'Joined') {
        if (!room.isJoined) return false;
      } else if (activeCategory !== 'All') {
        const rc = room.category.toLowerCase();
        const ac = activeCategory.toLowerCase();
        const matches =
          rc === ac ||
          (ac.includes('campus life') && (rc.includes('campus') || rc.includes('academic'))) ||
          (ac.includes('study') && rc.includes('study')) ||
          (ac.includes('hostel') && (rc.includes('hostel') || rc.includes('food'))) ||
          (ac.includes('coffee') && (rc.includes('coffee') || rc.includes('chill'))) ||
          (ac.includes('gaming') && (rc.includes('gaming') || rc.includes('entertainment'))) ||
          (ac.includes('music') && (rc.includes('music') || rc.includes('podcast'))) ||
          (ac.includes('tech') && (rc.includes('tech') || rc.includes('coding'))) ||
          (ac.includes('sports') && (rc.includes('sports') || rc.includes('football'))) ||
          (ac.includes('midnight') && (rc.includes('midnight') || rc.includes('confession'))) ||
          (ac.includes('ideas') && (rc.includes('ideas') || rc.includes('hacks'))) ||
          (ac.includes('dating') && (rc.includes('dating') || rc.includes('romance') || rc.includes('lifestyle'))) ||
          (ac.includes('launch') && (rc.includes('launch') || rc.includes('trending')));

        if (!matches) {
          return false;
        }
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = room.name.toLowerCase().includes(q);
        const matchesDesc = room.description.toLowerCase().includes(q);
        const matchesCat = room.category.toLowerCase().includes(q);
        const matchesTags = room.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesCat && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [rooms, activeCategory, searchQuery]);

  const handleOpenRoom = (room: CommunityRoom) => {
    enterRoom(room.id);
  };

  const handleShareRoom = (e: React.MouseEvent, room: CommunityRoom) => {
    e.stopPropagation();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bopoi.app';
    const roomUrl = `${origin}/#room-${room.id}`;
    const shareText = `Join the anonymous #${room.name} chat room on Bopoi: ${room.description}\n${roomUrl}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share({
          title: `#${room.name} Anonymous Room`,
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

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 pb-8 space-y-4 text-[#191525] overflow-x-hidden">
      {/* 1. Header */}
      <div className="flex items-center justify-between gap-2.5 py-2 border-b border-[#EAE6F0]">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            onClick={() => goBack('home')}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer flex items-center shrink-0"
            title="Go back"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="w-10 h-10 rounded-2xl bg-white border border-[#EAE6F0] shadow-2xs flex items-center justify-center shrink-0">
            <CreateRoomIcon size={28} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-[#191525] tracking-tight truncate">
                Anonymous Rooms
              </h1>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#5420F5] text-white shrink-0">
                {rooms.length} Active
              </span>
            </div>
            <p className="text-xs text-[#706B7D] truncate">
              Join conversations. Talk freely. Stay 100% anonymous.
            </p>
          </div>
        </div>

        {/* Create Room Button */}
        <button
          onClick={() => setIsCreateRoomModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-[#5420F5]/25 active:scale-95 shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>New Room</span>
        </button>
      </div>

      {/* 2. Hero Banner: Anyone can create a room */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#F0EBFF] via-purple-50 to-white border border-[#5420F5]/25 shadow-xs relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="space-y-1.5 relative z-10 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-7 h-7 rounded-xl bg-white border border-[#5420F5]/20 flex items-center justify-center p-0.5 shadow-2xs shrink-0">
              <PersonaMaskIcon mask="masked-student" size={20} />
            </div>
            <h2 className="text-sm sm:text-base font-black text-[#191525]">
              Anyone can create a room
            </h2>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
              Open to All
            </span>
          </div>
          <p className="text-xs text-[#706B7D] leading-relaxed">
            Start a safe, anonymous room for your faculty, hostel, dating gist, confessions, or exam prep. Students can join instantly!
          </p>
        </div>

        <button
          onClick={() => setIsCreateRoomModalOpen(true)}
          className="self-start sm:self-center px-4 py-2.5 rounded-2xl bg-[#191525] hover:bg-[#5420F5] text-white text-xs font-black transition-all cursor-pointer shrink-0 shadow-md flex items-center gap-2 group active:scale-95"
        >
          <span>Create Room</span>
          <LaunchTrendingIcon size={18} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* 3. Search Bar */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
          <BopoiSearchIcon size={16} />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search rooms by name, topic, or tags..."
          className="w-full pl-9 pr-9 py-2.5 bg-white border border-[#EAE6F0] rounded-2xl text-xs font-medium text-[#191525] placeholder:text-slate-400 focus:outline-none focus:border-[#5420F5] shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 4. Filter Pills (High-contrast icon containers when active) */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#5420F5] text-white shadow-md shadow-[#5420F5]/25 ring-1 ring-[#5420F5]'
                  : 'bg-white border border-[#EAE6F0] text-slate-600 hover:text-black hover:bg-slate-50'
              }`}
            >
              {cat !== 'All' && cat !== 'Joined' && (
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-white shadow-2xs' : 'bg-purple-50'
                  }`}
                >
                  <BopoiIcon name={cat} size={14} />
                </span>
              )}
              <span>{cat}</span>
            </button>
          );
        })}
      </div>

      {/* 5. Community Rooms List */}
      <div className="space-y-3 pt-1">
        {filteredRooms.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center flex flex-col items-center justify-center space-y-3.5 border border-[#EAE6F0] shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-[#F0EBFF] border border-[#5420F5]/15 flex items-center justify-center mx-auto shadow-2xs p-2">
              {searchQuery ? <SearchEmptyIcon size={42} /> : <CreateRoomIcon size={42} />}
            </div>
            <div className="space-y-1 max-w-xs mx-auto">
              <h3 className="text-sm sm:text-base font-black text-[#191525]">No rooms found</h3>
              <p className="text-xs text-[#706B7D] leading-relaxed">
                {searchQuery
                  ? `No active rooms match "${searchQuery}". Be the first to create this room!`
                  : 'No rooms in this category yet. Be the first to start a conversation!'}
              </p>
            </div>
            <button
              onClick={() => setIsCreateRoomModalOpen(true)}
              className="px-4 py-2.5 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black rounded-xl shadow-md shadow-[#5420F5]/25 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create This Room</span>
            </button>
          </div>
        ) : (
          filteredRooms.map((room) => {
            return (
              <div
                key={room.id}
                onClick={() => handleOpenRoom(room)}
                className="group bg-white rounded-3xl p-4 sm:p-5 border border-[#EAE6F0] shadow-xs hover:border-[#5420F5]/50 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 active:scale-[0.99] relative overflow-hidden w-full"
                title={`Enter #${room.name} room`}
              >
                {/* Left: High-Contrast Custom Room Icon & Info */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <RoomBadgeIcon
                    iconEmoji={room.iconEmoji}
                    iconBg={room.iconBg}
                    category={room.category}
                    roomName={room.name}
                    size="md"
                    className="transition-transform group-hover:scale-105"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-black text-[#191525] break-words group-hover:text-[#5420F5] transition-colors">
                        #{room.name}
                      </h3>

                      {room.isJoined && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                          Joined
                        </span>
                      )}

                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0">
                        {room.category}
                      </span>

                      {room.isCustomRoom && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-purple-50 text-[#5420F5] shrink-0 border border-purple-200">
                          Student Created
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#706B7D] leading-snug line-clamp-2 mt-1 break-words">
                      {room.description}
                    </p>

                    {/* Member Avatars & Online Counter & Messages stats */}
                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1 shrink-0">
                        <Users2 className="w-3.5 h-3.5 text-[#5420F5]" />
                        <span>
                          {room.membersCount} {room.membersCount === 1 ? 'member' : 'members'}
                        </span>
                      </span>

                      <span className="text-slate-300">•</span>

                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{room.onlineCount || 1} online</span>
                      </span>

                      {room.messages && room.messages.length > 0 && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 shrink-0">
                            <MessageCircle className="w-3 h-3 text-slate-400" />
                            <span>{room.messages.length} msgs</span>
                          </span>
                        </>
                      )}

                      {room.creatorAlias && (
                        <>
                          <span className="text-slate-300 hidden sm:inline">•</span>
                          <span className="text-[10px] text-slate-400 truncate hidden sm:inline max-w-[140px]">
                            by {room.creatorAlias}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="flex items-center gap-1.5">
                    {/* Share Room Deep Link */}
                    <button
                      type="button"
                      onClick={(e) => handleShareRoom(e, room)}
                      className="p-2 rounded-xl border border-[#EAE6F0] bg-white hover:bg-purple-50 hover:text-[#5420F5] text-slate-500 transition-colors cursor-pointer"
                      title="Share room link"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Quick Join / Leave Toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleJoinRoom(room.id);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        room.isJoined
                          ? 'border border-[#EAE6F0] bg-slate-50 text-slate-700 hover:bg-slate-100'
                          : 'border border-[#5420F5]/30 bg-[#F0EBFF] text-[#5420F5] hover:bg-[#5420F5] hover:text-white'
                      }`}
                    >
                      {room.isJoined ? 'Joined' : '+ Join'}
                    </button>
                  </div>

                  {/* Enter Room Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenRoom(room);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 bg-[#5420F5] hover:bg-[#4314E2] text-white shadow-[#5420F5]/25 shrink-0"
                    title="Enter this room"
                  >
                    <span>Enter Room</span>
                    <span className="text-xs">→</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
