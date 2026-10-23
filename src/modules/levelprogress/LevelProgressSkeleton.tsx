// components/LevelProgressSkeleton.tsx
import React from "react";

/** The same one-screen frame as LevelProgress, so nothing jumps when it loads. */
export const LevelProgressSkeleton: React.FC = () => {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-room pt-13 animate-pulse">
      <div className="mx-auto flex w-full max-w-6xl flex-1 min-h-0 flex-col gap-3 px-4 pt-3 pb-4 md:gap-5 md:px-8 md:pt-7 md:pb-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gray-200" />
          <div className="flex-1">
            <div className="mb-2 h-3 w-20 rounded-chip bg-gray-200" />
            <div className="h-7 w-56 rounded-chip bg-gray-200" />
          </div>
          <div className="h-9 w-24 rounded-full bg-gray-200" />
        </div>

        {/* Segments */}
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-32 rounded-chip bg-gray-200" />
          <div className="h-1.5 w-full rounded-full bg-gray-200" />
        </div>

        {/* Grid — the common 10-part shape */}
        <div className="grid flex-1 min-h-0 grid-cols-2 grid-rows-5 gap-2 md:grid-cols-5 md:grid-rows-2 md:gap-5">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className="rounded-card bg-gray-100"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
