import React, { useState } from 'react';
import { useNavigate } from 'react-router';

const Easy = () => {
  const navigate = useNavigate();
  // const [hoveredLevel, setHoveredLevel] = useState(null);
  
  // const handleLevelClick = (levelNumber) => {
  //   navigate(`/levels/easy/${levelNumber}`);
  // };

  const handleLevelClick = () => {
    navigate(`/player`);
  };
  
  // Positions for each level number
  const levelPositions = {
    1: { top: '12%', left: '29%' },
    2: { top: '25%', left: '12%' },
    3: { top: '45%', left: '24%' },
    4: { top: '45%', left: '60%' },
    5: { top: '52.5%', left: '83%' },
    6: { top: '60%', left: '40%' },
    7: { top: '70%', left: '17%' },
    8: { top: '85%', left: '30%' },
    9: { top: '86%', left: '55%' },
    10: { top: '96%', left: '65.5%' }
  };
  
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-900 p-4 text-[chalk]">
      {/* Blackboard */}
      <div className="relative w-[800px] h-[600px] bg-green-900 border-8 border-amber-900/80 rounded-sm shadow-xl overflow-hidden">
        {/* Chalk dust effect */}
        <div className="absolute inset-0 bg-white opacity-[0.02]"></div>
        
        {/* SVG Path */}
        <svg className="absolute inset-0 w-full h-full text-[chalk]" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M200,70 L200,90 L80,90 L80,240 L120,240 L640,240 L640,330 L120,330 L120,480 L520,480 L520,540"
            fill="none"
            stroke="rgba(255, 255, 255, 0.7)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        
        {/* Random chalk smudges */}
        {/* <div className="absolute top-[15%] right-[20%] w-8 h-1 bg-white opacity-20 rotate-12"></div>
        <div className="absolute bottom-[35%] left-[25%] w-4 h-1 bg-white opacity-15 -rotate-6"></div>
        <div className="absolute top-[65%] right-[45%] w-6 h-1 bg-white opacity-20 rotate-45"></div> */}
        
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
              onClick={() => handleLevelClick()}
              className="relative font-Chalk text-4xl cursor-pointer z-10 
                        text-white/90 group-hover:text-red-600 group-hover:scale-125
                        transition-all duration-300 group-hover:drop-shadow-[0_0_15px_rgba(253,224,71,0.8)]"
            >
              {level}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Easy;