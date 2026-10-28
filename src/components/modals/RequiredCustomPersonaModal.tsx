import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, ArrowLeft, Check, Shuffle } from 'lucide-react';
import { PersonaMaskIcon } from '../brand/masks/PersonaMaskIcon.tsx';
import { EditAliasIcon } from '../brand/icons/index.ts';
import { ROOM_PRESET_ALIASES } from '../../utils/roomPersonas.ts';

interface RequiredCustomPersonaModalProps {
  isOpen: boolean;
  roomName: string;
  roomId: string;
  onConfirm: (customAlias: string, maskId: string, maskEmoji: string) => void;
  onCancel: () => void;
  existingAliasesInRoom?: string[];
}

const COOL_ALIAS_IDEAS = [
  'MidnightSpecter',
  'LibraryOracle',
  'VelvetBrain',
  'FacultyPhantom',
  'CampusCipher',
  'SecretAlchemist',
  'Hall3Sleuth',
  'NeonGossip',
  'ShadowScholar',
  'CampusInsider99',
  'MysticSenior',
  'QuietThinker',
];

export const RequiredCustomPersonaModal: React.FC<RequiredCustomPersonaModalProps> = ({
  isOpen,
  roomName,
  roomId,
  onConfirm,
  onCancel,
  existingAliasesInRoom = [],
}) => {
  const [selectedMask, setSelectedMask] = useState(ROOM_PRESET_ALIASES[0]);
  const [aliasInput, setAliasInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleRollIdea = () => {
    const random = COOL_ALIAS_IDEAS[Math.floor(Math.random() * COOL_ALIAS_IDEAS.length)];
    setAliasInput(random);
    setErrorMsg('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAliasInput(val);
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = aliasInput.trim();

    if (!clean) {
      setErrorMsg('Please enter a custom alias to join.');
      return;
    }
    if (clean.length < 2) {
      setErrorMsg('Alias must be at least 2 characters long.');
      return;
    }
    if (clean.length > 25) {
      setErrorMsg('Alias cannot exceed 25 characters.');
      return;
    }

    // Check if alias already taken in this room
    const isTaken = existingAliasesInRoom.some(
      (a) => a.toLowerCase() === clean.toLowerCase()
    );
    if (isTaken) {
      setErrorMsg(`"${clean}" is already taken in this room. Choose another!`);
      return;
    }

    onConfirm(clean, selectedMask.id, selectedMask.emoji);
  };

  const isValid = aliasInput.trim().length >= 2 && aliasInput.trim().length <= 25;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-[#EAE6F0] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#EAE6F0] bg-gradient-to-r from-[#FAF9FC] to-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white border border-[#5420F5]/25 flex items-center justify-center p-1.5 shadow-xs shrink-0">
              <PersonaMaskIcon mask={selectedMask.id} size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-[#191525]">
                  All 10 Aliases Taken!
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  Required
                </span>
              </div>
              <p className="text-xs text-[#706B7D]">
                Room #{roomName} requires a mask &amp; custom alias to join
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-black transition-colors cursor-pointer"
            title="Leave room"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Explanation Alert */}
          <div className="p-3.5 rounded-2xl bg-purple-50 border border-[#5420F5]/25 text-[#191525] text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#5420F5] shrink-0 mt-0.5" />
            <p className="leading-relaxed font-medium">
              The 10 default anonymous aliases in this room have already been assigned to earlier members. Unlimited students can join—simply choose any mask below and enter your own custom alias to participate!
            </p>
          </div>

          {/* 1. Mask Picker Grid */}
          <div className="space-y-2">
            <label className="text-xs font-black text-[#191525] block">
              1. Choose Your Mask Icon
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-100 rounded-2xl bg-[#FAF9FC]">
              {ROOM_PRESET_ALIASES.map((persona) => {
                const isSelected = selectedMask.id === persona.id;
                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => {
                      setSelectedMask(persona);
                      setErrorMsg('');
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#5420F5] bg-white ring-2 ring-[#5420F5]/30 shadow-xs'
                        : 'border-[#EAE6F0] bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#FAF9FC] border border-[#5420F5]/20 flex items-center justify-center p-0.5 shrink-0">
                      <PersonaMaskIcon mask={persona.id} size={24} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-black truncate ${isSelected ? 'text-[#5420F5]' : 'text-[#191525]'}`}>
                        {persona.name}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#5420F5] stroke-[3] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Custom Alias Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="custom-alias-input" className="text-xs font-black text-[#191525] flex items-center gap-1.5">
                <EditAliasIcon size={16} />
                <span>2. Write Your Custom Alias</span>
              </label>
              <button
                type="button"
                onClick={handleRollIdea}
                className="text-[11px] font-bold text-[#5420F5] hover:underline flex items-center gap-1 cursor-pointer"
                title="Generate a random alias idea"
              >
                <Shuffle className="w-3 h-3" />
                <span>Roll an idea</span>
              </button>
            </div>

            <div className="relative">
              <input
                id="custom-alias-input"
                type="text"
                value={aliasInput}
                onChange={handleInputChange}
                placeholder="e.g. MidnightSpecter, VelvetBrain..."
                maxLength={25}
                autoFocus
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-xs font-bold text-[#191525] placeholder:text-slate-400 focus:outline-none ${
                  errorMsg
                    ? 'border-rose-400 focus:border-rose-500 ring-2 ring-rose-100'
                    : 'border-[#EAE6F0] focus:border-[#5420F5] focus:ring-2 focus:ring-[#5420F5]/20'
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">
                {aliasInput.trim().length}/25
              </span>
            </div>

            {errorMsg && (
              <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </p>
            )}
          </div>

          {/* 3. Live Persona Card Preview */}
          <div className="p-3 rounded-2xl bg-[#F0EBFF]/60 border border-[#5420F5]/25 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#5420F5]/30 flex items-center justify-center p-1 shrink-0 shadow-2xs">
              <PersonaMaskIcon mask={selectedMask.id} size={28} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-[#191525] truncate">
                  {aliasInput.trim() || 'Your Custom Alias'}
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-[#5420F5] text-white">
                  Custom Persona
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Saved for this room across visits until room is deleted
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Leave Room</span>
            </button>

            <button
              type="submit"
              disabled={!isValid}
              className="px-5 py-2.5 rounded-xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black transition-all cursor-pointer disabled:opacity-40 shadow-md shadow-[#5420F5]/25 active:scale-95 flex items-center gap-1.5"
            >
              <span>Enter Room</span>
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
