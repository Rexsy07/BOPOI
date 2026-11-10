import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  X,
  Loader2,
  Eye,
  EyeOff,
  Dices,
  SlidersHorizontal,
  LogIn,
  UserPlus,
  School,
  Sparkles,
  ChevronRight,
  Search,
  MapPin,
} from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { supabase } from '../../lib/supabase.ts';
import { BopoiLogo } from '../brand/BopoiLogo.tsx';
import {
  CampusCharacterAvatar,
  CharacterBuilderPanel,
  parseCharacterConfig,
  serializeCharacterConfig,
  randomizeCharacterConfig,
  CHARACTER_PRESETS,
} from '../brand/character/index.ts';
import { BopoiSearchIcon, SearchEmptyIcon } from '../brand/icons/index.ts';

export const CAMPUS_OPTIONS = [
  {
    name: 'Chrisland University',
    location: 'Abeokuta, Ogun State',
    description: 'Verified Student Community',
  },
];

interface RegisterViewProps {
  initialMode?: 'signup' | 'login';
}

export const RegisterView: React.FC<RegisterViewProps> = ({ initialMode = 'login' }) => {
  const {
    setActiveView,
    registerAccount,
    loginAccount,
    accounts,
    showToast,
    user,
    openLegalDoc,
  } = useBopoi();

  const [authMode, setAuthMode] = useState<'signup' | 'login'>(initialMode);

  // Sign-up state (campus starts empty until user taps and picks from the university page)
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'too-short' | 'checking' | 'available' | 'taken'
  >('idle');
  const [campus, setCampus] = useState('');
  const [showCampusPickerPage, setShowCampusPickerPage] = useState(false);
  const [campusSearchQuery, setCampusSearchQuery] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([
    'Campus Life',
    'Relationships',
    'Tech & Coding',
  ]);
  const [characterUri, setCharacterUri] = useState<string>(() =>
    serializeCharacterConfig(parseCharacterConfig(user.avatarUrl, 'new_student'))
  );

  const toggleInterestTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.length > 1
          ? prev.filter((t) => t !== tag)
          : prev
        : [...prev, tag]
    );
  };

  // Real-time username availability check (local accounts + Supabase profiles)
  useEffect(() => {
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!clean) {
      setUsernameStatus('idle');
      return;
    }
    if (clean.length < 3) {
      setUsernameStatus('too-short');
      return;
    }
    const reserved = ['student', 'anonymous', 'admin', 'bopoi', 'support'];
    if (reserved.includes(clean)) {
      setUsernameStatus('taken');
      return;
    }

    const existsLocally = accounts.some((a) => a.username.toLowerCase() === clean);
    if (existsLocally) {
      setUsernameStatus('taken');
      return;
    }

    setUsernameStatus('checking');
    let cancelled = false;

    const timer = setTimeout(async () => {
      if (supabase) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('id')
            .ilike('username', clean)
            .maybeSingle();
          if (cancelled) return;
          if (data) {
            setUsernameStatus('taken');
            return;
          }
        } catch {
          // fallback to local check
        }
      }
      if (!cancelled) {
        setUsernameStatus('available');
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, accounts]);

  // Login state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleRandomizeCharacter = () => {
    const next = serializeCharacterConfig(randomizeCharacterConfig());
    setCharacterUri(next);
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = displayName.trim();
    const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanName || !cleanUser) {
      showToast('Please provide your display name and username.', 'error');
      return;
    }
    if (cleanUser.length < 3) {
      showToast('Username must be at least 3 characters.', 'error');
      return;
    }
    if (usernameStatus === 'taken') {
      showToast(`@${cleanUser} is already taken. Please pick another username.`, 'error');
      return;
    }
    if (usernameStatus === 'checking') {
      showToast('Checking username availability, please wait a moment...', 'info');
      return;
    }
    if (!campus.trim()) {
      showToast('Please tap to select your university.', 'error');
      setShowCampusPickerPage(true);
      return;
    }
    if (!password || password.length < 8) {
      showToast('Password must be at least 8 characters long.', 'error');
      return;
    }
    if (!agreeTerms) {
      showToast('Please accept the Terms & Privacy Guidelines.', 'error');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const res = registerAccount({
        displayName: cleanName,
        username: cleanUser,
        email: email.trim() || `${cleanUser}@bopoi.edu.ng`,
        password,
        campus: campus.trim(),
        avatarUrl: characterUri,
        selectedTags,
      });
      setLoading(false);
      if (res.success) {
        try {
          localStorage.removeItem('bopoi_onboarding_completed');
        } catch {
          // ignore
        }
        setActiveView('onboarding');
      } else if (res.error) {
        showToast(res.error, 'error');
      }
    }, 300);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = loginAccount(loginIdentifier, loginPassword);
    if (!res.success) {
      setLoginError(res.error || 'Unable to sign in.');
      return;
    }
    setActiveView('profile');
  };

  const filteredCampuses = CAMPUS_OPTIONS.filter(
    (u) =>
      !campusSearchQuery.trim() ||
      u.name.toLowerCase().includes(campusSearchQuery.trim().toLowerCase()) ||
      u.location.toLowerCase().includes(campusSearchQuery.trim().toLowerCase())
  );

  // Dedicated University Picker Page when user taps the university field during sign up
  if (authMode === 'signup' && showCampusPickerPage) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-[#FAF9FC] py-8 px-4 sm:px-6 flex items-center justify-center">
        <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-[#EAE6F0] shadow-xl space-y-6 animate-in fade-in duration-150">
          {/* Top Navigation Bar */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowCampusPickerPage(false)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-black cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Sign Up</span>
            </button>
            <BopoiLogo variant="icon" size={32} />
          </div>

          {/* Page Header */}
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#5420F5] mb-1">
              <School className="w-4 h-4" />
              <span>Select University</span>
            </div>
            <h1 className="text-2xl font-black text-[#191525] tracking-tight">
              Choose your university
            </h1>
            <p className="text-xs sm:text-sm text-[#706B7D] mt-1">
              Tap your university below to connect with students on your campus
            </p>
          </div>

          {/* Search Input */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
              <BopoiSearchIcon size={16} />
            </span>
            <input
              type="text"
              value={campusSearchQuery}
              onChange={(e) => setCampusSearchQuery(e.target.value)}
              placeholder="Search university..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#EAE6F0] text-base sm:text-sm text-[#191525] focus:outline-none focus:border-[#5420F5] focus:ring-2 focus:ring-[#5420F5]/10 bg-[#FAF9FC]"
            />
          </div>

          {/* University List */}
          <div className="space-y-2.5 min-h-[180px]">
            {filteredCampuses.length > 0 ? (
              filteredCampuses.map((uni) => {
                const isSelected = campus === uni.name;
                return (
                  <button
                    key={uni.name}
                    type="button"
                    onClick={() => {
                      setCampus(uni.name);
                      setShowCampusPickerPage(false);
                    }}
                    className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#F0EBFF] border-[#5420F5] ring-2 ring-[#5420F5]/15'
                        : 'bg-[#FAF9FC] hover:bg-white border-[#EAE6F0] hover:border-[#5420F5]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-[#5420F5] text-white'
                            : 'bg-white border border-[#EAE6F0] text-[#5420F5]'
                        }`}
                      >
                        <School className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-black text-[#191525] block truncate">
                          {uni.name}
                        </span>
                        <span className="text-xs text-[#706B7D] flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#5420F5] shrink-0" />
                          <span className="truncate">
                            {uni.location} · {uni.description}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[#5420F5] text-white'
                          : 'border border-slate-300 bg-white text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-[#EAE6F0] bg-[#FAF9FC] flex flex-col items-center justify-center space-y-2.5">
                <div className="w-14 h-14 rounded-2xl bg-[#F0EBFF] border border-[#5420F5]/15 flex items-center justify-center mx-auto p-2 shadow-2xs">
                  <SearchEmptyIcon size={36} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#191525]">No matching university found</p>
                  <p className="text-[11px] text-[#706B7D] mt-1">
                    Only Chrisland University is currently available.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#FAF9FC] py-8 px-4 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-[#EAE6F0] shadow-xl space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveView('home')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-black cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Feed</span>
          </button>
          <BopoiLogo variant="icon" size={32} />
        </div>

        {/* Mode Switcher Tabs: Create Account vs Log In */}
        <div className="grid grid-cols-2 gap-1.5 bg-[#FAF9FC] p-1.5 rounded-2xl border border-[#EAE6F0]">
          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setLoginError(null);
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              authMode === 'signup'
                ? 'bg-[#5420F5] text-white shadow-xs'
                : 'text-[#706B7D] hover:text-[#191525]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setLoginError(null);
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              authMode === 'login'
                ? 'bg-[#5420F5] text-white shadow-xs'
                : 'text-[#706B7D] hover:text-[#191525]'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Log In</span>
          </button>
        </div>

        {authMode === 'signup' ? (
          <>
            <div>
              <h1 className="text-2xl font-black text-[#191525] tracking-tight">
                Create your student account
              </h1>
              <p className="text-xs sm:text-sm text-[#706B7D] mt-1">
                Design your 3D campus character and get your anonymous link in seconds
              </p>
            </div>

            {/* Sign Up Form */}
            <form onSubmit={handleSignUpSubmit} className="space-y-4">
              {/* Redesigned Interactive 3D Campus Character & Identity Studio */}
              <div className="bg-gradient-to-b from-[#191525] via-[#221B38] to-[#191525] text-white border border-purple-500/30 rounded-3xl p-4 sm:p-5 space-y-4 shadow-lg">
                {/* Top Stage */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5">
                  <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
                    <CampusCharacterAvatar
                      value={characterUri}
                      seed={username || 'new_student'}
                      size={68}
                      rounded="2xl"
                      className="ring-3 ring-[#FFC928]/80 shadow-lg shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#FFC928] bg-white/10 px-2 py-0.5 rounded-full">
                        <Sparkles className="w-3 h-3" /> 3D Campus Identity
                      </span>
                      <span className="text-sm font-black text-white block truncate mt-0.5">
                        {displayName.trim() || 'Your Student Character'}
                      </span>
                      <span className="text-[11px] text-white/70 block truncate">
                        Pick a starter archetype or customize every detail
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end shrink-0">
                    <button
                      type="button"
                      onClick={handleRandomizeCharacter}
                      className="flex-1 sm:flex-initial px-3 py-2 min-h-[38px] rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-extrabold text-white flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                      title="Randomize character"
                    >
                      <Dices className="w-3.5 h-3.5 text-[#FFC928]" />
                      <span>Surprise Me</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBuilder(!showBuilder)}
                      className={`flex-1 sm:flex-initial px-3 py-2 min-h-[38px] rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        showBuilder
                          ? 'bg-[#FFC928] text-[#191525] shadow-xs'
                          : 'bg-[#5420F5] hover:bg-[#4314E2] text-white shadow-xs'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>{showBuilder ? 'Hide Studio' : 'Customize Look'}</span>
                    </button>
                  </div>
                </div>

                {/* 1-Tap Starter Archetypes */}
                <div className="space-y-1.5 pt-1 border-t border-white/10">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-extrabold uppercase tracking-wider text-purple-200">
                      Quick Campus Archetypes
                    </span>
                    <span className="text-white/60">1-tap starter looks</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {CHARACTER_PRESETS.map((preset) => {
                      const presetUri = serializeCharacterConfig(preset.config);
                      const isPresetActive = characterUri === presetUri;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setCharacterUri(presetUri)}
                          className={`p-1.5 rounded-2xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            isPresetActive
                              ? 'bg-white text-[#191525] border-[#FFC928] ring-2 ring-[#FFC928]'
                              : 'bg-white/5 hover:bg-white/15 border-white/10 text-white'
                          }`}
                        >
                          <CampusCharacterAvatar
                            config={preset.config}
                            size={36}
                            rounded="xl"
                          />
                          <span className="text-[9px] font-black truncate w-full text-center">
                            {preset.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Expandable Full Trait Customizer */}
                {showBuilder && (
                  <div className="bg-white text-[#191525] rounded-2xl p-3.5 shadow-inner animate-in fade-in duration-150">
                    <CharacterBuilderPanel
                      initialValue={characterUri}
                      fallbackSeed={username || 'new_student'}
                      compact
                      hideTopCard
                      onChange={(uri) => setCharacterUri(uri)}
                    />
                  </div>
                )}
              </div>

              {/* Display Name */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-[#191525]">Display name</label>
                  <span className="text-[10px] text-[#706B7D]">{displayName.length}/30</span>
                </div>
                <input
                  type="text"
                  maxLength={30}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  className="w-full px-4 py-3 rounded-xl border border-[#EAE6F0] text-base sm:text-sm text-[#191525] focus:outline-none focus:border-[#5420F5] focus:ring-2 focus:ring-[#5420F5]/10 transition-all bg-[#FAF9FC]"
                  required
                />
              </div>

              {/* Username */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#191525]">Username</label>
                  {usernameStatus === 'available' && (
                    <span className="text-[10px] font-extrabold text-emerald-600">
                      @{username} is available
                    </span>
                  )}
                  {usernameStatus === 'taken' && (
                    <span className="text-[10px] font-extrabold text-rose-600">
                      @{username} is already taken
                    </span>
                  )}
                  {usernameStatus === 'too-short' && (
                    <span className="text-[10px] font-bold text-amber-600">
                      At least 3 characters
                    </span>
                  )}
                  {usernameStatus === 'checking' && (
                    <span className="text-[10px] font-bold text-[#5420F5]">
                      Checking availability...
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                    }
                    placeholder="your_username"
                    className={`w-full pl-4 pr-10 py-3 rounded-xl border text-base sm:text-sm text-[#191525] focus:outline-none transition-all bg-[#FAF9FC] ${
                      usernameStatus === 'available'
                        ? 'border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
                        : usernameStatus === 'taken'
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10'
                        : 'border-[#EAE6F0] focus:border-[#5420F5] focus:ring-2 focus:ring-[#5420F5]/10'
                    }`}
                    required
                  />
                  {usernameStatus === 'checking' && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5420F5]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  )}
                  {usernameStatus === 'available' && (
                    <div
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center animate-in zoom-in duration-150"
                      title="Username is available"
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                  {usernameStatus === 'taken' && (
                    <div
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center animate-in zoom-in duration-150"
                      title="Username is already taken"
                    >
                      <X className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-[#706B7D] mt-1 block">
                  Your link will be: bopoi.com/@{username || 'username'}/ask
                </span>
              </div>

              {/* Campus / University Selection (Starts empty, opens University Page on tap) */}
              <div>
                <label className="text-xs font-bold text-[#191525] mb-1 flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-[#5420F5]" />
                  <span>Your University</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowCampusPickerPage(true)}
                  className={`w-full px-4 py-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    campus
                      ? 'border-[#5420F5]/40 bg-[#FAF9FC] text-[#191525]'
                      : 'border-[#EAE6F0] bg-[#FAF9FC] text-[#706B7D] hover:border-[#5420F5]/40'
                  }`}
                >
                  <span
                    className={`text-base sm:text-sm truncate ${
                      campus ? 'font-bold text-[#191525]' : 'text-[#706B7D]'
                    }`}
                  >
                    {campus || 'Tap to choose your university'}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {campus && (
                      <span className="text-[11px] font-bold text-[#5420F5]">Change</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-[#706B7D]" />
                  </div>
                </button>
              </div>

              {/* Campus Interests (Lookalike Cold-Start Activation Signals) */}
              <div>
                <label className="text-xs font-bold text-[#191525] mb-1.5 flex items-center justify-between">
                  <span>Pick your campus vibes (personalizes your feed &amp; rooms)</span>
                  <span className="text-[11px] font-bold text-[#5420F5]">
                    {selectedTags.length} selected
                  </span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Campus Life',
                    'Relationships',
                    'Tech & Coding',
                    'Music & Podcasts',
                    'Money',
                    'Fashion',
                    'Study & Exams',
                    'Hostel Gist',
                  ].map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleInterestTag(tag)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          active
                            ? 'bg-[#5420F5] text-white shadow-2xs'
                            : 'bg-[#FAF9FC] border border-[#EAE6F0] text-[#706B7D] hover:text-[#191525]'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-[#191525] mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@campus.edu.ng"
                  className="w-full px-4 py-3 rounded-xl border border-[#EAE6F0] text-base sm:text-sm text-[#191525] focus:outline-none focus:border-[#5420F5] focus:ring-2 focus:ring-[#5420F5]/10 transition-all bg-[#FAF9FC]"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-[#191525] mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    minLength={8}
                    className="w-full pl-4 pr-11 py-3 rounded-xl border border-[#EAE6F0] text-base sm:text-sm text-[#191525] focus:outline-none focus:border-[#5420F5] focus:ring-2 focus:ring-[#5420F5]/10 transition-all bg-[#FAF9FC]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Terms Agreement with interactive Legal Modal triggers */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-1 rounded border-slate-300 text-[#5420F5] focus:ring-[#5420F5] cursor-pointer"
                />
                <label htmlFor="terms" className="text-xs text-[#706B7D] leading-relaxed">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => openLegalDoc('terms')}
                    className="text-[#5420F5] font-extrabold underline hover:text-[#4314E2] cursor-pointer"
                  >
                    Terms of Service
                  </button>
                  ,{' '}
                  <button
                    type="button"
                    onClick={() => openLegalDoc('privacy')}
                    className="text-[#5420F5] font-extrabold underline hover:text-[#4314E2] cursor-pointer"
                  >
                    Privacy Policy
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    onClick={() => openLegalDoc('guidelines')}
                    className="text-[#5420F5] font-extrabold underline hover:text-[#4314E2] cursor-pointer"
                  >
                    Community Guidelines
                  </button>
                </label>
              </div>

              {/* Primary Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-[#5420F5] hover:bg-[#4314E2] text-white font-extrabold text-sm rounded-xl shadow-md shadow-[#5420F5]/25 active:scale-[0.98] transition-all cursor-pointer"
              >
                {loading ? 'Setting up your link...' : 'Sign Up & Get My Link'}
              </button>
            </form>
          </>
        ) : (
          /* LOG IN VIEW */
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-black text-[#191525] tracking-tight">
                Welcome back
              </h1>
              <p className="text-xs sm:text-sm text-[#706B7D] mt-1">
                Log in with your username or email to access your campus account
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#191525] mb-1">
                  Username or Email
                </label>
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => {
                    setLoginIdentifier(e.target.value);
                    setLoginError(null);
                  }}
                  placeholder="Enter your username or email"
                  className="w-full px-4 py-3 rounded-xl border border-[#EAE6F0] text-base sm:text-sm text-[#191525] focus:outline-none focus:border-[#5420F5] bg-[#FAF9FC]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#191525] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-[#EAE6F0] text-base sm:text-sm text-[#191525] focus:outline-none focus:border-[#5420F5] bg-[#FAF9FC]"
                  required
                />
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-[#5420F5] hover:bg-[#4314E2] text-white font-extrabold text-sm rounded-xl shadow-md shadow-[#5420F5]/25 active:scale-[0.98] transition-all cursor-pointer"
              >
                Log In to Account
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
