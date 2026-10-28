import React, { useState, useMemo } from 'react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { SocialPost } from '../../types/index.ts';
import {
  ChevronLeft,
  Clock,
  Heart,
  MessageCircle,
  Share2,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { CreatePollIcon, StoryStudioNavIcon } from '../brand/icons/index.ts';

export const PollsView: React.FC = () => {
  const {
    socialPosts,
    votePoll,
    togglePostLike,
    setSelectedPost,
    setActiveView,
    goBack,
    setIsCreateModalOpen,
    viewUserProfile,
    openPostShare,
  } = useBopoi();

  const [activeCategory, setActiveCategory] = useState<string>('All');

  const filteredPolls = useMemo(() => {
    const polls = socialPosts.filter((p) => p.type === 'poll');
    const list =
      activeCategory === 'All'
        ? polls
        : polls.filter((p) => p.category?.toLowerCase() === activeCategory.toLowerCase());
    return list.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  }, [socialPosts, activeCategory]);

  const handleCardClick = (post: SocialPost) => {
    setSelectedPost(post);
    setActiveView('poll-detail');
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 pb-24 space-y-4 text-[#191525]">
      {/* 1. Header */}
      <div className="flex items-center justify-between py-2 border-b border-[#EAE6F0]">
        <button
          onClick={() => goBack('home')}
          className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer flex items-center"
          title="Go back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2">
          <CreatePollIcon size={24} />
          <h1 className="text-base sm:text-lg font-black text-[#191525] tracking-tight">
            Live Polls
          </h1>
        </div>

        <button
          onClick={() => setActiveView('answer-studio')}
          className="p-1.5 -mr-1.5 rounded-xl hover:bg-purple-50 transition-colors cursor-pointer flex items-center justify-center"
          title="Share to Stories"
        >
          <StoryStudioNavIcon size={22} />
        </button>
      </div>

      {/* 2. Top Banner */}
      <div className="bg-gradient-to-r from-amber-50/90 via-purple-50/50 to-white border border-amber-200/80 rounded-3xl p-4 flex items-center gap-3.5 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-white border border-amber-200 flex items-center justify-center shrink-0 shadow-xs">
          <CreatePollIcon size={36} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-black text-[#191525]">Campus pulse in real time.</h4>
          <p className="text-[11px] text-[#706B7D] leading-relaxed mt-0.5">
            Vote anonymously on campus debates, settle arguments, or launch your own poll.
          </p>
        </div>
      </div>

      {/* 3. Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
        {['All', 'Campus Life', 'School', 'Love', 'Fun', 'Tech'].map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[#5420F5] text-white shadow-md shadow-[#5420F5]/25 ring-1 ring-[#5420F5]'
                  : 'bg-white border border-[#EAE6F0] text-slate-600 hover:text-black hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 4. Stream of Poll Cards */}
      <div className="space-y-3 pt-1">
        {filteredPolls.map((post) => {
          const totalVotes = post.pollTotalVotes || 1;
          return (
            <div
              key={post.id}
              onClick={() => handleCardClick(post)}
              className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EAE6F0] shadow-xs hover:border-[#5420F5]/30 hover:shadow-md transition-all cursor-pointer space-y-3"
            >
              {/* Author row */}
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    viewUserProfile(post.authorUsername, post.isAnonymous, post.authorCampus);
                  }}
                >
                  {post.isAnonymous ? (
                    <BopoiAnonymousAvatar size="sm" idPrefix={`poll-${post.id}`} />
                  ) : (
                    <CampusCharacterAvatar
                      value={post.authorAvatar}
                      seed={post.authorUsername}
                      size={32}
                      rounded="full"
                      className="ring-2 ring-amber-200"
                    />
                  )}
                  <div>
                    <span className="text-xs font-black text-[#191525] block hover:underline">
                      {post.isAnonymous ? 'Anonymous Pollster' : post.authorName}
                    </span>
                    <span className="text-[10px] text-[#706B7D] block">
                      {post.createdAt} {post.authorCampus && `• ${post.authorCampus}`}
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  <Clock className="w-3 h-3" />
                  {post.pollExpiresIn || 'Live Poll'}
                </span>
              </div>

              {/* Poll Question */}
              <p className="text-xs sm:text-sm font-black text-[#191525] leading-snug">
                {post.content}
              </p>

              {/* Interactive Poll Options */}
              {post.pollOptions && (
                <div className="space-y-2 pt-1">
                  {post.pollOptions.map((opt) => {
                    const isSelected = post.userVotedOptionId === opt.id;
                    const pct = Math.min(100, Math.round((opt.votes / totalVotes) * 100));
                    return (
                      <button
                        key={opt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          votePoll(post.id, opt.id);
                        }}
                        className={`relative w-full text-left px-3.5 py-2.5 rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                          isSelected
                            ? 'border-[#5420F5] bg-[#F0EBFF]/40'
                            : 'border-[#EAE6F0] hover:border-[#5420F5]/40 bg-[#FAF9FC]'
                        }`}
                      >
                        <div
                          className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                            isSelected ? 'bg-[#5420F5]/15' : 'bg-slate-200/60'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                        <div className="relative z-10 flex items-center justify-between gap-2 text-xs">
                          <span
                            className={`font-bold ${
                              isSelected ? 'text-[#5420F5]' : 'text-[#191525]'
                            }`}
                          >
                            {opt.text}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`font-black ${
                                isSelected ? 'text-[#5420F5]' : 'text-[#706B7D]'
                              }`}
                            >
                              {pct}%
                            </span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#5420F5]" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  <div className="text-[11px] font-bold text-[#706B7D] px-1">
                    {(post.pollTotalVotes || 0).toLocaleString()} total votes
                  </div>
                </div>
              )}

              {/* Actions Toolbar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-slate-500 text-xs">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePostLike(post.id);
                  }}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-pink-50 ${
                    post.hasLiked ? 'text-[#F52D85] font-bold' : 'hover:text-[#F52D85]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${post.hasLiked ? 'fill-[#F52D85]' : ''}`} />
                  <span>{post.likes}</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick(post);
                  }}
                  className="flex items-center gap-1.5 hover:text-[#5420F5] transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-[#F0EBFF]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{post.commentsCount} comments</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openPostShare(post);
                  }}
                  className="flex items-center gap-1.5 hover:text-[#5420F5] transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-[#F0EBFF]"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{post.sharesCount || 0}</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredPolls.length === 0 && (
          <div className="bg-white rounded-3xl p-8 border border-[#EAE6F0] text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
              <CreatePollIcon size={32} />
            </div>
            <div>
              <p className="text-sm font-black text-[#191525]">
                {activeCategory === 'All'
                  ? 'No live polls right now'
                  : `No ${activeCategory} polls right now`}
              </p>
              <p className="text-xs text-[#706B7D] mt-1">
                Create a campus poll and watch students vote in real time.
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 px-5 py-2.5 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black rounded-xl shadow-md shadow-[#5420F5]/20 cursor-pointer transition-all"
            >
              + Launch a Poll
            </button>
          </div>
        )}
      </div>

      {/* Floating Create Poll Button */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="fixed bottom-20 right-6 z-30 px-5 py-3 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black rounded-full shadow-xl shadow-[#5420F5]/30 flex items-center gap-2 cursor-pointer transition-all active:scale-[0.96]"
      >
        <Plus className="w-4 h-4" />
        <span>Launch Poll</span>
      </button>
    </div>
  );
};
