import React, { useState, useRef } from 'react';
import {
  ImagePlus,
  Upload,
  Trash2,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  parseRoomIcon,
  serializeRoomIcon,
  processGalleryRoomImage,
} from '../../utils/roomIconConfig.ts';
import { uploadRoomIconToSupabaseStorage } from '../../lib/supabase.ts';
import { RoomBadgeIcon } from '../brand/icons/RoomBadgeIcon.tsx';

interface RoomIconStudioPickerProps {
  iconEmoji: string;
  iconBg: string;
  roomName?: string;
  category?: string;
  onChange: (nextIconEmoji: string, nextIconBg: string) => void;
}

export const RoomIconStudioPicker: React.FC<RoomIconStudioPickerProps> = ({
  iconEmoji,
  iconBg,
  roomName,
  category,
  onChange,
}) => {
  const config = parseRoomIcon(iconEmoji, iconBg, category, roomName);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const hasUploadedImage =
    config.mode === 'image' && Boolean(config.value);

  const applyUploadedImage = async (file: File) => {
    setUploadError(null);
    setIsUploadingImage(true);
    try {
      const croppedDataUrl = await processGalleryRoomImage(file, 160);
      const initialSerialized = serializeRoomIcon({
        mode: 'image',
        value: croppedDataUrl,
        fillType: 'solid',
        fillValue: '#191525',
        shape: 'squircle',
        glow: 'none',
      });
      onChange(initialSerialized.iconEmoji, initialSerialized.iconBg);

      // Attempt to upload to Supabase Storage in background so iconEmoji uses a clean public URL when available
      const uploadedEmoji = await uploadRoomIconToSupabaseStorage(
        initialSerialized.iconEmoji,
        roomName || 'room'
      );
      if (uploadedEmoji && uploadedEmoji !== initialSerialized.iconEmoji) {
        onChange(uploadedEmoji, initialSerialized.iconBg);
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Could not process image from gallery.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOpenGalleryPicker = () => {
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleGalleryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    applyUploadedImage(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      applyUploadedImage(file);
    }
  };

  const handleRemoveImage = () => {
    setUploadError(null);
    onChange('', 'badge:v1|solid|#191525|squircle|none|#191525');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-black text-[#191525] dark:text-[#F4F2FA]">
          Room Profile Photo <span className="text-[#5420F5] dark:text-[#B9A7FF]">*</span>
        </label>
        <span className="text-[10px] font-bold text-[#706B7D] dark:text-[#9E97B3]">
          Required · Upload from Gallery
        </span>
      </div>

      {/* Hidden File Input for Device Gallery Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleGalleryFileChange}
        className="hidden"
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-4 transition-all ${
          isDragging
            ? 'border-[#5420F5] bg-[#F0EBFF]/60 dark:bg-[#231A45]/70'
            : hasUploadedImage
            ? 'border-[#5420F5]/30 bg-gradient-to-r from-[#F0EBFF]/40 via-white to-[#FAF9FC] dark:from-[#231A45]/60 dark:via-[#171322] dark:to-[#0E0C14]'
            : 'border-[#5420F5]/40 hover:border-[#5420F5] bg-[#FAF9FC] dark:bg-[#171322]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              type="button"
              onClick={handleOpenGalleryPicker}
              title="Upload room profile photo from gallery"
              className="relative group shrink-0 cursor-pointer"
            >
              {hasUploadedImage ? (
                <RoomBadgeIcon
                  iconEmoji={iconEmoji}
                  iconBg={iconBg}
                  category={category}
                  roomName={roomName}
                  size="lg"
                  className="shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-[#F0EBFF] dark:bg-[#231A45] border-2 border-dashed border-[#5420F5]/50 flex items-center justify-center text-[#5420F5] dark:text-[#B9A7FF] group-hover:bg-[#5420F5]/15 transition-colors">
                  <ImagePlus className="w-6 h-6" />
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#5420F5] text-white border-2 border-white dark:border-[#0E0C14] flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                <ImagePlus className="w-3 h-3" />
              </span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-[#191525] dark:text-[#F4F2FA]">
                  {hasUploadedImage
                    ? 'Gallery Profile Photo Uploaded'
                    : 'Upload Room Photo from Gallery'}
                </span>
                {hasUploadedImage ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Ready</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                    Required
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] leading-snug mt-0.5">
                {hasUploadedImage
                  ? 'Your uploaded gallery photo will be shown as this room’s profile picture across Bopoi.'
                  : 'Select an image from your device gallery (JPG, PNG, WebP). Required to create or save a room.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenGalleryPicker}
              disabled={isUploadingImage}
              className="flex-1 sm:flex-initial min-h-[42px] px-3.5 py-2.5 rounded-xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-[#5420F5]/20 active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">
                {isUploadingImage
                  ? 'Uploading...'
                  : hasUploadedImage
                  ? 'Change Photo'
                  : 'Choose from Gallery'}
              </span>
            </button>

            {hasUploadedImage && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="min-w-[42px] min-h-[42px] p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 transition-colors cursor-pointer flex items-center justify-center"
                title="Remove uploaded photo"
                aria-label="Remove uploaded photo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {uploadError && (
        <div className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-[11px] font-bold flex items-center justify-between">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-rose-500 hover:text-rose-800 dark:hover:text-rose-200 cursor-pointer p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
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
  const [saveError, setSaveError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setDraftEmoji(currentIconEmoji);
      setDraftBg(currentIconBg);
      setSaveError(null);
    }
  }, [isOpen, currentIconEmoji, currentIconBg]);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const parsedDraft = parseRoomIcon(draftEmoji, draftBg, category, roomName);
  const hasUploadedPhoto =
    parsedDraft.mode === 'image' && Boolean(parsedDraft.value);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasUploadedPhoto) {
      setSaveError('Please upload an image from your gallery first.');
      return;
    }
    onSave(draftEmoji, draftBg);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA] rounded-t-3xl sm:rounded-3xl max-w-md w-full overflow-hidden flex flex-col shadow-2xl border border-[#EAE6F0] dark:border-[#262036] animate-in zoom-in-95 duration-200"
      >
        <div className="w-10 h-1 bg-[#EAE6F0] dark:bg-[#262036] rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#EAE6F0] dark:border-[#262036] bg-gradient-to-r from-[#FAF9FC] to-white dark:from-[#171322] dark:to-[#0E0C14] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <RoomBadgeIcon
              iconEmoji={draftEmoji}
              iconBg={draftBg}
              category={category}
              roomName={roomName}
              size="sm"
            />
            <div className="min-w-0">
              <h2 className="text-base font-black text-[#191525] dark:text-[#F4F2FA] truncate">
                Room Profile Photo
              </h2>
              <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] truncate">
                #{roomName} · Upload from gallery
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-[#FAF9FC] dark:hover:bg-[#171322] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-white transition-colors cursor-pointer shrink-0"
            title="Close"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4">
          <RoomIconStudioPicker
            iconEmoji={draftEmoji}
            iconBg={draftBg}
            roomName={roomName}
            category={category}
            onChange={(nextEmoji: string, nextBg: string) => {
              setDraftEmoji(nextEmoji);
              setDraftBg(nextBg);
              setSaveError(null);
            }}
          />

          {saveError && (
            <div className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-[11px] font-bold">
              {saveError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EAE6F0] dark:border-[#262036]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#EAE6F0] dark:border-[#262036] bg-white dark:bg-[#171322] hover:bg-[#FAF9FC] dark:hover:bg-[#231A45] text-xs font-bold text-[#191525] dark:text-[#F4F2FA] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!hasUploadedPhoto}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#5420F5] hover:bg-[#4314E2] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black transition-all cursor-pointer shadow-md shadow-[#5420F5]/25 active:scale-95"
            >
              Save Profile Photo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

