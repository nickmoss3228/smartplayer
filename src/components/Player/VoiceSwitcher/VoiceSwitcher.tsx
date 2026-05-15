import { useState, useRef, useEffect } from "react";

// ── Fake voice profiles ──────────────────────────────────────────────────────
const VOICES = [
  { id: "man-young",   label: "James",   age: "30s",      src: "https://i.pravatar.cc/150?img=12" },
  { id: "man-old",     label: "Robert",  age: "60s",      src: "https://i.pravatar.cc/150?img=53" },
  { id: "woman-young", label: "Sophie",  age: "20s",      src: "https://i.pravatar.cc/150?img=47" },
  { id: "woman-old",   label: "Margaret",age: "60s",      src: "https://i.pravatar.cc/150?img=45" },
  { id: "boy",         label: "Liam",    age: "Pre-teen", src: "https://i.pravatar.cc/150?img=52" },
  { id: "girl",        label: "Emma",    age: "Pre-teen", src: "https://i.pravatar.cc/150?img=44" },
];

const DEFAULT_VOICE = VOICES[0]; // James is selected by default

// ── Component ────────────────────────────────────────────────────────────────
export default function VoiceSwitcher() {
  const [selected, setSelected]   = useState(DEFAULT_VOICE);
  const [isOpen, setIsOpen]       = useState(false);
  const dropdownRef               = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (voice: typeof DEFAULT_VOICE) => {
    setSelected(voice);
    setIsOpen(false);
  };

  return (
    <div className="relative flex flex-col items-center" ref={dropdownRef}>

   

      {/* ── Big circle avatar (trigger) ── */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative w-[50px] h-[50px] md:w-[70px] md:h-[70px] rounded-full overflow-hidden
                   border-[3px] border-white/30 hover:border-[#05df3bff] transition-all duration-200
                   active:scale-95 focus:outline-none shadow-lg cursor-pointer text-black/60"
        title={`Current voice: ${selected.label}`}
      >
        <img
          src={selected.src}
          alt={selected.label}
          className="w-full h-full object-cover"
        />

        {/* Subtle overlay hint */}
        <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-200 flex items-end justify-center pb-1">
          <span className="text-white text-[9px] font-bold font-['Montserrat'] tracking-wider opacity-0 group-hover:opacity-100 drop-shadow">
            CHANGE
          </span>
        </div>
      </button>

      {/* ── Name below avatar ── */}
      <p className="text-black/80 text-[11px] font-semibold font-['Montserrat'] mt-1.5 select-none">
        {selected.label}
      </p>
      <p className="text-black/40 text-[9px] font-['Montserrat'] select-none -mt-0.5">
        {selected.age}
      </p>
      

      {/* ── Dropdown panel ── */}
      {isOpen && (
        <div
          className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2
                     bg-gray-900/95 backdrop-blur-sm border border-white/10
                     rounded-2xl shadow-2xl p-3 z-50 w-[220px]"
        >
          {/* Arrow pointing down */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900/95" />

          <p className="text-white/40 text-[9px] uppercase tracking-widest font-semibold font-['Montserrat'] mb-2.5 text-center select-none">
            Choose a voice
          </p>

          <div className="grid grid-cols-3 gap-2">
            {VOICES.map((voice) => {
              const isActive = voice.id === selected.id;
              return (
                <button
                  key={voice.id}
                  onClick={() => handleSelect(voice)}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all duration-150 active:scale-95
                    ${isActive
                      ? "bg-[#05df3bff]/20 ring-2 ring-[#05df3bff]"
                      : "hover:bg-white/10"
                    }`}
                >
                  <div className={`w-[52px] h-[52px] rounded-full overflow-hidden border-2 transition-colors duration-150
                    ${isActive ? "border-[#05df3bff]" : "border-white/20"}`}>
                    <img
                      src={voice.src}
                      alt={voice.label}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className={`text-[10px] font-semibold font-['Montserrat'] leading-tight
                    ${isActive ? "text-[#05df3bff]" : "text-white/80"}`}>
                    {voice.label}
                  </span>
                  <span className="text-white/35 text-[8px] font-['Montserrat'] -mt-0.5 leading-tight">
                    {voice.age}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}