import React, { useState, useEffect } from 'react';
import { X, Dices, Check, RotateCcw } from 'lucide-react';
import {
  CharacterConfig,
  AURA_OPTIONS,
  SKIN_OPTIONS,
  HAIR_OPTIONS,
  HAIR_COLOR_OPTIONS,
  EYES_EXPRESSION_OPTIONS,
  CHARACTER_MOODS,
  EYEWEAR_OPTIONS,
  OUTFIT_OPTIONS,
  parseCharacterConfig,
  serializeCharacterConfig,
  randomizeCharacterConfig,
} from './characterCatalog.ts';
import { CampusCharacterAvatar } from './CampusCharacterAvatar.tsx';
import { SparklePolishIcon } from '../icons/index.ts';

type StudioTab = 'skin-aura' | 'hair-headgear' | 'eyes-vibe' | 'eyewear' | 'outfit';

interface CharacterBuilderProps {
  initialValue?: string | null;
  fallbackSeed?: string;
  onChange?: (serializedUri: string, config: CharacterConfig) => void;
  compact?: boolean;
  hideTopCard?: boolean;
}

export const CharacterBuilderPanel: React.FC<CharacterBuilderProps> = ({
  initialValue,
  fallbackSeed = 'bopoi_student',
  onChange,
  compact = false,
  hideTopCard = false,
}) => {
  const [config, setConfig] = useState<CharacterConfig>(() =>
    parseCharacterConfig(initialValue, fallbackSeed)
  );
  const [activeTab, setActiveTab] = useState<StudioTab>('skin-aura');

  useEffect(() => {
    if (initialValue) {
      setConfig(parseCharacterConfig(initialValue, fallbackSeed));
    }
  }, [initialValue, fallbackSeed]);

  const updateConfig = (partial: Partial<CharacterConfig>) => {
    const next = { ...config, ...partial };
    setConfig(next);
    if (onChange) {
      onChange(serializeCharacterConfig(next), next);
    }
  };

  const handleRandomize = () => {
    const next = randomizeCharacterConfig();
    setConfig(next);
    if (onChange) {
      onChange(serializeCharacterConfig(next), next);
    }
  };

  const tabs: { id: StudioTab; label: string }[] = [
    { id: 'skin-aura', label: 'Skin & Aura' },
    { id: 'hair-headgear', label: 'Hair & Caps' },
    { id: 'eyes-vibe', label: 'Expression' },
    { id: 'eyewear', label: 'Shades' },
    { id: 'outfit', label: 'Campus Fit' },
  ];

  return (
    <div className="w-full space-y-3.5">
      {/* Top Live Character Stage + Randomize Button (optional when embedded) */}
      {!hideTopCard && (
        <div className="flex items-center justify-between gap-3 bg-[#FAF9FC] border border-[#EAE6F0] rounded-2xl p-3.5">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <CampusCharacterAvatar
                config={config}
                size={compact ? 64 : 84}
                rounded="2xl"
                showRing
                showMoodBadge
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <SparklePolishIcon size={16} />
                <span className="text-xs font-extrabold text-[#191525] truncate">
                  Custom 3D Campus Character
                </span>
              </div>
              <p className="text-[11px] text-[#706B7D] mt-0.5 leading-snug">
                Mix skin tones, hairstyles, headgear, moods, shades, and campus fits.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRandomize}
            className="px-3.5 py-2.5 min-h-[42px] rounded-xl bg-[#F0EBFF] hover:bg-[#5420F5] text-[#5420F5] hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 whitespace-nowrap active:scale-95"
          >
            <Dices className="w-4 h-4 shrink-0" />
            <span>Randomize</span>
          </button>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-[#191525] text-white shadow-xs'
                  : 'bg-[#FAF9FC] text-[#706B7D] hover:text-[#191525] border border-[#EAE6F0]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Panels */}
      <div className="bg-[#FAF9FC] border border-[#EAE6F0] rounded-2xl p-3.5 max-h-[290px] overflow-y-auto space-y-4">
        {activeTab === 'skin-aura' && (
          <>
            <div>
              <label className="block text-[11px] font-extrabold text-[#191525] mb-2">
                Skin Tone
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {SKIN_OPTIONS.map((skin) => {
                  const selected = config.skinId === skin.id;
                  return (
                    <button
                      key={skin.id}
                      type="button"
                      onClick={() => updateConfig({ skinId: skin.id })}
                      title={skin.name}
                      className={`h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer border-2 ${
                        selected
                          ? 'border-[#5420F5] scale-105 shadow-sm'
                          : 'border-white hover:border-slate-300'
                      }`}
                      style={{
                        background: `radial-gradient(circle at 35% 35%, ${skin.highlight}, ${skin.base}, ${skin.shadow})`,
                      }}
                    >
                      {selected && <Check className="w-4 h-4 text-white drop-shadow-xs" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-[#191525] mb-2">
                Studio Aura Backdrop
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {AURA_OPTIONS.map((aura) => {
                  const selected = config.auraId === aura.id;
                  return (
                    <button
                      key={aura.id}
                      type="button"
                      onClick={() => updateConfig({ auraId: aura.id })}
                      className={`p-2 min-h-[44px] rounded-xl flex items-center gap-2 transition-all cursor-pointer border text-left ${
                        selected
                          ? 'border-[#5420F5] bg-[#F0EBFF]/60 text-[#5420F5]'
                          : 'border-[#EAE6F0] bg-white hover:border-slate-300 text-[#191525]'
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-lg shrink-0 border border-white/40 shadow-2xs"
                        style={{
                          background: `linear-gradient(135deg, ${aura.stops[0]}, ${aura.stops[1]}, ${aura.stops[2]})`,
                        }}
                      />
                      <span className="text-[11px] font-bold truncate">{aura.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeTab === 'hair-headgear' && (
          <>
            <div>
              <label className="block text-[11px] font-extrabold text-[#191525] mb-2">
                Hairstyle &amp; Headgear
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {HAIR_OPTIONS.map((hair) => {
                  const selected = config.hairId === hair.id;
                  return (
                    <button
                      key={hair.id}
                      type="button"
                      onClick={() => updateConfig({ hairId: hair.id })}
                      className={`p-2 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer border text-left ${
                        selected
                          ? 'border-[#5420F5] bg-[#F0EBFF]/70 ring-1 ring-[#5420F5]'
                          : 'border-[#EAE6F0] bg-white hover:border-slate-300'
                      }`}
                    >
                      <CampusCharacterAvatar
                        config={{ ...config, hairId: hair.id }}
                        size={36}
                        rounded="xl"
                      />
                      <span className="text-[11px] font-bold text-[#191525] leading-tight line-clamp-2">
                        {hair.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-[#191525] mb-2">
                Hair / Hat Accent Color
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {HAIR_COLOR_OPTIONS.map((hc) => {
                  const selected = config.hairColorId === hc.id;
                  return (
                    <button
                      key={hc.id}
                      type="button"
                      onClick={() => updateConfig({ hairColorId: hc.id })}
                      title={hc.name}
                      className={`h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border-2 ${
                        selected
                          ? 'border-[#5420F5] scale-105 shadow-xs'
                          : 'border-white hover:border-slate-300'
                      }`}
                      style={{
                        background: `linear-gradient(135deg, ${hc.highlight}, ${hc.base}, ${hc.shadow})`,
                      }}
                    >
                      {selected && (
                        <Check
                          className={`w-4 h-4 ${
                            hc.id === 'platinum-ice' || hc.id === 'golden-blonde'
                              ? 'text-slate-900'
                              : 'text-white'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeTab === 'eyes-vibe' && (
          <div>
            <label className="block text-[11px] font-extrabold text-[#191525] mb-2">
              Mood &amp; 3D Facial Expression
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CHARACTER_MOODS.map((mood) => {
                const selected = config.eyesId === mood.eyesId;
                return (
                  <button
                    key={mood.id}
                    type="button"
                    onClick={() => updateConfig({ eyesId: mood.eyesId, moodId: mood.id })}
                    className={`p-2.5 rounded-xl flex flex-col items-center gap-1.5 transition-all cursor-pointer border text-center ${
                      selected
                        ? 'border-[#5420F5] bg-[#F0EBFF]/70 ring-1 ring-[#5420F5]'
                        : 'border-[#EAE6F0] bg-white hover:border-slate-300'
                    }`}
                  >
                    <CampusCharacterAvatar
                      config={{ ...config, eyesId: mood.eyesId, moodId: mood.id, eyewearId: 'none' }}
                      size={44}
                      rounded="xl"
                      showMoodBadge
                    />
                    <span className="text-[11px] font-bold text-[#191525] truncate w-full">
                      {mood.emoji} {mood.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'eyewear' && (
          <div>
            <label className="block text-[11px] font-extrabold text-[#191525] mb-2">
              Eyewear, Shades &amp; Visors
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EYEWEAR_OPTIONS.map((ew) => {
                const selected = config.eyewearId === ew.id;
                return (
                  <button
                    key={ew.id}
                    type="button"
                    onClick={() => updateConfig({ eyewearId: ew.id })}
                    className={`p-2.5 rounded-xl flex flex-col items-center gap-1.5 transition-all cursor-pointer border text-center ${
                      selected
                        ? 'border-[#5420F5] bg-[#F0EBFF]/70 ring-1 ring-[#5420F5]'
                        : 'border-[#EAE6F0] bg-white hover:border-slate-300'
                    }`}
                  >
                    <CampusCharacterAvatar
                      config={{ ...config, eyewearId: ew.id }}
                      size={44}
                      rounded="xl"
                    />
                    <span className="text-[11px] font-bold text-[#191525] truncate w-full">
                      {ew.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'outfit' && (
          <div>
            <label className="block text-[11px] font-extrabold text-[#191525] mb-2">
              Campus Hoodie &amp; Varsity Fit
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {OUTFIT_OPTIONS.map((fit) => {
                const selected = config.outfitId === fit.id;
                return (
                  <button
                    key={fit.id}
                    type="button"
                    onClick={() => updateConfig({ outfitId: fit.id })}
                    className={`p-2.5 rounded-xl flex flex-col items-center gap-1.5 transition-all cursor-pointer border text-center ${
                      selected
                        ? 'border-[#5420F5] bg-[#F0EBFF]/70 ring-1 ring-[#5420F5]'
                        : 'border-[#EAE6F0] bg-white hover:border-slate-300'
                    }`}
                  >
                    <CampusCharacterAvatar
                      config={{ ...config, outfitId: fit.id }}
                      size={44}
                      rounded="xl"
                    />
                    <span className="text-[11px] font-bold text-[#191525] truncate w-full">
                      {fit.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface CharacterStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentValue?: string | null;
  fallbackSeed?: string;
  onSave: (serializedUri: string) => void;
}

export const CharacterStudioModal: React.FC<CharacterStudioModalProps> = ({
  isOpen,
  onClose,
  currentValue,
  fallbackSeed = 'bopoi_student',
  onSave,
}) => {
  const [draftUri, setDraftUri] = useState<string>(() =>
    serializeCharacterConfig(parseCharacterConfig(currentValue, fallbackSeed))
  );

  if (!isOpen) return null;

  const handleReset = () => {
    const resetCfg = parseCharacterConfig(undefined, fallbackSeed);
    setDraftUri(serializeCharacterConfig(resetCfg));
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl rounded-3xl border border-[#EAE6F0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EAE6F0] flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-[#191525] tracking-tight">
              Character Studio
            </h3>
            <p className="text-xs text-[#706B7D]">
              Design your unique 3D campus identity — no real photos needed
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#FAF9FC] hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <CharacterBuilderPanel
            key={draftUri.slice(0, 16)}
            initialValue={draftUri}
            fallbackSeed={fallbackSeed}
            onChange={(uri) => setDraftUri(uri)}
          />
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#FAF9FC] border-t border-[#EAE6F0] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 min-h-[44px] rounded-xl border border-[#EAE6F0] bg-white hover:bg-slate-50 text-xs font-bold text-[#706B7D] hover:text-[#191525] flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Username Seed</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-[#706B7D] hover:bg-slate-100 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(draftUri);
                onClose();
              }}
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-extrabold shadow-md shadow-[#5420F5]/25 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Save Character</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
