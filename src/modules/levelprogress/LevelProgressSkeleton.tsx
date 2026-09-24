// components/LevelProgressSkeleton.tsx
import React from "react";

export const LevelProgressSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-room p-8 animate-pulse">
      <div className="max-w-4xl pt-16 mx-auto">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-12">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <div className="text-center flex-1 px-4">
            <div className="h-6 bg-gray-200 rounded-[3px] w-48 mx-auto mb-2" />
            <div className="h-10 bg-gray-200 rounded-[3px] w-64 mx-auto" />
          </div>
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
        </div>

        {/* Legend skeleton */}
        <div className="flex justify-center gap-4 mb-12">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 rounded-[3px]" />
              <div className="w-16 h-4 bg-gray-200 rounded-[3px]" />
            </div>
          ))}
        </div>

        {/* Progress bar skeleton */}
        <div className="bg-gray-100 rounded-[3px] p-6 mb-8">
          <div className="flex justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded-[3px] w-40" />
            <div className="h-6 bg-gray-200 rounded-[3px] w-24" />
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3" />
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className="aspect-square rounded-[3px] bg-gray-100"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};