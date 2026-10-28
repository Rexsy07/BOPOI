import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import {
  Download,
  Share2,
  Copy,
  Sparkles,
  Check,
  Palette,
  Loader2,
  Lock,
} from 'lucide-react';
import { BopoiLogo } from '../brand/BopoiLogo.tsx';
import { SparklePolishIcon } from '../brand/icons/index.ts';
import { CampusCharacterAvatar, getCharacterSvgDataUri } from '../brand/character/index.ts';
import { useBopoi } from '../../context/BopoiContext.tsx';
import logoPhotoUrl from '../../assets/images/7B5FF243-F4C9-4FF2-8465-1925644E0468.jpeg';

export type CardThemeId = 'royal' | 'sunset' | 'midnight' | 'emerald';

export interface CardThemeConfig {
  id: CardThemeId;
  name: string;
  bgGradient: string;
  canvasColors: [string, string, string];
  accentColor: string;
  accentBg: string;
  badgeBg: string;
  glowColor1: string;
  glowColor2: string;
}

export const CARD_THEMES: CardThemeConfig[] = [
  {
    id: 'royal',
    name: 'Bopoi Royal',
    bgGradient: 'bg-gradient-to-b from-[#3510B9] via-[#4815D8] to-[#5420F5]',
    canvasColors: ['#3510B9', '#4815D8', '#5420F5'],
    accentColor: '#5420F5',
    accentBg: '#F0EBFF',
    badgeBg: 'bg-white/20',
    glowColor1: 'rgba(245, 45, 133, 0.2)',
    glowColor2: 'rgba(255, 201, 40, 0.15)',
  },
  {
    id: 'sunset',
    name: 'Sunset Glow',
    bgGradient: 'bg-gradient-to-b from-[#9E1256] via-[#D81B60] to-[#FF7043]',
    canvasColors: ['#9E1256', '#D81B60', '#FF7043'],
    accentColor: '#D81B60',
    accentBg: '#FFF0F5',
    badgeBg: 'bg-white/20',
    glowColor1: 'rgba(255, 112, 67, 0.25)',
    glowColor2: 'rgba(255, 214, 0, 0.2)',
  },
  {
    id: 'midnight',
    name: 'Midnight Vibe',
    bgGradient: 'bg-gradient-to-b from-[#090714] via-[#170E30] to-[#2D1658]',
    canvasColors: ['#090714', '#170E30', '#2D1658'],
    accentColor: '#8B5CF6',
    accentBg: '#F3E8FF',
    badgeBg: 'bg-white/10',
    glowColor1: 'rgba(139, 92, 246, 0.25)',
    glowColor2: 'rgba(244, 63, 94, 0.15)',
  },
  {
    id: 'emerald',
    name: 'Campus Emerald',
    bgGradient: 'bg-gradient-to-b from-[#064E3B] via-[#047857] to-[#0D9488]',
    canvasColors: ['#064E3B', '#047857', '#0D9488'],
    accentColor: '#047857',
    accentBg: '#ECFDF5',
    badgeBg: 'bg-white/20',
    glowColor1: 'rgba(16, 185, 129, 0.25)',
    glowColor2: 'rgba(251, 191, 36, 0.15)',
  },
];

interface ShareCardCanvasProps {
  question: string;
  answer: string;
  authorName: string;
  authorUsername: string;
  reactions?: Record<string, number>;
  isTyping?: boolean;
  messageId?: string;
  onShareComplete?: () => void;
}

export const ShareCardCanvas: React.FC<ShareCardCanvasProps> = ({
  question,
  answer,
  authorName,
  authorUsername,
  reactions,
  isTyping = false,
  onShareComplete,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<CardThemeId>('royal');
  const [isExporting, setIsExporting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const { user } = useBopoi();
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const charImgRef = useRef<HTMLImageElement | null>(null);

  React.useEffect(() => {
    const img = new Image();
    img.src = logoPhotoUrl;
    img.onload = () => {
      logoImgRef.current = img;
    };
  }, []);

  React.useEffect(() => {
    const charImg = new Image();
    charImg.src = getCharacterSvgDataUri(user.avatarUrl, authorUsername);
    charImg.onload = () => {
      charImgRef.current = charImg;
    };
  }, [user.avatarUrl, authorUsername]);

  const activeTheme =
    CARD_THEMES.find((t) => t.id === selectedThemeId) || CARD_THEMES[0];

  // Official Bopoi Photo Logo renderer for Canvas 2D
  const drawBopoiLogo = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    if (logoImgRef.current && logoImgRef.current.complete) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, size * 0.25);
      ctx.clip();
      ctx.drawImage(logoImgRef.current, x, y, size, size);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(x, y);
    const scale = size / 100;
    ctx.scale(scale, scale);

    // Purple rounded box
    const boxGrad = ctx.createLinearGradient(0, 0, 100, 100);
    boxGrad.addColorStop(0, '#6028FF');
    boxGrad.addColorStop(0.6, '#4F1DF2');
    boxGrad.addColorStop(1, '#350EB9');
    ctx.fillStyle = boxGrad;
    ctx.beginPath();
    ctx.roundRect(0, 0, 100, 100, 26);
    ctx.fill();

    // Warm shoulder crescent
    const warmGrad = ctx.createLinearGradient(50, 20, 100, 90);
    warmGrad.addColorStop(0, '#FFA62B');
    warmGrad.addColorStop(0.45, '#FF6B35');
    warmGrad.addColorStop(1, '#F52D85');
    ctx.fillStyle = warmGrad;
    ctx.beginPath();
    ctx.arc(60, 60, 32, -Math.PI * 0.4, Math.PI * 0.6);
    ctx.fill();

    // White 'b' stem and loop
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(14, 10, 18, 54, 9);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(52, 58, 32, 0, Math.PI * 2);
    ctx.fill();

    // Inner purple bubble
    const bubbleGrad = ctx.createLinearGradient(30, 40, 70, 80);
    bubbleGrad.addColorStop(0, '#3C11B8');
    bubbleGrad.addColorStop(1, '#2A0B85');
    ctx.fillStyle = bubbleGrad;
    ctx.beginPath();
    ctx.arc(52, 58, 22, 0, Math.PI * 2);
    ctx.fill();

    // Speech bubble tail
    ctx.beginPath();
    ctx.moveTo(38, 71);
    ctx.lineTo(34, 82);
    ctx.lineTo(46, 74);
    ctx.closePath();
    ctx.fill();

    // Two white eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(43, 52, 6, 12, 3);
    ctx.roundRect(55, 52, 6, 12, 3);
    ctx.fill();

    // Two angled yellow energy pill ticks matching official logo
    ctx.fillStyle = '#FFC928';
    ctx.save();
    ctx.translate(35, 12);
    ctx.rotate((22 * Math.PI) / 180);
    ctx.beginPath();
    ctx.roundRect(-3, -7, 6, 14, 3);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(43, 18);
    ctx.rotate((50 * Math.PI) / 180);
    ctx.beginPath();
    ctx.roundRect(-2.5, -5, 5, 10, 2.5);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  };

  // Sparkle icon renderer for Canvas 2D
  const drawSparkle = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
    ctx.save();
    ctx.fillStyle = '#FFC928';
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.quadraticCurveTo(cx, cy, cx + size, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy + size);
    ctx.quadraticCurveTo(cx, cy, cx - size, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy - size);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // Lock icon renderer for Canvas 2D
  const drawLockIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x + 10, y + 7, 7, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(x, y + 8, 20, 16, 4);
    ctx.fill();
    ctx.restore();
  };

  const wrapTextWithNewlines = (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    maxLines: number
  ): string[] => {
    const paragraphs = text.split('\n');
    const lines: string[] = [];

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        lines.push('');
        if (lines.length >= maxLines) break;
        continue;
      }
      const words = paragraph.split(' ');
      let currentLine = words[0] || '';

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + ' ' + word).width;
        if (width < maxWidth) {
          currentLine += ' ' + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
          if (lines.length >= maxLines) break;
        }
      }
      if (currentLine && lines.length < maxLines) {
        lines.push(currentLine);
      }
      if (lines.length >= maxLines) break;
    }
    return lines.slice(0, maxLines);
  };

  // High-Resolution 1080×1350 Canvas 2D Generator — Exactly identical to the Live Preview Card
  const generateCanvasFallback = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // 1. Draw Theme Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1350);
    bgGrad.addColorStop(0, activeTheme.canvasColors[0]);
    bgGrad.addColorStop(0.5, activeTheme.canvasColors[1]);
    bgGrad.addColorStop(1, activeTheme.canvasColors[2]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1350);

    // Subtle ambient glow orbs
    ctx.save();
    ctx.fillStyle = activeTheme.glowColor1;
    ctx.beginPath();
    ctx.arc(940, 220, 360, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = activeTheme.glowColor2;
    ctx.beginPath();
    ctx.arc(140, 1160, 340, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Header: Bopoi Mascot Logo & Header Stamp
    drawBopoiLogo(ctx, 90, 80, 68);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 44px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
    ctx.fillText('Bopoi', 175, 128);

    // Pill badge for bopoi.com
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(810, 88, 180, 52, 26);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 24px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
    ctx.fillText('bopoi.com', 844, 122);
    ctx.restore();

    // 3. Unified Inner White Card (Floating, exactly matching preview)
    const cardX = 90;
    const cardY = 175;
    const cardW = 900;
    const cardH = 980;
    const cardR = 44;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 24;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, cardR);
    ctx.fill();
    ctx.restore();

    // Inner Card Border
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, cardR);
    ctx.stroke();
    ctx.restore();

    // Top-Right Sparkle
    drawSparkle(ctx, cardX + cardW - 65, cardY + 65, 22);

    // Anonymous Ask Header Pill
    drawLockIcon(ctx, cardX + 48, cardY + 52, activeTheme.accentColor);
    ctx.fillStyle = activeTheme.accentColor;
    ctx.font = '800 22px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('ANONYMOUS ASK', cardX + 80, cardY + 68);

    // Question Text
    ctx.fillStyle = '#191525';
    ctx.font = '700 40px "Plus Jakarta Sans", system-ui, sans-serif';
    const qLines = wrapTextWithNewlines(ctx, `"${question}"`, 800, 3);
    let currentY = cardY + 130;
    qLines.forEach((l) => {
      ctx.fillText(l, cardX + 48, currentY);
      currentY += 52;
    });

    // Divider
    currentY += 16;
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cardX + 48, currentY);
    ctx.lineTo(cardX + cardW - 48, currentY);
    ctx.stroke();

    // Answer text
    currentY += 60;
    const textToShow = answer || 'Waiting for response...';
    if (!answer) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'italic 600 36px "Plus Jakarta Sans", system-ui, sans-serif';
    } else {
      ctx.fillStyle = '#1E293B';
      ctx.font = '600 38px "Plus Jakarta Sans", system-ui, sans-serif';
    }
    const aLines = wrapTextWithNewlines(ctx, textToShow, 800, 7);
    aLines.forEach((l) => {
      ctx.fillText(l, cardX + 48, currentY);
      currentY += 56;
    });

    // Reactions (if any) as neat rounded pill badges
    if (reactions && Object.keys(reactions).length > 0) {
      const rxEntries = Object.entries(reactions).slice(0, 4);
      let rxX = cardX + 48;
      const rxY = cardY + cardH - 120;
      rxEntries.forEach(([emoji, count]) => {
        const text = `${emoji} ${count}`;
        ctx.font = '700 22px "Plus Jakarta Sans", system-ui, sans-serif';
        const textW = ctx.measureText(text).width;
        const pillW = textW + 32;
        const pillH = 42;

        ctx.save();
        ctx.fillStyle = '#F8FAFC';
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(rxX, rxY, pillW, pillH, 21);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#334155';
        ctx.fillText(text, rxX + 16, rxY + 28);
        ctx.restore();

        rxX += pillW + 12;
      });
    }

    // Divider before author stamp
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cardX + 48, cardY + cardH - 76);
    ctx.lineTo(cardX + cardW - 48, cardY + cardH - 76);
    ctx.stroke();

    // Author Stamp Attribution with 3D Character Portrait
    let authorTextX = cardX + 48;
    if (charImgRef.current && charImgRef.current.complete) {
      const charSize = 48;
      const charY = cardY + cardH - 64;
      ctx.save();
      ctx.beginPath();
      ctx.arc(authorTextX + charSize / 2, charY + charSize / 2, charSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(charImgRef.current, authorTextX, charY, charSize, charSize);
      ctx.restore();
      authorTextX += charSize + 14;
    }

    ctx.fillStyle = activeTheme.accentColor;
    ctx.font = '800 30px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(`${authorName} (@${authorUsername})`, authorTextX, cardY + cardH - 32);

    ctx.fillStyle = '#FF922E';
    ctx.font = 'italic bold 28px "Plus Jakarta Sans", system-ui, sans-serif';
    const tagText = '#campusvibes';
    const tagW = ctx.measureText(tagText).width;
    ctx.fillText(tagText, cardX + cardW - 48 - tagW, cardY + cardH - 32);

    // 4. Footer Note on Story Canvas
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.font = '700 28px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(`bopoi.com/@${authorUsername}/ask`, cardX, 1228);

    const amaText = 'Ask me anything 💜';
    ctx.font = '600 26px "Plus Jakarta Sans", system-ui, sans-serif';
    const amaW = ctx.measureText(amaText).width;
    ctx.fillText(amaText, cardX + cardW - amaW, 1228);

    return canvas.toDataURL('image/png');
  };

  // High-Resolution Exact DOM Image Generator so downloaded PNG matches Live Story Card Preview 100%
  const getRenderedImageDataUrl = async (): Promise<string> => {
    if (cardRef.current) {
      try {
        const exactDataUrl = await toPng(cardRef.current, {
          pixelRatio: 3,
          cacheBust: true,
        });
        if (exactDataUrl && exactDataUrl.startsWith('data:image/png')) {
          return exactDataUrl;
        }
      } catch {
        // Fallback to canvas renderer if DOM capture fails
      }
    }
    return generateCanvasFallback();
  };

  // 1. Download PNG File
  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const dataUrl = await getRenderedImageDataUrl();
      const link = document.createElement('a');
      link.download = `bopoi_${authorUsername}_story_card.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (onShareComplete) onShareComplete();
    } catch {
      const fallbackUrl = generateCanvasFallback();
      const link = document.createElement('a');
      link.download = `bopoi_${authorUsername}_story_card.png`;
      link.href = fallbackUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Copy Image to Clipboard (Instant Instagram / WhatsApp paste)
  const handleCopyImage = async () => {
    setIsExporting(true);
    try {
      const dataUrl = await getRenderedImageDataUrl();
      if (navigator.clipboard && window.ClipboardItem) {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2500);
          if (onShareComplete) onShareComplete();
          return;
        } catch {
          // Clipboard write failed or restricted by browser permissions, fallback to direct file download
        }
      }
      // Direct file download fallback
      const link = document.createElement('a');
      link.download = `bopoi_${authorUsername}_story_card.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (onShareComplete) onShareComplete();
    } catch {
      await handleDownload();
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Native Social Share
  const handleWebShare = async () => {
    const askUrl = `https://bopoi.com/@${authorUsername}/ask`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bopoi Q&A — ${authorName}`,
          text: `"${question}" — ${answer}`,
          url: askUrl,
        });
        if (onShareComplete) onShareComplete();
      } catch {
        handleDownload();
      }
    } else {
      handleDownload();
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Theme Picker Row */}
      <div className="flex items-center justify-between bg-white border border-[#EAE6F0] rounded-2xl p-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-[#5420F5]" />
          <span className="text-xs font-bold text-[#191525]">Card Theme:</span>
        </div>
        <div className="flex items-center gap-1.5">
          {CARD_THEMES.map((theme) => {
            const isSelected = theme.id === selectedThemeId;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setSelectedThemeId(theme.id)}
                title={theme.name}
                className={`w-7 h-7 rounded-full ${theme.bgGradient} transition-all cursor-pointer flex items-center justify-center ${
                  isSelected
                    ? 'ring-2 ring-offset-2 ring-[#5420F5] scale-110 shadow-sm'
                    : 'opacity-75 hover:opacity-100 hover:scale-105'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Visual Story Card: This EXACT element is both what you see in preview and what gets downloaded */}
      <div
        ref={cardRef}
        id="bopoi-story-card-element"
        className={`relative w-full rounded-3xl p-6 ${activeTheme.bgGradient} text-white shadow-2xl overflow-hidden border border-white/20 select-none transition-all flex flex-col justify-between`}
        style={{ minHeight: '440px' }}
      >
        {/* Ambient Glow Orbs */}
        <div
          className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-2xl pointer-events-none opacity-40"
          style={{ backgroundColor: activeTheme.canvasColors[1] }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full blur-2xl pointer-events-none opacity-30"
          style={{ backgroundColor: activeTheme.canvasColors[0] }}
        />

        {/* Top Header Stamp */}
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BopoiLogo variant="icon" size={28} idPrefix={`card-${selectedThemeId}`} />
            <span className="text-base font-black tracking-tight text-white drop-shadow-xs">
              Bopoi
            </span>
          </div>
          <span
            className={`text-[10px] font-bold ${activeTheme.badgeBg} px-2.5 py-0.5 rounded-full text-white/95 backdrop-blur-xs border border-white/15`}
          >
            bopoi.com
          </span>
        </div>

        {/* Unified Inner White Question & Answer Box */}
        <div className="relative z-10 bg-white text-[#191525] rounded-2xl p-5 shadow-xl flex-1 flex flex-col justify-between transition-all border border-black/5">
          {/* Top-Right Yellow Sparkles */}
          <div className="absolute top-3.5 right-3.5 text-[#FFC928]">
            <Sparkles className="w-5 h-5 fill-[#FFC928]" />
          </div>

          <div>
            {/* Anonymous Ask Header Pill */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <Lock className="w-3 h-3 text-[#5420F5]" />
              <span
                className="text-[10px] font-extrabold uppercase tracking-wider block"
                style={{ color: activeTheme.accentColor }}
              >
                Anonymous Ask
              </span>
            </div>

            {/* Question Text */}
            <h4 className="text-sm sm:text-base font-bold text-[#191525] leading-snug break-words">
              "{question}"
            </h4>

            {/* Subtle Divider */}
            <div className="mt-3.5 pt-3 border-t border-slate-100">
              <p className="text-sm sm:text-base text-slate-800 font-semibold leading-relaxed whitespace-pre-wrap break-words">
                {answer || (
                  <span className="text-slate-400 italic">
                    Waiting for response...
                  </span>
                )}
                {/* Real-time Blinking Cursor while user is actively typing in studio */}
                {isTyping && !isExporting && (
                  <span
                    className="inline-block w-1.5 h-4 ml-1 align-middle animate-pulse"
                    style={{ backgroundColor: activeTheme.accentColor }}
                  />
                )}
              </p>
            </div>
          </div>

          {/* Card Footer: Reactions + Author Stamp */}
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
            {/* If Reactions exist on this message, render them neatly */}
            {reactions && Object.keys(reactions).length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pb-1">
                {Object.entries(reactions).map(([emoji, count]) => (
                  <span
                    key={emoji}
                    className="inline-flex items-center gap-1 bg-slate-100/90 px-2 py-0.5 rounded-full text-[11px] font-bold text-slate-700"
                  >
                    <span>{emoji}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{count}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Attribution Line */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <CampusCharacterAvatar
                  value={user.avatarUrl}
                  seed={authorUsername}
                  size={24}
                  rounded="full"
                />
                <span
                  className="font-extrabold truncate"
                  style={{ color: activeTheme.accentColor }}
                >
                  {authorName} (@{authorUsername})
                </span>
              </div>
              <span className="text-[#FF922E] font-medium text-xs shrink-0">
                #campusvibes
              </span>
            </div>
          </div>
        </div>

        {/* Card Footer Note */}
        <div className="relative z-10 mt-4 flex items-center justify-between text-[11px] text-white/80 font-medium">
          <span className="truncate max-w-[200px]">bopoi.com/@{authorUsername}/ask</span>
          <span>Ask me anything 💜</span>
        </div>
      </div>

      {/* Export Action Buttons */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#EAE6F0] shadow-xs space-y-2.5">
        <div className="flex items-center justify-between text-xs text-[#706B7D] px-1">
          <span className="font-bold text-[#191525]">Story Export</span>
          <span>Ultra-crisp 1080×1350 PNG</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* 1. Download PNG */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            className="py-2.5 px-3 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-[#5420F5]/20 cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Save Image</span>
          </button>

          {/* 2. Copy Image (Instant paste for Instagram / WhatsApp) */}
          <button
            type="button"
            onClick={handleCopyImage}
            disabled={isExporting}
            className="py-2.5 px-3 bg-[#FAF9FC] hover:bg-[#F0EBFF] text-[#191525] hover:text-[#5420F5] border border-[#EAE6F0] text-xs font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {copySuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#5420F5]" />
                <span>Copy Image</span>
              </>
            )}
          </button>

          {/* 3. Share to Socials */}
          <button
            type="button"
            onClick={handleWebShare}
            disabled={isExporting}
            className="py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-800 border border-[#EAE6F0] text-xs font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Share2 className="w-4 h-4 text-[#5420F5]" />
            <span>Share Link</span>
          </button>
        </div>

        <p className="text-[11px] text-center text-[#706B7D] pt-1 flex items-center justify-center gap-1">
          <SparklePolishIcon size={14} className="shrink-0" />
          <span>Exact match guarantee: What you see in the preview is precisely what downloads to your camera roll.</span>
        </p>
      </div>
    </div>
  );
};
