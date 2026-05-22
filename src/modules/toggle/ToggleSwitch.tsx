import React from "react";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  label?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, label }) => {
  return (
    <div className="flex flex-row items-center gap-1 select-none cursor-pointer" onClick={onChange}>
      <div
        className={`relative w-[36px] h-[20px] rounded-full transition-colors duration-300 ease-in-out
          ${checked ? "bg-[#05df3bff]" : "bg-white/30"}`}
      >
        <span
          className={`absolute top-[2px] left-[2px] w-[15px] h-[15px] bg-white rounded-full shadow-md
            transition-transform duration-300 ease-in-out
            ${checked ? "translate-x-[18px]" : "translate-x-0"}`}
        />
      </div>
      
      {label && (
        <span className="text-black/50 text-[8px] uppercase tracking-widest font-semibold font-['Montserrat'] whitespace-nowrap">
          {label}
        </span>
      )}
    </div>
  );
};