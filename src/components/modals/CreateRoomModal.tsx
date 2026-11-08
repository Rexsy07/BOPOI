import React, { useState } from 'react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import {
  X,
  Shield,
  Shuffle,
} from 'lucide-react';
import {
  BopoiIcon,
  LaunchTrendingIcon,
  CreateRoomIcon,
  RoomBadgeIcon,
} from '../brand/icons/index.ts';
import { RoomIconStudioPicker } from './RoomIconStudioPicker.tsx';
import { parseRoomIcon } from '../../utils/roomIconConfig.ts';

const CATEGORY_OPTIONS = [
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

const RANDOM_CREATOR_ALIASES = [
  'Anonymous Founder',
  'Night Owl',
  'Secret Scholar',
  'Ghost Student',
  'Campus Rebel',
  'Phantom Chatter',
  'Mystic Senior',
];

export const CreateRoomModal: React.FC = () => {
  const { isCreateRoomModalOpen, setIsCreateRoomModalOpen, createRoom, showToast } = useBopoi();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Campus Life & Academics');
  const [iconEmoji, setIconEmoji] = useState('');
  const [iconBg, setIconBg] = useState(
    'badge:v1|solid|#191525|squircle|none|#191525'
  );
  const [creatorAlias, setCreatorAlias] = useState('Anonymous Founder');
  const [starterMessage, setStarterMessage] = useState('');
  const [isAnonymousOnly] = useState(true);

  if (!isCreateRoomModalOpen) return null;

  const parsedIcon = parseRoomIcon(iconEmoji, iconBg, category, name);
  const hasUploadedPhoto =
    parsedIcon.mode === 'image' && Boolean(parsedIcon.value);

  const handleClose = () => {
    setIsCreateRoomModalOpen(false);
  };

  const handleSelectCategory = (cat: string) => {
    setCategory(cat);
  };

  const handleRandomizeAlias = () => {
    const random =
      RANDOM_CREATOR_ALIASES[Math.floor(Math.random() * RANDOM_CREATOR_ALIASES.length)];
    setCreatorAlias(random);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter a room name', 'error');
      return;
    }
    if (!description.trim()) {
      showToast('Please add a short topic description', 'error');
      return;
    }
    if (!hasUploadedPhoto) {
      showToast('Please upload a room profile photo from your gallery', 'error');
      return;
    }

    createRoom({
      name: name.trim(),
      description: description.trim(),
      category,
      iconEmoji,
      iconBg,
      creatorAlias: creatorAlias.trim() || 'Anonymous Founder',
      starterMessage: starterMessage.trim() || undefined,
      isAnonymousOnly,
      tags: [category, 'AnonymousRoom'],
    });

    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92dvh] overflow-hidden flex flex-col shadow-2xl border border-[#EAE6F0] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#EAE6F0] bg-white sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center justify-center shadow-2xs shrink-0">
              <CreateRoomIcon size={32} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#191525]">
                Create Anonymous Room
              </h2>
              <p className="text-xs text-[#706B7D]">
                Anyone on campus can join and chat anonymously
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-black transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Room Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-[#191525]">
              Room Name <span className="text-[#5420F5]">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                #
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Midnight Confessions & Gist"
                maxLength={45}
                required
                className="w-full pl-8 pr-4 py-2.5 bg-[#FAF9FC] border border-[#EAE6F0] rounded-2xl text-sm font-bold text-[#191525] placeholder:text-slate-400 focus:outline-none focus:border-[#5420F5] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Room Description / Topic */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-[#191525]">
              Topic &amp; Rules <span className="text-[#5420F5]">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What can people talk about in this room? (e.g. Share your unfiltered thoughts safely and respect fellow students.)"
              rows={2}
              maxLength={150}
              required
              className="w-full px-3.5 py-2.5 bg-[#FAF9FC] border border-[#EAE6F0] rounded-2xl text-xs text-[#191525] placeholder:text-slate-400 focus:outline-none focus:border-[#5420F5] focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Category Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-[#191525]">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = category.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleSelectCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#5420F5] text-white shadow-sm'
                        : 'bg-[#FAF9FC] border border-[#EAE6F0] text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white shadow-2xs' : 'bg-purple-50'
                      }`}
                    >
                      <BopoiIcon name={cat} size={13} />
                    </span>
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Room Icon Studio Picker (Compulsory Gallery Photo Upload) */}
          <RoomIconStudioPicker
            iconEmoji={iconEmoji}
            iconBg={iconBg}
            roomName={name}
            category={category}
            onChange={(nextEmoji, nextBg) => {
              setIconEmoji(nextEmoji);
              setIconBg(nextBg);
            }}
          />

          {/* Anonymous Creator Identity */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-[#F0EBFF]/50 border border-[#5420F5]/20">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-[#5420F5] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Your Anonymous Alias in Room</span>
              </label>
              <button
                type="button"
                onClick={handleRandomizeAlias}
                className="text-[10px] font-bold text-[#5420F5] hover:underline flex items-center gap-1 cursor-pointer"
                title="Roll random alias"
              >
                <Shuffle className="w-3 h-3" />
                <span>Randomize</span>
              </button>
            </div>
            <input
              type="text"
              value={creatorAlias}
              onChange={(e) => setCreatorAlias(e.target.value)}
              placeholder="e.g. Night Owl"
              className="w-full px-3 py-2 bg-white border border-[#EAE6F0] rounded-xl text-xs font-bold text-[#191525] focus:outline-none focus:border-[#5420F5]"
            />
            <p className="text-[10px] text-slate-500">
              Your real account name will NOT be revealed. Members will only see this mask.
            </p>
          </div>

          {/* First Starter Message (Optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-[#191525]">
              Conversation Starter Prompt (Optional)
            </label>
            <input
              type="text"
              value={starterMessage}
              onChange={(e) => setStarterMessage(e.target.value)}
              placeholder="e.g. Welcome everyone! Drop your hottest campus takes"
              maxLength={120}
              className="w-full px-3.5 py-2.5 bg-[#FAF9FC] border border-[#EAE6F0] rounded-2xl text-xs text-[#191525] placeholder:text-slate-400 focus:outline-none focus:border-[#5420F5]"
            />
          </div>

          {/* Live Preview Card */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-slate-400">
              Live Room Directory Preview
            </span>
            <div className="p-3.5 rounded-2xl border border-[#EAE6F0] bg-white flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <RoomBadgeIcon
                  iconEmoji={iconEmoji}
                  iconBg={iconBg}
                  category={category}
                  roomName={name}
                  size="md"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-black text-[#191525] truncate">
                      #{name.trim() || 'Untitled Room'}
                    </h4>
                    <span className="text-[9px] font-bold text-[#5420F5]">
                      · New
                    </span>
                  </div>
                  <p className="text-[11px] text-[#706B7D] truncate">
                    {description.trim() || 'No description yet.'}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-bold">
                    <span className="text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      1 online
                    </span>
                    <span>·</span>
                    <span>Host: {creatorAlias || 'Anonymous'}</span>
                  </div>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-[#5420F5] text-white text-[10px] font-bold shrink-0">
                Enter Room →
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#EAE6F0] bg-[#FAF9FC] flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl border border-[#EAE6F0] bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black transition-all cursor-pointer shadow-md shadow-[#5420F5]/25 flex items-center gap-1.5 active:scale-95"
          >
            <LaunchTrendingIcon size={16} />
            <span>Create Anonymous Room</span>
          </button>
        </div>
      </div>
    </div>
  );
};
