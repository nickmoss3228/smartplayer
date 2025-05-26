import React, { useState } from 'react';
import { useNavigate } from 'react-router';

const Hard = () => {
  const navigate = useNavigate();
  const [hoveredLevel, setHoveredLevel] = useState(null);

  const handleLevelClick = () => {
    navigate(`/player`);
  };

  // Adjusted positions for each level number to be centered vertically
  const levelPositions = {
    1: { top: '17%', left: '13.5%' },      // Top of outer rectangle
    2: { top: '60%', left: '12%' },       // Left side of outer rectangle
    3: { top: '89%', left: '30%' },       // Bottom-left of outer rectangle
    4: { top: '89%', left: '80%' },       // Bottom-right of outer rectangle
    5: { top: '50%', left: '91.8%' },     // Right side of outer rectangle
    6: { top: '18%', left: '55%' },       // Top-right of outer rectangle
    7: { top: '30%', left: '27%' },       // Top of middle rectangle
    8: { top: '72%', left: '55%' },       // Bottom of middle rectangle
    9: { top: '50%', left: '65%' },       // Right of middle rectangle
    10: { top: '50%', left: '50.4%' }     // Center (innermost rectangle)
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-900 p-4 text-[chalk]">
      {/* Blackboard */}
      <div className="relative w-[800px] h-[600px] bg-green-900 border-8 border-amber-900/80 rounded-sm shadow-xl overflow-hidden">
        {/* Chalk dust effect */}
        <div className="absolute inset-0 bg-white opacity-[0.02]"></div>

        {/* SVG Path - adjusted to be centered vertically */}
        <svg className="absolute inset-0 w-full h-full text-[chalk]" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M80,100 L80,500 L720,500 L720,100 L200,100 M200,100 L200,450 L600,450 L600,150 L300,150 M300,150 L300,400 L500,400 L500,200 L400,200 L400,300"
            fill="none"
            stroke="rgba(255, 255, 255, 0.7)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Random chalk smudges */}
        <div className="absolute top-[35%] right-[15%] w-8 h-1 bg-white opacity-20 rotate-12"></div>
        <div className="absolute bottom-[25%] left-[35%] w-4 h-1 bg-white opacity-15 -rotate-6"></div>
        <div className="absolute top-[65%] right-[35%] w-6 h-1 bg-white opacity-20 rotate-45"></div>

        {/* Level Numbers with Hover Effects */}
        {Object.entries(levelPositions).map(([level, position]) => (
          <div 
            key={level}
            className="absolute group"
            style={{
              top: position.top,
              left: position.left,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {/* Hover circle effect */}
            <div className="absolute w-16 h-16 rounded-full bg-yellow-300/0 group-hover:bg-yellow-300/20 
                          transition-all duration-300 -translate-x-1/2 -translate-y-1/2"></div>
            
            {/* Circle border */}
            <div className="absolute w-14 h-14 rounded-full border-2 border-white/40 
                          group-hover:border-yellow-400/70 transition-all duration-300
                          -translate-x-1/2 -translate-y-1/2"></div>
            
            {/* Level number */}
            <button
              onClick={() => handleLevelClick(level)}
              className="relative font-Chalk text-4xl cursor-pointer z-10 
                        text-white/90 group-hover:text-red-600 group-hover:scale-125
                        transition-all duration-300 group-hover:drop-shadow-[0_0_15px_rgba(253,224,71,0.8)]"
            >
              {level}
            </button>
          </div>
        ))}

        {/* "Final" text in bottom right */}
        <div className="absolute bottom-4 right-6 font-Chalk text-2xl text-white/80 italic">
          Final
        </div>
      </div>
    </div>
  );
};

export default Hard;