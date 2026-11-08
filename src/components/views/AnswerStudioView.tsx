import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Sparkles, Check, Share2, Download, Save, Wand2 } from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { ShareCardCanvas } from '../share/ShareCardCanvas.tsx';
import { BopoiLogo } from '../brand/BopoiLogo.tsx';
import { SparklePolishIcon, StoryStudioNavIcon } from '../brand/icons/index.ts';

export const AnswerStudioView: React.FC = () => {
  const {
    user,
    messages,
    selectedMessage,
    selectedAnswer,
    answers,
    saveAnswer,
    setActiveView,
    goBack,
    showToast,
  } = useBopoi();

  const activeMessage = selectedMessage || messages[0] || null;
  const currentAnswer = activeMessage
    ? answers[activeMessage.id]
    : selectedAnswer || null;

  const defaultQuestion = activeMessage
    ? activeMessage.text
    : currentAnswer?.questionText || user.customPrompt || 'Send me an anonymous question!';

  const [answerText, setAnswerText] = useState(
    currentAnswer?.answerText || ''
  );

  const [sharePublicly, setSharePublicly] = useState(
    currentAnswer ? currentAnswer.isPublic : true
  );

  // Sync when selectedMessage or currentAnswer changes
  useEffect(() => {
    setAnswerText(currentAnswer?.answerText || '');
  }, [activeMessage?.id, currentAnswer?.id]);

  // Real-time typing indicator state
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const targetMessageId = activeMessage?.id || currentAnswer?.messageId || '';

  // Handle typing detection
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAnswerText(e.target.value);
    setIsTyping(true);

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1200);
  };

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  const handleSaveDraft = () => {
    if (!targetMessageId) {
      showToast('Select an inbox message first to save a draft.', 'info');
      return;
    }
    saveAnswer(targetMessageId, answerText, sharePublicly, true);
  };

  const handleSaveAndPublish = () => {
    if (!targetMessageId) {
      showToast('Select an inbox message first to publish your answer.', 'info');
      return;
    }
    if (!answerText.trim()) {
      showToast('Please write a response before publishing.', 'error');
      return;
    }
    saveAnswer(targetMessageId, answerText, sharePublicly, false);
    showToast('Card saved and ready for sharing!', 'success');
  };

  return (
    <div className="w-full sm:min-h-[calc(100dvh-4rem)] bg-[#FAF9FC] py-4 sm:py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => goBack('inbox')}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-black cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5420F5] bg-white border border-[#EAE6F0] px-3 py-1.5 rounded-full shadow-2xs">
            <StoryStudioNavIcon size={18} />
            <span>Bopoi Share-Card Studio</span>
          </span>
        </div>

        {/* Studio Grid: Left Editor + Right Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Composer Controls */}
          <div className="lg:col-span-6 space-y-4">
            <div>
              <h2 className="text-2xl font-black text-[#191525] tracking-tight">
                Craft Your Answer
              </h2>
              <p className="text-xs sm:text-sm text-[#706B7D] mt-1">
                Answer on your own terms. Your response renders dynamically onto the Bopoi card.
              </p>
            </div>

            {/* Original Question Card */}
            <div className="bg-white border border-[#EAE6F0] rounded-2xl p-5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#706B7D]">
                Anonymous Question
              </span>
              <p className="text-base font-bold text-[#191525] mt-1 leading-snug">
                {defaultQuestion}
              </p>
            </div>

            {/* Answer Input */}
            <div className="bg-white border border-[#EAE6F0] rounded-2xl p-4 focus-within:border-[#5420F5] focus-within:ring-2 focus-within:ring-[#5420F5]/10 transition-all shadow-2xs relative">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#191525]">
                  Your Response
                </label>

                {/* Real-time Typing Indicator in Composer */}
                {isTyping && (
                  <div className="flex items-center gap-2 bg-[#F0EBFF] px-2.5 py-1 rounded-full text-[#5420F5] text-[11px] font-bold animate-in fade-in duration-200">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5420F5] animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5420F5] animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5420F5] animate-bounce" />
                    </div>
                    <span>{user.displayName} is typing...</span>
                  </div>
                )}
              </div>

              <textarea
                rows={5}
                maxLength={500}
                value={answerText}
                onChange={handleTextChange}
                placeholder="Type your answer here..."
                className="w-full text-sm sm:text-base text-[#191525] placeholder-slate-400 focus:outline-none resize-none bg-transparent leading-relaxed"
              />

              <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs text-slate-400">
                <span className="text-[11px] text-[#5420F5] font-semibold">
                  {isTyping ? 'Live composing in progress...' : 'Expressive & unfiltered'}
                </span>
                <span className="tabular-nums font-mono">{answerText.length}/500</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveDraft}
                className="flex-1 py-3 px-4 bg-white border border-[#EAE6F0] text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4 text-slate-500" />
                <span>Save Draft</span>
              </button>
              <button
                onClick={handleSaveAndPublish}
                className="flex-1 py-3 px-4 bg-[#5420F5] text-white text-xs font-extrabold rounded-xl hover:bg-[#4314E2] transition-colors cursor-pointer shadow-md shadow-[#5420F5]/20 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Publish Card</span>
              </button>
            </div>

            {/* Share Publicly Toggle */}
            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#EAE6F0] shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#5420F5]/10 text-[#5420F5] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#191525]">Share publicly</p>
                  <p className="text-[11px] text-[#706B7D]">
                    Your answer will be featured as a Bopoi card on your profile and story exports.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={sharePublicly}
                onChange={(e) => setSharePublicly(e.target.checked)}
                className="w-4 h-4 accent-[#5420F5] rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Right Column: Live Card Preview & Canvas Exporter */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <div className="w-full max-w-md space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-[#191525]">
                    Live Story Card Preview
                  </span>
                  {isTyping && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Live Updating
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold text-[#5420F5] bg-[#F0EBFF] px-2.5 py-1 rounded-full">
                  1080 × 1350 Canvas
                </span>
              </div>

              {/* Share Card Canvas with Live Preview & High-Res Export */}
              <ShareCardCanvas
                question={defaultQuestion}
                answer={answerText}
                authorName={user.displayName}
                authorUsername={user.username}
                reactions={selectedMessage?.reactions}
                isTyping={isTyping}
                messageId={selectedMessage?.id}
                onShareComplete={handleSaveAndPublish}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
