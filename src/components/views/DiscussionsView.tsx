import React, { useState, useMemo } from 'react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { SocialPost } from '../../types/index.ts';
import {
  ChevronLeft,
  Heart,
  MessageCircle,
  Share2,
  Plus,
} from 'lucide-react';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { CreateDiscussionIcon, StoryStudioNavIcon } from '../brand/icons/index.ts';

export const DiscussionsView: React.FC = () => {
  const {
    socialPosts,
    togglePostLike,
    setSelectedPost,
    setActiveView,
    goBack,
    setIsCreateModalOpen,
    viewUserProfile,
    openPostShare,
  } = useBopoi();

  const [activeCategory, setActiveCategory] = useState<string>('All');

  const filteredDiscussions = useMemo(() => {
    const discussions = socialPosts.filter((p) => p.type === 'discussion');
    const list =
      activeCategory === 'All'
        ? discussions
        : discussions.filter((p) => p.category?.toLowerCase() === activeCategory.toLowerCase());
    return list.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  }, [socialPosts, activeCategory]);

  const handleCardClick = (post: SocialPost) => {
    setSelectedPost(post);
    setActiveView('post-detail');
  };

  const handleShare = (e: React.MouseEvent, post: SocialPost) => {
    e.stopPropagation();
    openPostShare(post);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 pb-24 space-y-4 text-[#191525]">
      {/* 1. Header (Screen 5 in Mockup) */}
      <div className="flex items-center justify-between py-2 border-b border-[#EAE6F0]">
        <button
          onClick={() => goBack('home')}
          className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer flex items-center"
          title="Go back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2">
          <CreateDiscussionIcon size={24} />
          <h1 className="text-base sm:text-lg font-black text-[#191525] tracking-tight">
            Discussions
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
      <div className="bg-gradient-to-r from-orange-50/80 via-purple-50/50 to-white border border-orange-200/80 rounded-3xl p-4 flex items-center gap-3.5 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-white border border-orange-200 flex items-center justify-center shrink-0 shadow-xs">
          <CreateDiscussionIcon size={36} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-black text-[#191525]">Real people. Real opinions.</h4>
          <p className="text-[11px] text-[#706B7D] leading-relaxed mt-0.5">
            Join discussions, share your thoughts and see different perspectives.
          </p>
        </div>
      </div>

      {/* 3. Filter Chips: All, Campus Life, Relationships, Tech */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
        {['All', 'Campus Life', 'Relationships', 'Tech'].map((cat) => {
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

      {/* 4. Stream of Discussion Cards */}
      <div className="space-y-3 pt-1">
        {filteredDiscussions.map((post) => (
          <div
            key={post.id}
            onClick={() => handleCardClick(post)}
            className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EAE6F0] shadow-xs hover:border-[#5420F5]/30 hover:shadow-md transition-all cursor-pointer space-y-3"
          >
            {/* Author info */}
            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  viewUserProfile(post.authorUsername, post.isAnonymous, post.authorCampus);
                }}
                title={`View ${post.authorName}'s public profile`}
              >
                {post.isAnonymous ? (
                  <BopoiAnonymousAvatar size="sm" idPrefix={`disc-${post.id}`} />
                ) : (
                  <CampusCharacterAvatar
                    value={post.authorAvatar}
                    seed={post.authorUsername}
                    size={32}
                    rounded="full"
                    className="ring-2 ring-[#5420F5]/20"
                  />
                )}
                <div>
                  <span className="text-xs font-black text-[#191525] block hover:underline">
                    {post.authorName}
                  </span>
                  <span className="text-[10px] text-[#706B7D] block">
                    {post.createdAt} {post.authorCampus && `• ${post.authorCampus}`}
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                Discussion
              </span>
            </div>

            {/* Discussion Title Question */}
            {post.title && (
              <h3 className="text-sm sm:text-base font-black text-[#191525] leading-snug">
                {post.title}
              </h3>
            )}

            {/* Content Context */}
            <p className="text-xs sm:text-sm text-[#706B7D] font-medium leading-relaxed">
              {post.content}
            </p>

            {/* Actions Toolbar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-slate-500 text-xs">
              {/* Replies count */}
              <div className="flex items-center gap-1.5 hover:text-[#5420F5] transition-colors">
                <MessageCircle className="w-4 h-4 text-[#5420F5]" />
                <span className="font-bold text-[#191525]">{post.commentsCount} replies</span>
              </div>

              {/* Likes */}
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

              {/* Share */}
              <button
                onClick={(e) => handleShare(e, post)}
                className="flex items-center gap-1.5 hover:text-[#5420F5] transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-[#F0EBFF]"
                title="Share discussion off-campus"
              >
                <Share2 className="w-4 h-4" />
                <span>{post.sharesCount || 0}</span>
              </button>
            </div>
          </div>
        ))}

        {filteredDiscussions.length === 0 && (
          <div className="bg-white rounded-3xl p-8 border border-[#EAE6F0] text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center mx-auto">
              <CreateDiscussionIcon size={32} />
            </div>
            <div>
              <p className="text-sm font-black text-[#191525]">
                {activeCategory === 'All'
                  ? 'No discussions started yet'
                  : `No ${activeCategory} discussions yet`}
              </p>
              <p className="text-xs text-[#706B7D] mt-1">
                Start a conversation and see what students across campus think.
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 px-5 py-2.5 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black rounded-xl shadow-md shadow-[#5420F5]/20 cursor-pointer transition-all"
            >
              + Start a Discussion
            </button>
          </div>
        )}
      </div>

      {/* Floating Create Discussion Button */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="fixed bottom-20 right-6 z-30 px-5 py-3 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black rounded-full shadow-xl shadow-[#5420F5]/30 flex items-center gap-2 cursor-pointer transition-all active:scale-[0.96]"
      >
        <Plus className="w-4 h-4" />
        <span>Start Discussion</span>
      </button>
    </div>
  );
};
