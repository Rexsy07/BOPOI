import React, { useState } from 'react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { SocialPost } from '../../types/index.ts';
import {
  ChevronLeft,
  MoreVertical,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Flag,
  Trash2,
  Copy,
} from 'lucide-react';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import { SocialCommentsThread } from '../comments/SocialCommentsThread.tsx';
import { MentionText } from '../ui/MentionText.tsx';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import {
  CreatePostIcon,
  CreateConfessionIcon,
  CreateDiscussionIcon,
  BookmarkedIcon,
} from '../brand/icons/index.ts';

export const PostDetailView: React.FC = () => {
  const {
    socialPosts,
    selectedPost,
    togglePostLike,
    togglePostBookmark,
    setActiveView,
    goBack,
    user,
    showToast,
    viewUserProfile,
    openPostShare,
    deleteSocialPost,
    reportPost,
  } = useBopoi();

  const [menuOpen, setMenuOpen] = useState(false);

  const activePost: SocialPost | undefined =
    selectedPost
      ? socialPosts.find((p) => p.id === selectedPost.id) || selectedPost
      : socialPosts[0];

  if (!activePost) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <p className="text-sm font-bold text-slate-600">No active post selected.</p>
        <button
          onClick={() => setActiveView('home')}
          className="mt-4 px-4 py-2 bg-[#5420F5] text-white text-xs font-bold rounded-xl"
        >
          Return to Home
        </button>
      </div>
    );
  }

  const isOwnPost =
    Boolean(user.id && activePost.authorUserId === user.id) ||
    (!activePost.isAnonymous &&
      activePost.authorUsername.toLowerCase() === user.username.toLowerCase());

  const handleShare = () => {
    if (activePost) {
      openPostShare(activePost);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/?post=${activePost.id}#post-${activePost.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    showToast('Post link copied to clipboard!', 'success');
    setMenuOpen(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 pb-36 space-y-4 text-[#191525]">
      {/* 1. Header (Screen 8 in Mockup) */}
      <div className="flex items-center justify-between py-2 border-b border-[#EAE6F0] relative">
        <button
          onClick={() => goBack('home')}
          className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer flex items-center"
          title="Go back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2">
          {activePost.type === 'confession' ? (
            <CreateConfessionIcon size={24} />
          ) : activePost.type === 'discussion' ? (
            <CreateDiscussionIcon size={24} />
          ) : (
            <CreatePostIcon size={24} />
          )}
          <h1 className="text-base sm:text-lg font-black text-[#191525] tracking-tight capitalize">
            {activePost.type || 'Post'}
          </h1>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="p-1.5 -mr-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Post options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-[#EAE6F0] shadow-xl py-1.5 z-40">
                <button
                  onClick={handleCopyLink}
                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-[#191525] hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-[#5420F5]" />
                  Copy Post Link
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleShare();
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-[#191525] hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#5420F5]" />
                  Share Post Card
                </button>
                <button
                  onClick={() => {
                    togglePostBookmark(activePost.id);
                    setMenuOpen(false);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-[#191525] hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5 text-[#5420F5]" />
                  {activePost.isBookmarked ? 'Remove Bookmark' : 'Bookmark Post'}
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  onClick={() => {
                    reportPost(activePost.id, 'Reported from post detail menu');
                    setMenuOpen(false);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-amber-600 hover:bg-amber-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" />
                  Report Post
                </button>
                {isOwnPost && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      deleteSocialPost(activePost.id);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Post
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Main Post Card */}
      <div className="bg-white rounded-3xl p-5 border border-[#EAE6F0] shadow-xs space-y-4">
        {/* Author row */}
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-opacity"
            onClick={() => {
              viewUserProfile(activePost.authorUsername, activePost.isAnonymous, activePost.authorCampus);
            }}
            title={`View ${activePost.authorName}'s public profile`}
          >
            {activePost.isAnonymous ? (
              <BopoiAnonymousAvatar size="sm" idPrefix={`detail-${activePost.id}`} />
            ) : (
              <CampusCharacterAvatar
                value={activePost.authorAvatar}
                seed={activePost.authorUsername}
                size={40}
                rounded="full"
                className="ring-2 ring-[#FFC928]"
              />
            )}
            <div>
              <span className="text-sm font-black text-[#191525] block hover:underline">
                {activePost.authorName}
              </span>
              <span className="text-xs text-[#706B7D] block">
                {activePost.createdAt} {activePost.authorCampus && `• ${activePost.authorCampus}`}
              </span>
            </div>
          </div>

          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
            {activePost.type === 'confession' ? 'Confession' : 'Public Post'}
          </span>
        </div>

        {/* Post Title if discussion */}
        {activePost.title && (
          <h2 className="text-base sm:text-lg font-black text-[#191525] leading-snug">
            {activePost.title}
          </h2>
        )}

        {/* Post Content */}
        <p className="text-sm sm:text-base text-[#191525] font-medium leading-relaxed">
          <MentionText text={activePost.content} />
        </p>

        {/* Hashtags */}
        {activePost.hashtags && activePost.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {activePost.hashtags.map((tag) => (
              <span key={tag} className="text-xs font-bold text-[#5420F5]">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Action Toolbar */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-slate-500 text-xs">
          {/* Like */}
          <button
            onClick={() => togglePostLike(activePost.id)}
            className={`flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-pink-50 ${
              activePost.hasLiked ? 'text-[#F52D85] font-bold' : 'hover:text-[#F52D85]'
            }`}
          >
            <Heart className={`w-4 h-4 ${activePost.hasLiked ? 'fill-[#F52D85]' : ''}`} />
            <span>{activePost.likes}</span>
          </button>

          {/* Comments count */}
          <div className="flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4" />
            <span>{activePost.commentsCount}</span>
          </div>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 hover:text-[#5420F5] transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-[#F0EBFF]"
            title="Share post off-campus"
          >
            <Share2 className="w-4 h-4" />
            <span>{activePost.sharesCount || 0}</span>
          </button>

          {/* Bookmark */}
          <button
            onClick={() => togglePostBookmark(activePost.id)}
            className={`flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-purple-50 ${
              activePost.isBookmarked ? 'text-[#5420F5]' : 'hover:text-[#5420F5]'
            }`}
          >
            {activePost.isBookmarked ? (
              <BookmarkedIcon size={16} />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* 3. Threaded Comments Section */}
      <SocialCommentsThread
        postId={activePost.id}
        comments={activePost.comments || []}
      />
    </div>
  );
};
