import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Search, Loader2, Film, RefreshCw, History, Flame, Clock } from 'lucide-react';
import { KlipyGifItem } from '../../types/index.ts';

interface KlipyGifPickerProps {
  isOpen: boolean;
  onSelect: (gif: KlipyGifItem) => void;
  onClose: () => void;
  customerId?: string;
}

const QUICK_CATEGORIES = [
  { label: 'Trending', query: '' },
  { label: 'Laugh', query: 'laugh' },
  { label: 'Shocked', query: 'shocked' },
  { label: 'Hype', query: 'hype' },
  { label: 'Love', query: 'love' },
  { label: 'Clap', query: 'applause' },
  { label: 'Skull', query: 'crying laughing' },
];

const MAX_RECENT_SEARCHES = 8;
const MAX_RECENT_GIFS = 10;
const MAX_MOST_USED_GIFS = 24;

interface UsedGifEntry {
  gif: KlipyGifItem;
  count: number;
  lastUsedAt: number;
}

function getRecentStorageKey(customerId: string): string {
  return `bopoi_klipy_recent_searches_${customerId || 'default'}`;
}

function getRecentGifsStorageKey(customerId: string): string {
  return `bopoi_klipy_recent_gifs_${customerId || 'default'}`;
}

function getMostUsedStorageKey(customerId: string): string {
  return `bopoi_klipy_most_used_${customerId || 'default'}`;
}

function loadRecentSearches(customerId: string): string[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(getRecentStorageKey(customerId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).slice(0, MAX_RECENT_SEARCHES)
      : [];
  } catch {
    return [];
  }
}

function loadMostUsedGifs(customerId: string): UsedGifEntry[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(getMostUsedStorageKey(customerId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is UsedGifEntry =>
          Boolean(entry && entry.gif && entry.gif.id && (entry.gif.url || entry.gif.previewUrl))
      )
      .sort((a, b) => (b.count - a.count) || (b.lastUsedAt - a.lastUsedAt))
      .slice(0, MAX_MOST_USED_GIFS);
  } catch {
    return [];
  }
}

function loadRecentGifs(customerId: string): KlipyGifItem[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(getRecentGifsStorageKey(customerId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (gif): gif is KlipyGifItem =>
          Boolean(gif && gif.id && (gif.url || gif.previewUrl))
      )
      .slice(0, MAX_RECENT_GIFS);
  } catch {
    return [];
  }
}

export const KlipyGifPicker: React.FC<KlipyGifPickerProps> = ({
  isOpen,
  onSelect,
  onClose,
  customerId = 'bopoi_campus_student',
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [items, setItems] = useState<KlipyGifItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUnconfigured, setIsUnconfigured] = useState(false);
  const [failedVideos, setFailedVideos] = useState<Record<string, boolean>>({});
  const [recentSearches, setRecentSearches] = useState<string[]>(() =>
    loadRecentSearches(customerId)
  );
  const [recentGifs, setRecentGifs] = useState<KlipyGifItem[]>(() =>
    loadRecentGifs(customerId)
  );
  const [mostUsedGifs, setMostUsedGifs] = useState<UsedGifEntry[]>(() =>
    loadMostUsedGifs(customerId)
  );
  const [specialTab, setSpecialTab] = useState<'none' | 'recent' | 'most-used'>('none');
  const activeQueryRef = useRef('');

  useEffect(() => {
    setRecentSearches(loadRecentSearches(customerId));
    setRecentGifs(loadRecentGifs(customerId));
    setMostUsedGifs(loadMostUsedGifs(customerId));
  }, [customerId]);

  const recordRecentSearch = useCallback(
    (rawTerm: string) => {
      const clean = rawTerm.trim();
      if (clean.length < 2) return;
      setRecentSearches((prev) => {
        const next = [
          clean,
          ...prev.filter((item) => item.toLowerCase() !== clean.toLowerCase()),
        ].slice(0, MAX_RECENT_SEARCHES);
        try {
          localStorage.setItem(getRecentStorageKey(customerId), JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [customerId]
  );

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(getRecentStorageKey(customerId));
    } catch {
      // ignore
    }
  };

  const recordUsedGif = useCallback(
    (gif: KlipyGifItem) => {
      setMostUsedGifs((prev) => {
        const existing = prev.find((e) => e.gif.id === gif.id);
        const updated: UsedGifEntry = {
          gif,
          count: (existing?.count || 0) + 1,
          lastUsedAt: Date.now(),
        };
        const next = [
          updated,
          ...prev.filter((e) => e.gif.id !== gif.id),
        ]
          .sort((a, b) => (b.count - a.count) || (b.lastUsedAt - a.lastUsedAt))
          .slice(0, MAX_MOST_USED_GIFS);
        try {
          localStorage.setItem(getMostUsedStorageKey(customerId), JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [customerId]
  );

  const recordRecentGif = useCallback(
    (gif: KlipyGifItem) => {
      setRecentGifs((prev) => {
        const next = [
          gif,
          ...prev.filter((item) => item.id !== gif.id),
        ].slice(0, MAX_RECENT_GIFS);
        try {
          localStorage.setItem(getRecentGifsStorageKey(customerId), JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [customerId]
  );

  const clearRecentGifs = () => {
    setRecentGifs([]);
    try {
      localStorage.removeItem(getRecentGifsStorageKey(customerId));
    } catch {
      // ignore
    }
  };

  const clearMostUsedGifs = () => {
    setMostUsedGifs([]);
    try {
      localStorage.removeItem(getMostUsedStorageKey(customerId));
    } catch {
      // ignore
    }
  };

  const handleSelectGif = (gif: KlipyGifItem) => {
    if (debouncedQuery) {
      recordRecentSearch(debouncedQuery);
    }
    recordRecentGif(gif);
    recordUsedGif(gif);
    onSelect(gif);
    onClose();
  };

  // Debounce typing so we don't burn Klipy rate limits on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      const clean = searchInput.trim();
      setDebouncedQuery(clean);
      setPage(1);
    }, 320);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    activeQueryRef.current = debouncedQuery;
  }, [debouncedQuery]);

  const fetchGifs = useCallback(
    async (query: string, targetPage: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setErrorMsg(null);

      try {
        const qs = new URLSearchParams({
          page: String(targetPage),
          per_page: '24',
          customer_id: customerId,
        });
        if (query) {
          qs.set('q', query);
        }

        const endpoint = query
          ? `/api/gifs/search?${qs.toString()}`
          : `/api/gifs/trending?${qs.toString()}`;

        const res = await fetch(endpoint, {
          headers: { Accept: 'application/json' },
        });
        const contentType = res.headers.get('content-type') || '';
        const json = contentType.includes('application/json')
          ? await res.json().catch(() => null)
          : await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          setIsUnconfigured(json?.configured === false);
          setErrorMsg(
            json?.configured === false
              ? 'KLIPY API key is not configured on this deployment yet.'
              : json?.error ||
                  (!contentType.includes('application/json') && res.ok
                    ? 'GIF API endpoint returned HTML instead of JSON. Redeploy API routes and set KLIPY_API_KEY.'
                    : 'Could not load GIFs right now.')
          );
          if (!append) setItems([]);
          setHasNext(false);
          return;
        }

        setIsUnconfigured(false);
        const fetched: KlipyGifItem[] = Array.isArray(json.items) ? json.items : [];
        setItems((prev) => {
          if (!append) return fetched;
          const seen = new Set(prev.map((g) => g.id));
          return [...prev, ...fetched.filter((g) => !seen.has(g.id))];
        });
        setHasNext(Boolean(json.hasNext));

        // Save custom search once results settle and match current query
        if (!append && query.trim().length >= 2 && fetched.length > 0) {
          setTimeout(() => {
            if (activeQueryRef.current === query) {
              recordRecentSearch(query);
            }
          }, 700);
        }
      } catch {
        setErrorMsg('Unable to reach the GIF service. Try again in a moment.');
        if (!append) setItems([]);
        setHasNext(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [customerId, recordRecentSearch]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setSpecialTab('none');
      return;
    }
    if (specialTab !== 'none') return;
    fetchGifs(debouncedQuery, 1, false);
  }, [isOpen, specialTab, debouncedQuery, fetchGifs]);

  if (!isOpen) return null;

  const renderGifMedia = (gif: KlipyGifItem) => {
    const useImgFallback = !gif.mp4Url || Boolean(failedVideos[gif.id]);
    if (!useImgFallback) {
      return (
        <video
          src={gif.mp4Url}
          poster={gif.previewUrl}
          autoPlay
          loop
          muted
          playsInline
          onError={() =>
            setFailedVideos((prev) => ({ ...prev, [gif.id]: true }))
          }
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
        />
      );
    }
    return (
      <img
        src={gif.previewUrl || gif.url}
        alt={gif.title}
        loading="eager"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
      />
    );
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[82vh] flex flex-col shadow-2xl border border-[#EAE6F0] dark:border-[#262036] overflow-hidden"
      >
        <div className="w-10 h-1 bg-[#EAE6F0] dark:bg-[#262036] rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#EAE6F0] dark:border-[#262036] flex items-center justify-between gap-3 bg-white dark:bg-[#0E0C14] shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-lg bg-[#F0EBFF] dark:bg-[#231942] text-[#5420F5] dark:text-[#B9A4FF] text-[11px] font-black tracking-wide">
              GIF
            </span>
            <h3 className="text-sm sm:text-base font-bold text-[#191525] dark:text-[#F4F2FA]">
              Choose a GIF
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] -mr-2 rounded-full flex items-center justify-center text-slate-400 dark:text-[#9E97B3] hover:text-black dark:hover:text-white hover:bg-[#FAF9FC] dark:hover:bg-[#171322] cursor-pointer transition-colors"
            aria-label="Close GIF picker"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input + Quick Reaction Chips */}
        <div className="px-4 pt-3 pb-2.5 border-b border-[#EAE6F0] dark:border-[#262036] space-y-2.5 bg-[#FAF9FC] dark:bg-[#171322] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const clean = searchInput.trim();
              setSpecialTab('none');
              setDebouncedQuery(clean);
              setPage(1);
              if (clean.length >= 2) {
                recordRecentSearch(clean);
              }
            }}
            className="relative flex items-center"
          >
            <Search className="w-4 h-4 text-slate-400 dark:text-[#7D7594] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSpecialTab('none');
                setSearchInput(e.target.value);
              }}
              placeholder="Search Klipy GIFs..."
              className="w-full pl-9 pr-9 py-2 rounded-xl bg-white dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] text-base sm:text-xs text-[#191525] dark:text-[#F4F2FA] placeholder:text-slate-400 dark:placeholder:text-[#7D7594] focus:outline-none focus:border-[#5420F5]"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSpecialTab('none');
                  setSearchInput('');
                  setDebouncedQuery('');
                  setPage(1);
                }}
                className="min-w-[34px] min-h-[34px] flex items-center justify-center text-slate-400 dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-white absolute right-1.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {QUICK_CATEGORIES.map((cat) => {
              const active =
                specialTab === 'none' &&
                (cat.query === ''
                  ? !debouncedQuery
                  : debouncedQuery.toLowerCase() === cat.query);
              return (
                <React.Fragment key={cat.label}>
                  <button
                    type="button"
                    onClick={() => {
                      setSpecialTab('none');
                      setSearchInput(cat.query);
                      setDebouncedQuery(cat.query);
                      setPage(1);
                    }}
                    className={`min-h-[34px] px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 border ${
                      active
                        ? 'bg-[#5420F5] text-white border-[#5420F5]'
                        : 'bg-white dark:bg-[#0E0C14] text-[#706B7D] dark:text-[#9E97B3] border-[#EAE6F0] dark:border-[#262036] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                    }`}
                  >
                    {cat.label}
                  </button>

                  {cat.query === '' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput('');
                        setDebouncedQuery('');
                        setSpecialTab('recent');
                      }}
                      className={`min-h-[34px] px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 border inline-flex items-center gap-1 tabular-nums ${
                        specialTab === 'recent'
                          ? 'bg-[#5420F5] text-white border-[#5420F5]'
                          : 'bg-white dark:bg-[#0E0C14] text-[#706B7D] dark:text-[#9E97B3] border-[#EAE6F0] dark:border-[#262036] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>Recent</span>
                    </button>
                  )}

                  {cat.query === '' && mostUsedGifs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput('');
                        setDebouncedQuery('');
                        setSpecialTab('most-used');
                      }}
                      className={`min-h-[34px] px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 border inline-flex items-center gap-1 tabular-nums ${
                        specialTab === 'most-used'
                          ? 'bg-[#5420F5] text-white border-[#5420F5]'
                          : 'bg-white dark:bg-[#0E0C14] text-[#706B7D] dark:text-[#9E97B3] border-[#EAE6F0] dark:border-[#262036] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                      }`}
                    >
                      <Flame className="w-3 h-3" />
                      <span>Most Used</span>
                    </button>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* GIF Grid Body */}
        <div className="flex-1 overflow-y-auto p-3.5 bg-white dark:bg-[#0E0C14] min-h-[240px]">
          {specialTab === 'recent' ? (
            recentGifs.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center mx-auto text-[#5420F5] dark:text-[#B9A4FF]">
                  <Clock className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-[#191525] dark:text-[#F4F2FA]">
                  No recent GIFs yet
                </p>
                <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] max-w-xs mx-auto leading-relaxed">
                  The last 10 GIFs you pick will be saved right here for quick reuse.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#706B7D] dark:text-[#9E97B3] tabular-nums">
                    <Clock className="w-3 h-3 text-[#5420F5] dark:text-[#B9A4FF]" />
                    <span>Recently selected ({recentGifs.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={clearRecentGifs}
                    className="text-[11px] font-bold text-[#706B7D] dark:text-[#9E97B3] hover:text-[#5420F5] dark:hover:text-[#B9A4FF] cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {recentGifs.map((gif) => (
                    <button
                      key={gif.id}
                      type="button"
                      onClick={() => handleSelectGif(gif)}
                      className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] hover:border-[#5420F5] transition-all cursor-pointer focus:outline-none"
                      title={gif.title || 'Recent GIF'}
                    >
                      {renderGifMedia(gif)}
                    </button>
                  ))}
                </div>
              </div>
            )
          ) : specialTab === 'most-used' ? (
            mostUsedGifs.length === 0 ? (
              <div className="py-12 text-center space-y-1.5">
                <p className="text-xs font-bold text-[#191525] dark:text-[#F4F2FA]">
                  No most used GIFs yet
                </p>
                <p className="text-xs text-[#706B7D] dark:text-[#9E97B3]">
                  GIFs you send often will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#706B7D] dark:text-[#9E97B3] tabular-nums">
                    <Flame className="w-3 h-3 text-[#F52D85]" />
                    <span>Most used ({mostUsedGifs.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      clearMostUsedGifs();
                      setSpecialTab('none');
                    }}
                    className="text-[11px] font-bold text-[#706B7D] dark:text-[#9E97B3] hover:text-[#5420F5] dark:hover:text-[#B9A4FF] cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {mostUsedGifs.map((entry) => (
                    <button
                      key={entry.gif.id}
                      type="button"
                      onClick={() => handleSelectGif(entry.gif)}
                      className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] hover:border-[#5420F5] transition-all cursor-pointer focus:outline-none"
                      title={`${entry.gif.title || 'GIF'} · Used ${entry.count}x`}
                    >
                      {renderGifMedia(entry.gif)}
                    </button>
                  ))}
                </div>
              </div>
            )
          ) : (
            <>
              {!debouncedQuery && recentSearches.length > 0 && (
                <div className="mb-3 pb-3 border-b border-[#EAE6F0] dark:border-[#262036]">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#706B7D] dark:text-[#9E97B3]">
                      <History className="w-3 h-3" />
                      <span>Recent searches</span>
                    </span>
                    <button
                      type="button"
                      onClick={clearRecentSearches}
                      className="text-[11px] font-bold text-[#706B7D] dark:text-[#9E97B3] hover:text-[#5420F5] dark:hover:text-[#B9A4FF] cursor-pointer transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => {
                          setSpecialTab('none');
                          setSearchInput(term);
                          setDebouncedQuery(term);
                          setPage(1);
                          recordRecentSearch(term);
                        }}
                        className="min-h-[34px] px-3 py-1 rounded-xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] hover:border-[#5420F5] dark:hover:border-[#8E72FF] text-xs font-bold text-[#191525] dark:text-[#F4F2FA] hover:text-[#5420F5] dark:hover:text-[#B9A4FF] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!debouncedQuery && mostUsedGifs.length > 0 && (
                <div className="mb-3 pb-3 border-b border-[#EAE6F0] dark:border-[#262036]">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#706B7D] dark:text-[#9E97B3]">
                      <Flame className="w-3 h-3 text-[#F52D85]" />
                      <span>Most used</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSpecialTab('most-used')}
                      className="text-[11px] font-bold text-[#5420F5] dark:text-[#B9A4FF] hover:underline cursor-pointer tabular-nums"
                    >
                      See all ({mostUsedGifs.length})
                    </button>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
                    {mostUsedGifs.slice(0, 8).map((entry) => (
                      <button
                        key={entry.gif.id}
                        type="button"
                        onClick={() => handleSelectGif(entry.gif)}
                        className="group relative w-[96px] sm:w-[104px] aspect-[4/3] rounded-xl overflow-hidden bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] hover:border-[#5420F5] transition-all cursor-pointer focus:outline-none shrink-0"
                        title={`${entry.gif.title || 'GIF'} · Used ${entry.count}x`}
                      >
                        {renderGifMedia(entry.gif)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Array.from({ length: 9 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="aspect-[4/3] rounded-xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] animate-pulse"
                    />
                  ))}
                </div>
              ) : errorMsg ? (
                <div className="py-10 px-4 text-center space-y-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center mx-auto text-[#5420F5] dark:text-[#8E6BFF]">
                    <Film className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-[#191525] dark:text-[#F4F2FA]">
                    {isUnconfigured ? 'KLIPY API Key Needed' : 'Unable to Load GIFs'}
                  </p>
                  <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] max-w-xs mx-auto leading-relaxed">
                    {isUnconfigured
                      ? 'Add KLIPY_API_KEY to your server environment variables to enable trending and search GIFs.'
                      : errorMsg}
                  </p>
                  {!isUnconfigured && (
                    <button
                      type="button"
                      onClick={() => fetchGifs(debouncedQuery, 1, false)}
                      className="min-h-[40px] px-4 py-2 rounded-xl bg-[#F0EBFF] dark:bg-[#231A45] text-[#5420F5] dark:text-[#A78BFA] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#5420F5] hover:text-white transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              ) : items.length === 0 ? (
                <div className="py-12 text-center space-y-1.5">
                  <p className="text-xs font-bold text-[#191525] dark:text-[#F4F2FA]">No GIFs found</p>
                  <p className="text-xs text-[#706B7D] dark:text-[#9E97B3]">
                    Try another reaction keyword like &ldquo;laugh&rdquo; or &ldquo;hype&rdquo;.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {items.map((gif) => (
                      <button
                        key={gif.id}
                        type="button"
                        onClick={() => handleSelectGif(gif)}
                        className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] hover:border-[#5420F5] transition-all cursor-pointer focus:outline-none"
                        title={gif.title}
                      >
                        {renderGifMedia(gif)}
                      </button>
                    ))}
                  </div>

                  {hasNext && (
                    <div className="flex justify-center pt-1">
                      <button
                        type="button"
                        disabled={loadingMore}
                        onClick={() => {
                          const nextPage = page + 1;
                          setPage(nextPage);
                          fetchGifs(debouncedQuery, nextPage, true);
                        }}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-[#FAF9FC] dark:bg-[#171322] hover:bg-[#F0EBFF] dark:hover:bg-[#231942] border border-[#EAE6F0] dark:border-[#262036] text-xs font-bold text-[#5420F5] dark:text-[#B9A4FF] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Loading...</span>
                          </>
                        ) : (
                          <span>Load more GIFs</span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Attribution */}
        <div className="px-4 py-2 border-t border-[#EAE6F0] dark:border-[#262036] bg-[#FAF9FC] dark:bg-[#171322] flex items-center justify-between text-[11px] text-[#706B7D] dark:text-[#9E97B3] shrink-0">
          <span>Tap a GIF to attach</span>
          <span className="font-bold text-[#191525] dark:text-[#F4F2FA]">Powered by KLIPY</span>
        </div>
      </div>
    </div>
  );
};
