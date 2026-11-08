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
  inferEmblemFromCategory,
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
    const fallbackEmblem = inferEmblemFromCategory(category);
    const serialized = serializeRoomIcon({
      mode: 'svg',
      value: fallbackEmblem,
      fillType: 'gradient',
      fillValue: 'electric-violet',
      shape: 'squircle',
      glow: 'soft',
    });
    onChange(serialized.iconEmoji, serialized.iconBg);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-black text-[#191525]">
        Room Profile Icon
      </label>

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
            ? 'border-[#5420F5] bg-[#F0EBFF]/60'
            : hasUploadedImage
            ? 'border-[#5420F5]/30 bg-gradient-to-r from-[#F0EBFF]/40 via-white to-[#FAF9FC]'
            : 'border-[#EAE6F0] hover:border-[#5420F5]/40 bg-[#FAF9FC]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              type="button"
              onClick={handleOpenGalleryPicker}
              title="Upload room profile icon from gallery"
              className="relative group shrink-0 cursor-pointer"
            >
              <RoomBadgeIcon
                iconEmoji={iconEmoji}
                iconBg={iconBg}
                category={category}
                roomName={roomName}
                size="lg"
                className="shrink-0"
              />
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#5420F5] text-white border-2 border-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                <ImagePlus className="w-3 h-3" />
              </span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-[#191525]">
                  {hasUploadedImage
                    ? 'Gallery Profile Image Uploaded'
                    : 'Upload Room Icon from Gallery'}
                </span>
                {hasUploadedImage && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Ready</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#706B7D] leading-snug mt-0.5">
                {hasUploadedImage
                  ? 'Your uploaded gallery photo will be shown as this room’s profile icon across Bopoi.'
                  : 'Choose a photo from your device gallery (JPG, PNG, WebP). Automatically cropped to a crisp square icon.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenGalleryPicker}
              disabled={isUploadingImage}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-[#5420F5]/20 active:scale-95"
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
                className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 transition-colors cursor-pointer"
                title="Remove uploaded photo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {uploadError && (
        <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center justify-between">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-rose-500 hover:text-rose-800 cursor-pointer"
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
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden flex flex-col shadow-2xl border border-[#EAE6F0] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#EAE6F0] bg-gradient-to-r from-[#FAF9FC] to-white shrink-0">
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
                Room Profile Icon
              </h2>
              <p className="text-xs text-[#706B7D] truncate">
                #{roomName} · Upload from gallery
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
        <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4">
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

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#EAE6F0]">
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
              Save Profile Icon
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
