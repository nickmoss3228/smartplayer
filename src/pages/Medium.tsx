import React, { useState } from 'react';
import { useNavigate } from 'react-router';

const Medium = () => {
  const navigate = useNavigate();
  const [hoveredLevel, setHoveredLevel] = useState(null);
  
  const handleLevelClick = () => {
    navigate(`/player`);
  };
  
  // Positions for each level number - adjusted to follow the winding path shown in the image
  const levelPositions = {
    1: { top: '6%', left: '41%' },
    2: { top: '19%', left: '79%' },
    3: { top: '25%', left: '18%' },
    4: { top: '42%', left: '25%' },
    5: { top: '47%', left: '45%' },
    6: { top: '58%', left: '80%' },
    7: { top: '73%', left: '40%' },
    8: { top: '86%', left: '15%' },
    9: { top: '93%', left: '55%' },
    10: { top: '84%', left: '83.5%' }
  };
  
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-900 p-4 text-[chalk]">
      {/* Blackboard */}
      <div className="relative w-[800px] h-[600px] bg-green-900 border-8 border-amber-900/80 rounded-sm shadow-xl overflow-hidden">
        {/* Chalk dust effect */}
        <div className="absolute inset-0 bg-white opacity-[0.02]"></div>

        {/* ...C620,400 320,560 260,560 last lines of the path*/}

        {/* SVG Path - designed to match the winding path in the image */}
        <svg className="absolute inset-0 w-full h-full text-[chalk]" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M300,40 C900,50 750,160 120,150 C30,150 90,250 350,280 
               C950,200 680,350 400,420 C100,480 0,420 130,520 
               C380,580 550,560 680,480"
            fill="none"
            stroke="rgba(255, 255, 255, 0.7)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        
        {/* Level Numbers */}
        {Object.entries(levelPositions).map(([level, position]) => (
          <button
            key={level}
            onClick={() => handleLevelClick(level)}
            onMouseEnter={() => setHoveredLevel(level)}
            onMouseLeave={() => setHoveredLevel(null)}
            className={`absolute font-Chalk text-Chalk text-4xl cursor-pointer transition-all duration-300 
                      ${hoveredLevel === level 
                        ? 'text-yellow-400 scale-125 drop-shadow-[0_0_15px_rgba(253,224,71,0.8)]' 
                        : 'text-white/90'}`}
            style={{ 
              top: position.top, 
              left: position.left 
            }}
          >
            {level}
          </button>
        ))}
        
        {/* Circle around numbers - to match the image */}
        {Object.entries(levelPositions).map(([level, position]) => (
          <div
            key={`circle-${level}`}
            className={`absolute w-14 h-14 rounded-full border-2 border-white/40 
                     ${hoveredLevel === level ? 'border-yellow-400/70' : ''}`}
            style={{
              top: `calc(${position.top} - 1.5rem)`,
              left: `calc(${position.left} - 1.5rem)`,
              transition: 'all 0.3s ease',
            }}
          >

            
          </div>
          
        ))}
        
        {/* Final text
        <span className="absolute text-white/90 font-chalk text-2xl bottom-[5%] right-[8%]">Final</span> */}
        
        {/* Medium difficulty label */}
        <span className="absolute text-white/70 font-chalk text-3xl bottom-[40%] right-[83%] rotate-[-5deg]">Medium</span>
      </div>
    </div>
  );
};

export default Medium;