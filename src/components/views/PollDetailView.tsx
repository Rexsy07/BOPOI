import React from 'react';
import {
  ArrowLeft,
  Clock,
  Share2,
  Bookmark,
  Heart,
  MessageCircle,
  CheckCircle2,
} from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { SocialCommentsThread } from '../comments/SocialCommentsThread.tsx';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { PersonaMaskIcon } from '../brand/masks/PersonaMaskIcon.tsx';

export const PollDetailView: React.FC = () => {
  const {
    selectedPost,
    socialPosts,
    setActiveView,
    goBack,
    votePoll,
    togglePostLike,
    togglePostBookmark,
    openPostShare,
    viewUserProfile,
    setIsCreateModalOpen,
  } = useBopoi();

  const post =
    socialPosts.find((p) => p.id === selectedPost?.id) ||
    socialPosts.find((p) => p.type === 'poll') ||
    socialPosts[0];

  if (!post) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="bg-white rounded-3xl p-8 border border-[#EAE6F0] shadow-xs space-y-3">
          <p className="text-sm font-black text-[#191525]">No active poll selected</p>
          <p className="text-xs text-[#706B7D]">
            Launch a campus poll to let students vote and debate in real time.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => goBack('polls')}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black rounded-xl shadow-md shadow-[#5420F5]/20 cursor-pointer transition-all"
            >
              + Launch a Poll
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalVotes = post.pollTotalVotes || 1;
  const hasVoted = Boolean(post.userVotedOptionId);

  return (
    <div className="w-full max-w-2xl mx-auto px-3 sm:px-4 py-5 pb-20 space-y-5 animate-fade-in overflow-x-clip">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => goBack('discover')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 text-slate-700 hover:text-slate-900 font-bold text-xs shadow-2xs transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => togglePostBookmark(post.id)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              post.isBookmarked
                ? 'bg-purple-50 border-purple-200 text-purple-600'
                : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
            }`}
            aria-label="Bookmark poll"
          >
            <Bookmark className={`w-4 h-4 ${post.isBookmarked ? 'fill-purple-600' : ''}`} />
          </button>
          <button
            onClick={() => openPostShare(post)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Poll</span>
          </button>
        </div>
      </div>

      {/* Main Poll Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-purple-600" />

        <div className="p-5 sm:p-7 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div
              onClick={() =>
                viewUserProfile(
                  post.authorUsername || post.authorName,
                  post.isAnonymous,
                  post.authorCampus
                )
              }
              className="flex items-center gap-3 cursor-pointer group min-w-0"
            >
              {post.isAnonymous ? (
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform shrink-0">
                  <PersonaMaskIcon mask="campus-pollster" size={26} />
                </div>
              ) : (
                <CampusCharacterAvatar
                  value={post.authorAvatar}
                  seed={post.authorUsername || post.authorName}
                  size={44}
                  rounded="2xl"
                  className="ring-2 ring-amber-100 group-hover:scale-105 transition-transform shrink-0"
                />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-black text-slate-900 text-sm group-hover:text-purple-600 transition-colors truncate">
                    {post.isAnonymous ? 'Anonymous Pollster' : post.authorName}
                  </span>
                  {!post.isAnonymous && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 fill-purple-100 shrink-0" />
                  )}
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
                    📊 Live Poll
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="truncate">{post.authorCampus || 'Campus Wide'}</span>
                  <span>•</span>
                  <span>{post.createdAt}</span>
                </div>
              </div>
            </div>

            {post.pollExpiresIn && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-full shrink-0">
                <Clock className="w-3.5 h-3.5" /> {post.pollExpiresIn}
              </span>
            )}
          </div>

          {/* Question */}
          <div className="space-y-2">
            {post.title && (
              <span className="text-xs font-black uppercase tracking-wider text-purple-600">
                {post.title}
              </span>
            )}
            <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-snug break-words">
              {post.content}
            </h1>
          </div>

          {/* Interactive Voting Options */}
          {post.pollOptions && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 gap-2.5">
                {post.pollOptions.map((opt) => {
                  const isSelected = post.userVotedOptionId === opt.id;
                  const pct = Math.min(100, Math.round((opt.votes / totalVotes) * 100));
                  return (
                    <button
                      key={opt.id}
                      onClick={() => votePoll(post.id, opt.id)}
                      className={`relative w-full text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
                        isSelected
                          ? 'border-[#5420F5] bg-[#F0EBFF]/40 shadow-xs'
                          : 'border-slate-200/90 hover:border-purple-300 bg-slate-50/60 hover:bg-white'
                      }`}
                    >
                      {/* Vote Progress Fill */}
                      <div
                        className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                          isSelected ? 'bg-[#5420F5]/15' : 'bg-slate-200/60'
                        }`}
                        style={{ width: `${pct}%` }}
                      />

                      <div className="relative z-10 flex items-center justify-between gap-3">
                        <span
                          className={`text-xs sm:text-sm font-bold ${
                            isSelected ? 'text-[#5420F5]' : 'text-slate-800'
                          }`}
                        >
                          {opt.text}
                        </span>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs font-black ${
                              isSelected ? 'text-[#5420F5]' : 'text-slate-600'
                            }`}
                          >
                            {pct}%
                          </span>
                          {isSelected ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#5420F5] text-white text-[10px] font-black shrink-0">
                              <CheckCircle2 className="w-3 h-3" /> Voted
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-[#5420F5] shrink-0">Vote</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Total Votes Summary */}
              <div className="flex items-center justify-between text-xs text-[#706B7D] font-medium px-1">
                <span>{(post.pollTotalVotes || totalVotes).toLocaleString()} total votes</span>
                <span>{hasVoted ? 'Tap any option to change vote' : 'Tap an option to vote'}</span>
              </div>
            </div>
          )}

          {/* Engagement Strip */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => togglePostLike(post.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  post.hasLiked
                    ? 'bg-rose-50 text-rose-600 border border-rose-200/60'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <Heart className={`w-4 h-4 ${post.hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{post.likes}</span>
              </button>

              <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">
                <MessageCircle className="w-4 h-4" />
                <span>{post.commentsCount} Argument Threads</span>
              </div>
            </div>

            <button
              onClick={() => openPostShare(post)}
              className="text-xs font-bold text-purple-600 hover:text-purple-700 inline-flex items-center gap-1 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" /> Share Poll Card
            </button>
          </div>
        </div>
      </div>

      {/* Debate & Comments Thread */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-sm font-black text-slate-900">Defend Your Vote in the Comments</h3>
          <p className="text-xs text-slate-500">
            Why did you pick that option? Drop your hot take below.
          </p>
        </div>
        <SocialCommentsThread post={post} />
      </div>
    </div>
  );
};
