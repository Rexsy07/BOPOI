import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Loader2, Film, RefreshCw } from 'lucide-react';
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

  // Debounce typing so we don't burn Klipy rate limits on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
      setPage(1);
    }, 320);
    return () => clearTimeout(timer);
  }, [searchInput]);

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

        const res = await fetch(endpoint);
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          setIsUnconfigured(json?.configured === false);
          setErrorMsg(
            json?.configured === false
              ? 'KLIPY API key is not configured on the server yet.'
              : json?.error || 'Could not load GIFs right now.'
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
      } catch {
        setErrorMsg('Unable to reach the GIF service. Try again in a moment.');
        if (!append) setItems([]);
        setHasNext(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [customerId]
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
    if (!isOpen) return;
    fetchGifs(debouncedQuery, 1, false);
  }, [isOpen, debouncedQuery, fetchGifs]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[82vh] flex flex-col shadow-2xl border border-[#EAE6F0] overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#EAE6F0] flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-lg bg-[#F0EBFF] text-[#5420F5] text-[11px] font-black tracking-wide">
              GIF
            </span>
            <h3 className="text-sm sm:text-base font-bold text-[#191525]">
              Choose a GIF
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-black dark:hover:text-white cursor-pointer"
            aria-label="Close GIF picker"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input + Quick Reaction Chips */}
        <div className="px-4 pt-3 pb-2.5 border-b border-[#EAE6F0] space-y-2.5 bg-[#FAF9FC] shrink-0">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search Klipy GIFs..."
              className="w-full pl-9 pr-9 py-2 rounded-xl bg-white border border-[#EAE6F0] text-base sm:text-xs text-[#191525] placeholder:text-slate-400 focus:outline-none focus:border-[#5420F5]"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="p-1 text-slate-400 hover:text-[#191525] absolute right-2 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {QUICK_CATEGORIES.map((cat) => {
              const active =
                cat.query === '' ? !debouncedQuery : debouncedQuery.toLowerCase() === cat.query;
              return (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => {
                    setSearchInput(cat.query);
                    setDebouncedQuery(cat.query);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 border ${
                    active
                      ? 'bg-[#5420F5] text-white border-[#5420F5]'
                      : 'bg-white text-[#706B7D] border-[#EAE6F0] hover:text-[#191525]'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* GIF Grid Body */}
        <div className="flex-1 overflow-y-auto p-3.5 bg-white min-h-[240px]">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, idx) => (
                <div
                  key={idx}
                  className="aspect-[4/3] rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] animate-pulse"
                />
              ))}
            </div>
          ) : errorMsg ? (
            <div className="py-10 px-4 text-center space-y-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center justify-center mx-auto text-[#5420F5]">
                <Film className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-[#191525]">
                {isUnconfigured ? 'KLIPY API Key Needed' : 'Unable to Load GIFs'}
              </p>
              <p className="text-xs text-[#706B7D] max-w-xs mx-auto leading-relaxed">
                {isUnconfigured
                  ? 'Add KLIPY_API_KEY to your server environment variables to enable trending and search GIFs.'
                  : errorMsg}
              </p>
              {!isUnconfigured && (
                <button
                  type="button"
                  onClick={() => fetchGifs(debouncedQuery, 1, false)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#F0EBFF] dark:bg-[#231A45] text-[#5420F5] dark:text-[#A78BFA] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#5420F5] hover:text-white transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center space-y-1.5">
              <p className="text-xs font-bold text-[#191525]">No GIFs found</p>
              <p className="text-xs text-[#706B7D]">
                Try another reaction keyword like "laugh" or "hype".
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {items.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    onClick={() => {
                      onSelect(gif);
                      onClose();
                    }}
                    className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-[#FAF9FC] border border-[#EAE6F0] hover:border-[#5420F5] transition-all cursor-pointer focus:outline-none"
                    title={gif.title}
                  >
                    {gif.mp4Url ? (
                      <video
                        src={gif.mp4Url}
                        poster={gif.previewUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
                      />
                    ) : (
                      <img
                        src={gif.previewUrl || gif.url}
                        alt={gif.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
                      />
                    )}
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
                    className="px-4 py-2 rounded-xl bg-[#FAF9FC] hover:bg-[#F0EBFF] border border-[#EAE6F0] text-xs font-bold text-[#5420F5] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
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
        </div>

        {/* Footer Attribution */}
        <div className="px-4 py-2 border-t border-[#EAE6F0] bg-[#FAF9FC] flex items-center justify-between text-[11px] text-[#706B7D] shrink-0">
          <span>Tap a GIF to attach</span>
          <span className="font-bold text-[#191525]">Powered by KLIPY</span>
        </div>
      </div>
    </div>
  );
};
