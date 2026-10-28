import React, { useState } from 'react';
import {
  Shuffle,
  Check,
  Sparkles,
  Type,
  Smile,
  Palette,
  Shapes,
  X,
} from 'lucide-react';
import {
  RoomIconConfig,
  RoomIconMode,
  ROOM_SVG_EMBLEMS,
  ROOM_GRADIENT_PRESETS,
  ROOM_SOLID_COLORS,
  ROOM_BADGE_SHAPES,
  ROOM_GLOW_STYLES,
  ROOM_EMOJI_LIBRARY,
  parseRoomIcon,
  serializeRoomIcon,
  deriveMonogramFromName,
  generateRandomRoomIcon,
} from '../../utils/roomIconConfig.ts';
import { RoomBadgeIcon } from '../brand/icons/RoomBadgeIcon.tsx';

interface RoomIconStudioPickerProps {
  iconEmoji: string;
  iconBg: string;
  roomName?: string;
  category?: string;
  onChange: (nextIconEmoji: string, nextIconBg: string) => void;
}

type StudioMainTab = 'emblem' | 'palette' | 'shape';

export const RoomIconStudioPicker: React.FC<RoomIconStudioPickerProps> = ({
  iconEmoji,
  iconBg,
  roomName,
  category,
  onChange,
}) => {
  const config = parseRoomIcon(iconEmoji, iconBg, category, roomName);

  const [activeTab, setActiveTab] = useState<StudioMainTab>('emblem');
  const [emblemGroupFilter, setEmblemGroupFilter] = useState<string>('All');

  const updateConfig = (partial: Partial<RoomIconConfig>) => {
    const nextConfig: RoomIconConfig = {
      ...config,
      ...partial,
    };
    const serialized = serializeRoomIcon(nextConfig);
    onChange(serialized.iconEmoji, serialized.iconBg);
  };

  const handleSelectMode = (mode: RoomIconMode) => {
    if (mode === config.mode) return;
    if (mode === 'monogram') {
      updateConfig({
        mode: 'monogram',
        value: deriveMonogramFromName(roomName || category || 'VIP'),
      });
    } else if (mode === 'emoji') {
      updateConfig({
        mode: 'emoji',
        value: '🔥',
      });
    } else {
      updateConfig({
        mode: 'svg',
        value: 'campus-life',
      });
    }
  };

  const handleSurpriseMe = () => {
    const randomCfg = generateRandomRoomIcon(roomName, category);
    const serialized = serializeRoomIcon(randomCfg);
    onChange(serialized.iconEmoji, serialized.iconBg);
  };

  const groups = ['All', 'Campus', 'Night & Secrets', 'Culture & Vibe', 'Tech & Play', 'Prestige'];
  const filteredEmblems =
    emblemGroupFilter === 'All'
      ? ROOM_SVG_EMBLEMS
      : ROOM_SVG_EMBLEMS.filter((e) => e.group === emblemGroupFilter);

  const activeGradient = ROOM_GRADIENT_PRESETS.find((g) => g.id === config.fillValue);
  const activeShapeMeta =
    ROOM_BADGE_SHAPES.find((s) => s.id === config.shape) || ROOM_BADGE_SHAPES[0];
  const activeGlowMeta =
    ROOM_GLOW_STYLES.find((g) => g.id === config.glow) || ROOM_GLOW_STYLES[0];

  return (
    <div className="rounded-2xl border border-[#EAE6F0] bg-[#FAF9FC] p-3.5 space-y-3.5">
      {/* Top Studio Header & Live Badge Preview */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-[#EAE6F0] shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <RoomBadgeIcon
            configOverride={config}
            size="lg"
            className="shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-[#191525] truncate">
                Room Icon Studio
              </span>
              <span className="text-[10px] text-slate-400">·</span>
              <span className="text-[10px] font-bold text-[#5420F5] capitalize">
                {config.mode === 'svg'
                  ? 'Vector Emblem'
                  : config.mode === 'monogram'
                  ? 'Monogram'
                  : 'Emoji'}
              </span>
            </div>
            <p className="text-[11px] text-[#706B7D] truncate mt-0.5">
              {activeShapeMeta.shortLabel} ·{' '}
              {config.fillType === 'gradient'
                ? activeGradient?.name || 'Gradient'
                : 'Solid Fill'}{' '}
              · {activeGlowMeta.label}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSurpriseMe}
          className="px-3 py-2 rounded-xl bg-[#F0EBFF] hover:bg-[#5420F5] text-[#5420F5] hover:text-white text-[11px] font-black transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95"
          title="Randomize room icon style"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">Surprise Me</span>
        </button>
      </div>

      {/* Studio Main Navigation Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-white rounded-xl border border-[#EAE6F0]">
        <button
          type="button"
          onClick={() => setActiveTab('emblem')}
          className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'emblem'
              ? 'bg-[#191525] text-white shadow-2xs'
              : 'text-slate-600 hover:text-[#191525]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>1. Emblem</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('palette')}
          className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'palette'
              ? 'bg-[#191525] text-white shadow-2xs'
              : 'text-slate-600 hover:text-[#191525]'
          }`}
        >
          <Palette className="w-3.5 h-3.5 shrink-0" />
          <span>2. Style &amp; Glow</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('shape')}
          className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'shape'
              ? 'bg-[#191525] text-white shadow-2xs'
              : 'text-slate-600 hover:text-[#191525]'
          }`}
        >
          <Shapes className="w-3.5 h-3.5 shrink-0" />
          <span>3. Shape</span>
        </button>
      </div>

      {/* TAB 1: EMBLEM (Custom SVG, Monogram, Emoji) */}
      {activeTab === 'emblem' && (
        <div className="space-y-3">
          {/* Sub-mode selector */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectMode('svg')}
              className={`flex-1 py-1.5 px-2.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                config.mode === 'svg'
                  ? 'bg-[#F0EBFF] border-[#5420F5] text-[#5420F5]'
                  : 'bg-white border-[#EAE6F0] text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-3 h-3 shrink-0" />
              <span>Custom SVG</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMode('monogram')}
              className={`flex-1 py-1.5 px-2.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                config.mode === 'monogram'
                  ? 'bg-[#F0EBFF] border-[#5420F5] text-[#5420F5]'
                  : 'bg-white border-[#EAE6F0] text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Type className="w-3 h-3 shrink-0" />
              <span>Monogram</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMode('emoji')}
              className={`flex-1 py-1.5 px-2.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                config.mode === 'emoji'
                  ? 'bg-[#F0EBFF] border-[#5420F5] text-[#5420F5]'
                  : 'bg-white border-[#EAE6F0] text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Smile className="w-3 h-3 shrink-0" />
              <span>Emoji</span>
            </button>
          </div>

          {/* Mode A: Custom SVG Emblem Library */}
          {config.mode === 'svg' && (
            <div className="space-y-2.5">
              {/* Group filter bar */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
                {groups.map((grp) => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setEmblemGroupFilter(grp)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      emblemGroupFilter === grp
                        ? 'bg-[#5420F5] text-white'
                        : 'bg-white border border-[#EAE6F0] text-slate-600 hover:text-[#191525]'
                    }`}
                  >
                    {grp}
                  </button>
                ))}
              </div>

              {/* SVG Grid */}
              <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
                {filteredEmblems.map((emblem) => {
                  const isSelected =
                    config.mode === 'svg' && config.value === emblem.id;
                  return (
                    <button
                      key={emblem.id}
                      type="button"
                      onClick={() => {
                        const shouldUpdateFill =
                          config.fillType === 'gradient' &&
                          config.fillValue === 'frost-crystal';
                        updateConfig({
                          mode: 'svg',
                          value: emblem.id,
                          ...(shouldUpdateFill
                            ? {
                                fillType: 'gradient',
                                fillValue: emblem.recommendedGradient,
                              }
                            : {}),
                        });
                      }}
                      title={emblem.label}
                      className={`group flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer min-h-[52px] ${
                        isSelected
                          ? 'bg-white border-[#5420F5] ring-2 ring-[#5420F5]/25 shadow-xs scale-105'
                          : 'bg-white border-[#EAE6F0] hover:border-[#5420F5]/40 hover:bg-purple-50/30'
                      }`}
                    >
                      <RoomBadgeIcon
                        configOverride={{
                          mode: 'svg',
                          value: emblem.id,
                          fillType: 'gradient',
                          fillValue: isSelected
                            ? config.fillValue
                            : emblem.recommendedGradient,
                          shape: 'squircle',
                          glow: 'none',
                        }}
                        size="xs"
                      />
                      <span className="text-[9px] font-bold text-slate-600 truncate w-full text-center mt-1">
                        {emblem.label.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mode B: Monogram Initials */}
          {config.mode === 'monogram' && (
            <div className="p-3 rounded-xl bg-white border border-[#EAE6F0] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-black text-[#191525]">
                  Monogram Characters (1–3 letters/numbers)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    updateConfig({
                      mode: 'monogram',
                      value: deriveMonogramFromName(roomName || category || 'RM'),
                    })
                  }
                  className="text-[10px] font-bold text-[#5420F5] hover:underline cursor-pointer whitespace-nowrap"
                >
                  Use Room Initials
                </button>
              </div>
              <input
                type="text"
                value={config.value}
                onChange={(e) =>
                  updateConfig({
                    mode: 'monogram',
                    value: e.target.value.toUpperCase().slice(0, 3),
                  })
                }
                maxLength={3}
                placeholder="VIP"
                className="w-full px-3.5 py-2 bg-[#FAF9FC] border border-[#EAE6F0] rounded-xl text-sm font-black tracking-widest uppercase text-[#191525] focus:outline-none focus:border-[#5420F5]"
              />
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 block">
                  Quick Monogram Badges
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {['VIP', 'UL', '404', 'HQ', '247', 'ASK', 'HOT', 'PRO', 'LAB', '101'].map(
                    (preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          updateConfig({ mode: 'monogram', value: preset })
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-colors cursor-pointer ${
                          config.value === preset
                            ? 'bg-[#5420F5] text-white border-[#5420F5]'
                            : 'bg-[#FAF9FC] text-slate-700 border-[#EAE6F0] hover:border-[#5420F5]/40'
                        }`}
                      >
                        {preset}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mode C: Emoji Picker */}
          {config.mode === 'emoji' && (
            <div className="space-y-2.5 max-h-48 overflow-y-auto p-1">
              {ROOM_EMOJI_LIBRARY.map((group) => (
                <div key={group.category} className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 block">
                    {group.category}
                  </span>
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
                    {group.emojis.map((emoji) => {
                      const isSelected =
                        config.mode === 'emoji' && config.value === emoji;
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() =>
                            updateConfig({ mode: 'emoji', value: emoji })
                          }
                          className={`h-9 rounded-xl border flex items-center justify-center text-base transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white border-[#5420F5] ring-2 ring-[#5420F5]/25 scale-105 shadow-2xs'
                              : 'bg-white border-[#EAE6F0] hover:bg-purple-50/40'
                          }`}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PALETTE & GLOW (Gradients, Solids, Neon Glow) */}
      {activeTab === 'palette' && (
        <div className="space-y-3.5">
          {/* Curated Gradients */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-black text-[#191525] block">
              Curated Studio Gradients
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {ROOM_GRADIENT_PRESETS.map((grad) => {
                const isSelected =
                  config.fillType === 'gradient' && config.fillValue === grad.id;
                return (
                  <button
                    key={grad.id}
                    type="button"
                    onClick={() =>
                      updateConfig({
                        fillType: 'gradient',
                        fillValue: grad.id,
                      })
                    }
                    className={`p-1.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? 'bg-white border-[#5420F5] ring-2 ring-[#5420F5]/25 shadow-2xs'
                        : 'bg-white border-[#EAE6F0] hover:border-slate-300'
                    }`}
                  >
                    <span
                      style={{ background: grad.css }}
                      className="w-6 h-6 rounded-lg shrink-0 border border-black/10 flex items-center justify-center"
                    >
                      {isSelected && (
                        <Check
                          className={`w-3.5 h-3.5 stroke-[3] ${
                            grad.id === 'frost-crystal'
                              ? 'text-[#191525]'
                              : 'text-white'
                          }`}
                        />
                      )}
                    </span>
                    <span className="text-[10px] font-bold text-[#191525] truncate">
                      {grad.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Solid Colors */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-black text-[#191525] block">
              Solid Color Swatches
            </span>
            <div className="flex flex-wrap gap-2">
              {ROOM_SOLID_COLORS.map((solid) => {
                const isSelected =
                  config.fillType === 'solid' &&
                  config.fillValue.toUpperCase() === solid.hex.toUpperCase();
                const isLight = solid.hex.toUpperCase() === '#FFFFFF';
                return (
                  <button
                    key={solid.id}
                    type="button"
                    onClick={() =>
                      updateConfig({
                        fillType: 'solid',
                        fillValue: solid.hex,
                      })
                    }
                    style={{ backgroundColor: solid.hex }}
                    title={solid.name}
                    className={`w-8 h-8 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                      isLight ? 'border-slate-300' : 'border-transparent'
                    } ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-[#191525] scale-110 shadow-xs'
                        : 'opacity-90 hover:opacity-100'
                    }`}
                  >
                    {isSelected && (
                      <Check
                        className={`w-3.5 h-3.5 stroke-[3] ${
                          isLight ? 'text-[#191525]' : 'text-white'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Neon Glow & Ring Accents */}
          <div className="space-y-1.5 pt-1 border-t border-[#EAE6F0]">
            <span className="text-[11px] font-black text-[#191525] block">
              Neon Glow &amp; Ring Accent
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ROOM_GLOW_STYLES.map((glowItem) => {
                const isSelected = config.glow === glowItem.id;
                return (
                  <button
                    key={glowItem.id}
                    type="button"
                    onClick={() => updateConfig({ glow: glowItem.id })}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#F0EBFF] border-[#5420F5] text-[#5420F5] shadow-2xs'
                        : 'bg-white border-[#EAE6F0] text-[#191525] hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-[11px] font-black truncate">
                      {glowItem.label}
                    </div>
                    <div className="text-[9px] text-slate-500 truncate">
                      {glowItem.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BADGE SHAPE */}
      {activeTab === 'shape' && (
        <div className="space-y-2">
          <span className="text-[11px] font-black text-[#191525] block">
            Select Badge Silhouette
          </span>
          <div className="grid grid-cols-5 gap-2">
            {ROOM_BADGE_SHAPES.map((shapeItem) => {
              const isSelected = config.shape === shapeItem.id;
              return (
                <button
                  key={shapeItem.id}
                  type="button"
                  onClick={() => updateConfig({ shape: shapeItem.id })}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#5420F5] ring-2 ring-[#5420F5]/25 shadow-xs'
                      : 'bg-white border-[#EAE6F0] hover:border-[#5420F5]/40'
                  }`}
                >
                  <RoomBadgeIcon
                    configOverride={{
                      ...config,
                      shape: shapeItem.id,
                      glow: 'none',
                    }}
                    size="sm"
                  />
                  <span
                    className={`text-[10px] font-bold truncate w-full text-center ${
                      isSelected ? 'text-[#5420F5]' : 'text-slate-600'
                    }`}
                  >
                    {shapeItem.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

interface EditRoomIconModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
  category: string;
  currentIconEmoji: string;
  currentIconBg: string;
  onSave: (iconEmoji: string, iconBg: string) => void;
}

export const EditRoomIconModal: React.FC<EditRoomIconModalProps> = ({
  isOpen,
  onClose,
  roomName,
  category,
  currentIconEmoji,
  currentIconBg,
  onSave,
}) => {
  const [draftEmoji, setDraftEmoji] = useState(currentIconEmoji);
  const [draftBg, setDraftBg] = useState(currentIconBg);

  React.useEffect(() => {
    if (isOpen) {
      setDraftEmoji(currentIconEmoji);
      setDraftBg(currentIconBg);
    }
  }, [isOpen, currentIconEmoji, currentIconBg]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(draftEmoji, draftBg);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-[#EAE6F0] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#EAE6F0] bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <RoomBadgeIcon
              iconEmoji={draftEmoji}
              iconBg={draftBg}
              category={category}
              roomName={roomName}
              size="sm"
            />
            <div className="min-w-0">
              <h2 className="text-base font-black text-[#191525] truncate">
                Customize Room Icon
              </h2>
              <p className="text-xs text-[#706B7D] truncate">
                #{roomName} · Live badge studio
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-black transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <RoomIconStudioPicker
            iconEmoji={draftEmoji}
            iconBg={draftBg}
            roomName={roomName}
            category={category}
            onChange={(nextEmoji: string, nextBg: string) => {
              setDraftEmoji(nextEmoji);
              setDraftBg(nextBg);
            }}
          />

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#EAE6F0] bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black transition-all cursor-pointer shadow-md shadow-[#5420F5]/25 active:scale-95"
            >
              Save Room Icon
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
