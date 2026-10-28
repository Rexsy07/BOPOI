import React from 'react';
import {
  CampusLifeIcon,
  StudyExamIcon,
  HostelDormFoodIcon,
  CoffeeChillIcon,
  GamingIcon,
  MusicPodcastsIcon,
  TechCodingIcon,
  CampusSportsIcon,
  MidnightChatIcon,
  IdeasHacksIcon,
  DatingRomanceIcon,
  LaunchTrendingIcon,
} from './rooms/index.ts';

import {
  GetYourLinkIcon,
  ShareOnCampusIcon,
  ReceiveMessagesIcon,
  ShareCardsIcon,
  YourCampusIcon,
  RealPeopleIcon,
} from './onboarding/index.ts';

import {
  SmsChannelIcon,
  XTwitterIcon,
  TelegramChannelIcon,
  EmailChannelIcon,
  WhatsAppChannelIcon,
  FacebookChannelIcon,
} from './channels/index.ts';

import {
  MoneyFinancesIcon,
  FashionStyleIcon,
  StudentPostsIcon,
} from './feed/index.ts';

import {
  BookmarkedIcon,
  DeleteRemoveIcon,
  CopiedClipboardIcon,
  SearchEmptyIcon,
  SparklePolishIcon,
  InboxCaughtUpIcon,
  EditAliasIcon,
  InboxShortcutIcon,
} from './actions/index.ts';

import { PersonaMaskIcon } from '../masks/PersonaMaskIcon.tsx';

export type BopoiIconName =
  // 1. Community Room Topic & Category Icons
  | 'campus-life'
  | 'Campus Life & Academics'
  | 'study-exam'
  | 'Study & Exam Survival'
  | 'hostel-dorm'
  | 'Hostel & Dorm (Food)'
  | 'coffee-chill'
  | 'Coffee & Chill'
  | 'gaming'
  | 'Gaming & Entertainment'
  | 'music-podcasts'
  | 'Music & Podcasts'
  | 'tech-coding'
  | 'Tech & Coding'
  | 'campus-sports'
  | 'Campus Sports'
  | 'midnight-chat'
  | 'Midnight Chat / Late Night'
  | 'ideas-hacks'
  | 'Ideas & Life Hacks'
  | 'dating-romance'
  | 'Dating & Romance'
  | 'launch-trending'
  | 'Launch & Trending'
  // 2. How-It-Works & Onboarding Badges
  | 'get-link'
  | 'Get Your Link'
  | 'share-on-campus'
  | 'Share On Campus'
  | 'receive-messages'
  | 'Receive Messages'
  | 'share-cards'
  | 'Share Cards'
  | 'your-campus'
  | 'Your Campus'
  | 'real-people'
  | 'Real People'
  // 3. Off-Campus Share Channels
  | 'sms'
  | 'SMS / Text'
  | 'x-twitter'
  | 'X / Twitter'
  | 'telegram'
  | 'Telegram'
  | 'email'
  | 'Email'
  | 'whatsapp'
  | 'WhatsApp'
  | 'facebook'
  | 'Facebook'
  // 4. Feed Category Filters
  | 'money-finances'
  | 'Money & Finances'
  | 'fashion-style'
  | 'Fashion & Style'
  | 'student-posts'
  | 'Student Posts'
  // 5. Action Badges & Toast Notifications
  | 'bookmarked'
  | 'Bookmarked'
  | 'delete-remove'
  | 'Delete / Remove'
  | 'copied'
  | 'Copied to Clipboard'
  | 'search-empty'
  | 'Search Empty'
  | 'sparkle-polish'
  | 'Sparkle / Polish'
  | 'inbox-caught-up'
  | 'Inbox All Caught Up'
  | 'edit-alias'
  | 'Edit Alias'
  | 'inbox-shortcut'
  | 'Inbox Shortcut'
  | string;

interface BopoiIconProps {
  name: BopoiIconName;
  size?: number | string;
  className?: string;
  fallbackEmoji?: string;
}

/**
 * Universal Bopoi SVG Icon Component for all Custom Brand Assets
 */
export const BopoiIcon: React.FC<BopoiIconProps> = ({
  name,
  size = 24,
  className = '',
  fallbackEmoji = '',
}) => {
  const normalized = `${name || ''} ${fallbackEmoji || ''}`.toLowerCase().trim();

  // Community Room Topic & Category Icons
  if (normalized.includes('campus life') || normalized.includes('academics') || normalized === 'campus-life' || normalized.includes('🎓')) {
    return <CampusLifeIcon size={size} className={className} />;
  }
  if (normalized.includes('study') || normalized.includes('exam') || normalized === 'study-exam' || normalized.includes('📚')) {
    return <StudyExamIcon size={size} className={className} />;
  }
  if (normalized.includes('hostel') || normalized.includes('dorm') || normalized.includes('food') || normalized.includes('pizza') || normalized.includes('lifestyle') || normalized === 'hostel-dorm' || normalized.includes('🍕')) {
    return <HostelDormFoodIcon size={size} className={className} />;
  }
  if (normalized.includes('coffee') || normalized.includes('chill') || normalized === 'coffee-chill' || normalized.includes('☕')) {
    return <CoffeeChillIcon size={size} className={className} />;
  }
  if (normalized.includes('gaming') || normalized.includes('entertainment') || normalized === 'gaming' || normalized.includes('🎮')) {
    return <GamingIcon size={size} className={className} />;
  }
  if (normalized.includes('music') || normalized.includes('podcast') || normalized === 'music-podcasts' || normalized.includes('🎧')) {
    return <MusicPodcastsIcon size={size} className={className} />;
  }
  if (normalized.includes('tech') || normalized.includes('coding') || normalized.includes('gadget') || normalized === 'tech-coding' || normalized.includes('💻')) {
    return <TechCodingIcon size={size} className={className} />;
  }
  if (normalized.includes('sports') || normalized.includes('football') || normalized.includes('soccer') || normalized === 'campus-sports' || normalized.includes('⚽')) {
    return <CampusSportsIcon size={size} className={className} />;
  }
  if (normalized.includes('midnight') || normalized.includes('late night') || normalized === 'midnight-chat' || normalized.includes('🌙')) {
    return <MidnightChatIcon size={size} className={className} />;
  }
  if (normalized.includes('ideas') || normalized.includes('life hacks') || normalized.includes('hacks') || normalized === 'ideas-hacks' || normalized.includes('💡')) {
    return <IdeasHacksIcon size={size} className={className} />;
  }
  if (normalized.includes('dating') || normalized.includes('romance') || normalized.includes('relationship') || normalized.includes('love') || normalized === 'dating-romance' || normalized.includes('💖') || normalized.includes('❤️') || normalized.includes('💘')) {
    return <DatingRomanceIcon size={size} className={className} />;
  }
  if (normalized.includes('launch') || normalized.includes('trending') || normalized.includes('rocket') || normalized === 'launch-trending' || normalized.includes('🚀') || normalized.includes('🔥')) {
    return <LaunchTrendingIcon size={size} className={className} />;
  }

  // Persona & Anonymous Masks
  if (normalized.includes('confession') || normalized.includes('secret') || normalized.includes('🤫')) {
    return <PersonaMaskIcon mask="secret-confession" size={size} className={className} />;
  }
  if (normalized.includes('owl') || normalized.includes('🦉')) {
    return <PersonaMaskIcon mask="night-owl" size={size} className={className} />;
  }
  if (normalized.includes('rebel') || normalized.includes('⚡')) {
    return <PersonaMaskIcon mask="campus-rebel" size={size} className={className} />;
  }
  if (normalized.includes('scholar') || normalized.includes('brain') || normalized.includes('🧠')) {
    return <PersonaMaskIcon mask="midnight-scholar" size={size} className={className} />;
  }
  if (normalized.includes('ghost') || normalized.includes('phantom') || normalized.includes('👻')) {
    return <PersonaMaskIcon mask="hostel-phantom" size={size} className={className} />;
  }
  if (normalized.includes('chatter') || normalized.includes('incognito') || normalized.includes('🕶') || normalized.includes('👀')) {
    return <PersonaMaskIcon mask="phantom-chatter" size={size} className={className} />;
  }
  if (normalized.includes('mask') || normalized.includes('🎭')) {
    return <PersonaMaskIcon mask="masked-student" size={size} className={className} />;
  }

  // How-It-Works & Onboarding Badges
  if (normalized.includes('get your link') || normalized.includes('get-link') || normalized.includes('claim your link') || normalized.includes('🔗')) {
    return <GetYourLinkIcon size={size} className={className} />;
  }
  if (normalized.includes('share on campus') || normalized.includes('share-on-campus') || normalized.includes('share on socials') || normalized.includes('📲')) {
    return <ShareOnCampusIcon size={size} className={className} />;
  }
  if (normalized.includes('receive messages') || normalized.includes('receive-messages') || normalized.includes('receive submissions') || normalized.includes('💌') || normalized.includes('💬')) {
    return <ReceiveMessagesIcon size={size} className={className} />;
  }
  if (normalized.includes('share cards') || normalized.includes('share-cards') || normalized.includes('answer & export') || normalized.includes('🎨') || normalized.includes('🃏')) {
    return <ShareCardsIcon size={size} className={className} />;
  }
  if (normalized.includes('your campus') || normalized.includes('your-campus') || normalized.includes('campus hall') || normalized.includes('🏛️')) {
    return <YourCampusIcon size={size} className={className} />;
  }
  if (normalized.includes('real people') || normalized.includes('real-people') || normalized.includes('students') || normalized.includes('👥')) {
    return <RealPeopleIcon size={size} className={className} />;
  }

  // Off-Campus Share Channels
  if (normalized.includes('whatsapp')) {
    return <WhatsAppChannelIcon size={size} className={className} />;
  }
  if (normalized.includes('facebook')) {
    return <FacebookChannelIcon size={size} className={className} />;
  }
  if (normalized.includes('sms') || normalized.includes('text') || normalized === 'sms-channel') {
    return <SmsChannelIcon size={size} className={className} />;
  }
  if (normalized.includes('twitter') || normalized.includes('x /') || normalized === 'x' || normalized === 'x-twitter') {
    return <XTwitterIcon size={size} className={className} />;
  }
  if (normalized.includes('telegram') || normalized === 'telegram-channel') {
    return <TelegramChannelIcon size={size} className={className} />;
  }
  if (normalized.includes('email') || normalized.includes('mail') || normalized === 'email-channel') {
    return <EmailChannelIcon size={size} className={className} />;
  }

  // Feed Category Filters
  if (normalized.includes('money') || normalized.includes('finance') || normalized === 'money-finances' || normalized.includes('💰')) {
    return <MoneyFinancesIcon size={size} className={className} />;
  }
  if (normalized.includes('fashion') || normalized.includes('style') || normalized === 'fashion-style' || normalized.includes('👗') || normalized.includes('👔')) {
    return <FashionStyleIcon size={size} className={className} />;
  }
  if (normalized.includes('student posts') || normalized.includes('posts') || normalized === 'student-posts' || normalized.includes('📝')) {
    return <StudentPostsIcon size={size} className={className} />;
  }

  // Action Badges & Toast Notifications
  if (normalized.includes('bookmark') || normalized.includes('saved')) {
    return <BookmarkedIcon size={size} className={className} />;
  }
  if (normalized.includes('delete') || normalized.includes('remove') || normalized.includes('trash')) {
    return <DeleteRemoveIcon size={size} className={className} />;
  }
  if (normalized.includes('copied') || normalized.includes('clipboard') || normalized.includes('check')) {
    return <CopiedClipboardIcon size={size} className={className} />;
  }
  if (normalized.includes('search empty') || normalized.includes('empty search') || normalized.includes('search-empty')) {
    return <SearchEmptyIcon size={size} className={className} />;
  }
  if (normalized.includes('sparkle') || normalized.includes('polish') || normalized.includes('ai-sparkle') || normalized.includes('✨')) {
    return <SparklePolishIcon size={size} className={className} />;
  }
  if (normalized.includes('caught up') || normalized.includes('inbox all caught up') || normalized.includes('inbox-caught-up')) {
    return <InboxCaughtUpIcon size={size} className={className} />;
  }
  if (normalized.includes('edit alias') || normalized.includes('edit-alias') || normalized.includes('crayon') || normalized.includes('pencil')) {
    return <EditAliasIcon size={size} className={className} />;
  }
  if (normalized.includes('inbox shortcut') || normalized.includes('inbox-shortcut') || normalized.includes('inbox tray')) {
    return <InboxShortcutIcon size={size} className={className} />;
  }

  // Default custom icon fallback (no raw emoji)
  return <CampusLifeIcon size={size} className={className} />;
};
