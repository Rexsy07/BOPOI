import React from 'react';
import { Plus } from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import {
  InboxShortcutIcon,
  HomeFeedNavIcon,
  DiscoverCompassNavIcon,
  ProfileShieldNavIcon,
} from '../brand/icons/index.ts';

export const BottomNavBar: React.FC = () => {
  const { activeView, setActiveView, unreadCount, setIsCreateModalOpen } = useBopoi();

  const isHomeActive =
    activeView === 'home' ||
    activeView === 'confessions' ||
    activeView === 'polls' ||
    activeView === 'poll-detail' ||
    activeView === 'discussions' ||
    activeView === 'rooms' ||
    activeView === 'room-detail' ||
    activeView === 'post-detail';

  const isDiscoverActive = activeView === 'discover';
  const isInboxActive = activeView === 'inbox' || activeView === 'message-detail';
  const isProfileActive =
    activeView === 'profile' || activeView === 'saved' || activeView === 'public-profile';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 backdrop-blur-md border-t border-[#EAE6F0] px-3 sm:px-6 flex items-center justify-around select-none shadow-lg">
      {/* 1. Home */}
      <button
        onClick={() => setActiveView('home')}
        className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-all cursor-pointer ${
          isHomeActive ? 'text-[#5420F5]' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className={isHomeActive ? 'scale-110 transition-transform' : 'opacity-75'}>
          <HomeFeedNavIcon size={22} />
        </div>
        <span className={`text-[10px] mt-0.5 ${isHomeActive ? 'font-black' : 'font-semibold'}`}>
          Home
        </span>
      </button>

      {/* 2. Discover */}
      <button
        onClick={() => setActiveView('discover')}
        className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-all cursor-pointer ${
          isDiscoverActive ? 'text-[#5420F5]' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className={isDiscoverActive ? 'scale-110 transition-transform' : 'opacity-75'}>
          <DiscoverCompassNavIcon size={22} />
        </div>
        <span className={`text-[10px] mt-0.5 ${isDiscoverActive ? 'font-black' : 'font-semibold'}`}>
          Discover
        </span>
      </button>

      {/* 3. Floating Central Plus / Create Button */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="relative -top-2.5 w-12 h-12 rounded-full bg-[#5420F5] hover:bg-[#4314E2] text-white flex items-center justify-center shadow-lg shadow-[#5420F5]/35 active:scale-95 transition-all cursor-pointer ring-4 ring-white shrink-0"
        title="Create Content"
      >
        <Plus className="w-6 h-6 stroke-[3]" />
      </button>

      {/* 4. Inbox */}
      <button
        onClick={() => setActiveView('inbox')}
        className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-all cursor-pointer relative ${
          isInboxActive ? 'text-[#5420F5]' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className="relative">
          <InboxShortcutIcon
            size={22}
            className={isInboxActive ? 'scale-110 transition-transform' : 'opacity-75'}
          />
          {Boolean(unreadCount && unreadCount > 0) && (
            <span className="absolute -top-1 -right-2 bg-[#F52D85] text-white text-[9px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
              {unreadCount}
            </span>
          )}
        </div>
        <span className={`text-[10px] mt-0.5 ${isInboxActive ? 'font-black' : 'font-semibold'}`}>
          Inbox
        </span>
      </button>

      {/* 5. Profile & Saved */}
      <button
        onClick={() => setActiveView('profile')}
        className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-all cursor-pointer ${
          isProfileActive ? 'text-[#5420F5]' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className={isProfileActive ? 'scale-110 transition-transform' : 'opacity-75'}>
          <ProfileShieldNavIcon size={22} />
        </div>
        <span className={`text-[10px] mt-0.5 ${isProfileActive ? 'font-black' : 'font-semibold'}`}>
          Profile
        </span>
      </button>
    </nav>
  );
};
