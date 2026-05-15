// StoryPreviewModal.tsx
import React, { useState } from "react";
import { Theme } from "../../types/LevelProgress.ts";
import { StoryPreview } from "./storyPreviewData.tsx";


interface StoryPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
  preview: StoryPreview | null;
  theme: Theme;
}

export const StoryPreviewModal: React.FC<StoryPreviewModalProps> = ({
  isOpen,
  onClose,
  onStart,
  preview,
  theme,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen || !preview) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[680px] bg-gray-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header image ── */}
        <div className="relative h-52 w-full overflow-hidden">
          <img
            src={preview.image}
            alt={preview.title}
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
          />
          {/* gradient fade into card body */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />

          {/* theme accent bar sits on top of image */}
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.progressGradient}`} />

          {/* Close button — floats over image */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/70 transition-all flex items-center justify-center text-sm leading-none"
            aria-label="Close"
          >
            ✕
          </button>

          {/* Emoji badge — overlaps image / body boundary */}
          {/* <div
            className={`absolute -bottom-6 left-6 w-14 h-14 rounded-2xl bg-gradient-to-br ${theme.progressGradient} flex items-center justify-center text-3xl shadow-xl border-2 border-gray-900`}
          >
            {preview.emoji}
          </div> */}
        </div>

        {/* ── Body ── */}
        <div className="px-6 pt-10 pb-6 space-y-4">

          {/* Title + meta */}
          <div>
            <p className="text-xs text-white/45 uppercase tracking-widest mb-1">
              {preview.difficulty} · {preview.duration}
            </p>
            <h2 className="text-2xl font-bold text-white leading-snug">
              {preview.title}
            </h2>
          </div>

          {/* Description */}
          <p className="text-white/70 text-sm leading-relaxed">
            {preview.description}
          </p>

          {/* Expandable details */}
          <div
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
              showDetails ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="space-y-4 pt-1">
              {/* Grammar points */}
              <div>
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
                  Grammar focus
                </p>
                <div className="flex flex-col gap-2">
                  {preview.grammar.map((point, i) => (
                    <div key={point} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold flex items-center justify-center border border-blue-500/30">
                        {i + 1}
                      </span>
                      <p className="text-white/75 text-sm leading-snug">{point}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tip */}
              <div className="flex gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                <span className="text-xl flex-shrink-0">💡</span>
                <p className="text-white/65 text-sm leading-relaxed">
                  <span className="text-white font-semibold">Tip: </span>
                  {preview.tip}
                </p>
              </div>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={() => setShowDetails((prev) => !prev)}
            className="w-full py-2 text-xs font-medium text-white/35 hover:text-white/60 transition-colors flex items-center justify-center gap-1.5"
          >
            <span
              className={`inline-block transition-transform duration-300 ${showDetails ? "rotate-180" : "rotate-0"}`}
            >
              ▼
            </span>
            {showDetails ? "Hide details" : "Grammar & tips"}
          </button>

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/15 text-white/55 hover:text-white hover:border-white/30 transition-all text-sm font-medium"
            >
              Back
            </button>
            <button
              onClick={onStart}
              className={`flex-1 py-3 rounded-xl bg-gradient-to-r ${theme.progressGradient} text-white font-semibold text-sm shadow-lg hover:opacity-90 active:scale-[0.98] transition-all`}
            >
              Start Listening →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};