import React, { useState, useMemo } from 'react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { computePostTrendingVelocityScore } from '../../lib/supabase.ts';
import { ChevronLeft, Plus } from 'lucide-react';
import { CreateConfessionIcon } from '../brand/icons/index.ts';
import { FeedPostRow } from '../feed/FeedPostRow.tsx';

export const ConfessionsView: React.FC = () => {
  const { socialPosts, accounts, goBack, openCreateWithHashtag } = useBopoi();

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'latest' | 'top'>('latest');

  const verifiedUsernameSet = useMemo(() => {
    const set = new Set<string>();
    for (const u of accounts || []) {
      if (u.isVerified || u.isCreator) set.add(u.username.toLowerCase());
    }
    return set;
  }, [accounts]);

  const filteredConfessions = useMemo(() => {
    const confessions = socialPosts.filter((p) => p.type === 'confession');
    const list =
      activeCategory === 'All'
        ? [...confessions]
        : confessions.filter((p) => p.category?.toLowerCase() === activeCategory.toLowerCase());
    const now = Date.now();
    if (sortOrder === 'top') {
      list.sort(
        (a, b) =>
          computePostTrendingVelocityScore(b, now) - computePostTrendingVelocityScore(a, now)
      );
    } else {
      list.sort((a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0));
    }
    return list.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  }, [socialPosts, activeCategory, sortOrder]);

  return (
    <div className="w-full flex flex-col bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA] pb-12">
      {/* 1. Sticky Hairline Header */}
      <div className="sticky top-[52px] lg:top-0 z-20 bg-white/95 dark:bg-[#0E0C14]/95 backdrop-blur-md border-b border-[#EAE6F0] dark:border-[#262036]">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => goBack('home')}
              className="min-w-[44px] min-h-[44px] sm:min-w-[40px] sm:min-h-[40px] -ml-2 rounded-full hover:bg-[#FAF9FC] dark:hover:bg-[#171322] text-[#191525] dark:text-[#F4F2FA] transition-colors cursor-pointer flex items-center justify-center shrink-0"
              title="Go back"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <CreateConfessionIcon size={20} />
            <div className="min-w-0 flex items-baseline gap-2">
              <h1 className="text-base sm:text-lg font-black text-[#191525] dark:text-[#F4F2FA] tracking-tight truncate">
                Confessions
              </h1>
              <span className="text-xs font-bold text-[#706B7D] dark:text-[#9E97B3] tabular-nums shrink-0">
                · {filteredConfessions.length}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openCreateWithHashtag(undefined, 'confession')}
            className="min-h-[40px] px-3.5 py-2 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-extrabold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.75]" />
            <span>Confess</span>
          </button>
        </div>
      </div>

      {/* 2. Category Filter & Sort Strip */}
      <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-2.5 border-b border-[#EAE6F0] dark:border-[#262036] bg-white dark:bg-[#0E0C14] overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0">
          {['All', 'Love', 'School', 'Life', 'Fun'].map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525]'
                    : 'bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="inline-flex items-center rounded-xl bg-[#FAF9FC] dark:bg-[#171322] p-0.5 border border-[#EAE6F0] dark:border-[#262036] shrink-0">
          <button
            type="button"
            onClick={() => setSortOrder('latest')}
            className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
              sortOrder === 'latest'
                ? 'bg-white dark:bg-[#231A45] text-[#5420F5] dark:text-[#B9A7FF] shadow-2xs'
                : 'text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
            }`}
          >
            Latest
          </button>
          <button
            type="button"
            onClick={() => setSortOrder('top')}
            className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
              sortOrder === 'top'
                ? 'bg-white dark:bg-[#231A45] text-[#5420F5] dark:text-[#B9A7FF] shadow-2xs'
                : 'text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
            }`}
          >
            Top
          </button>
        </div>
      </div>

      {/* 3. Hairline-Divided Stream */}
      {filteredConfessions.length === 0 ? (
        <div className="px-6 py-16 text-center space-y-3 border-b border-[#EAE6F0] dark:border-[#262036]">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center mx-auto">
            <CreateConfessionIcon size={26} />
          </div>
          <div>
            <p className="text-sm font-black text-[#191525] dark:text-[#F4F2FA]">
              {activeCategory === 'All'
                ? 'No campus confessions yet'
                : `No ${activeCategory} confessions yet`}
            </p>
            <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] mt-1">
              Be the first to share an anonymous confession with the campus community.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openCreateWithHashtag(undefined, 'confession')}
            className="mt-2 min-h-[44px] px-5 py-2.5 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-extrabold rounded-xl cursor-pointer transition-colors"
          >
            Spill a Confession
          </button>
        </div>
      ) : (
        <div className="flex flex-col">
          {filteredConfessions.map((post) => (
            <FeedPostRow
              key={post.id}
              post={post}
              verifiedUsernameSet={verifiedUsernameSet}
              showReportButton={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};
