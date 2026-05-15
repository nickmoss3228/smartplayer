// components/LevelProgressSkeleton.tsx
import React from "react";

export const LevelProgressSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-700 to-gray-900 p-8 animate-pulse">
      <div className="max-w-4xl pt-16 mx-auto">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-12">
          <div className="w-10 h-10 bg-white/20 rounded-full" />
          <div className="text-center flex-1 px-4">
            <div className="h-6 bg-white/20 rounded w-48 mx-auto mb-2" />
            <div className="h-10 bg-white/20 rounded w-64 mx-auto" />
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full" />
        </div>

        {/* Legend skeleton */}
        <div className="flex justify-center gap-4 mb-12">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white/20 rounded" />
              <div className="w-16 h-4 bg-white/20 rounded" />
            </div>
          ))}
        </div>

        {/* Progress bar skeleton */}
        <div className="bg-white/10 rounded-2xl p-6 mb-8">
          <div className="flex justify-between mb-4">
            <div className="h-6 bg-white/20 rounded w-40" />
            <div className="h-6 bg-white/20 rounded w-24" />
          </div>
          <div className="w-full bg-white/20 rounded-full h-3" />
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className="aspect-square rounded-2xl bg-white/10"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};