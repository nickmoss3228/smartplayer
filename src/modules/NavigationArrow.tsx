import React from 'react';
import { DifficultyType } from '../types/LevelProgress';

interface NavigationArrowProps {
  direction: 'left' | 'right';
  difficulty: DifficultyType | null;
  onClick: () => void;
  disabled: boolean;
}

export const NavigationArrow: React.FC<NavigationArrowProps> = ({
  direction,
  difficulty,
  onClick,
  disabled
}) => {
  const arrowPath = direction === 'left' 
    ? "M15 19l-7-7 7-7" 
    : "M9 5l7 7-7 7";

  const label = direction === 'left' ? 'Previous difficulty' : 'Next difficulty';
  const title = difficulty 
    ? `Go to ${difficulty}` 
    : direction === 'left' ? 'No previous difficulties' : 'No next difficulties';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`h-10 w-10 rounded-full flex items-center cursor-pointer justify-center transition-all duration-300
        ${!disabled 
          ? "bg-white/10 hover:bg-white/20 text-white hover:scale-110" 
          : "bg-white/5 text-white/30 cursor-not-allowed"}
      `}
      aria-label={label}
      title={title}
    >
      <svg
        className="h-5 w-5 transition-transform duration-300"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={arrowPath} />
      </svg>
    </button>
  );
};