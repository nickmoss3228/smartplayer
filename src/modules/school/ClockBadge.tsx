// modules/school/ClockBadge.tsx
//
// The time of day, on screen: a small clock face, the time, and what the school
// is doing at that hour — lessons, after school, night. School time runs fast
// (schoolClock.ts), so the minute hand visibly moves; the face is there because
// "14:20" means nothing at a glance to a young player and a clock face does.

import { useTranslation } from "react-i18next";
import { IoMoonOutline, IoPartlySunnyOutline, IoSunnyOutline } from "react-icons/io5";
import { SchoolTime, formatSchoolTime, useSchoolClock } from "./schoolClock";

const Face = ({ time, dark }: { time: SchoolTime; dark: boolean }) => {
  const minute = (time.hours % 1) * 360;
  const hour = ((time.hours % 12) / 12) * 360;
  const ink = dark ? "#f4e6b8" : "#1f2430";
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="shrink-0">
      <circle cx="11" cy="11" r="10" fill={dark ? "#2f3750" : "#ffffff"} stroke={ink} strokeWidth="1.5" />
      {[0, 90, 180, 270].map((a) => (
        <line key={a} x1="11" y1="2.6" x2="11" y2="4.2" stroke={ink} strokeWidth="1.2" transform={`rotate(${a} 11 11)`} />
      ))}
      <line x1="11" y1="11" x2="11" y2="6" stroke={ink} strokeWidth="2" strokeLinecap="round" transform={`rotate(${hour} 11 11)`} />
      <line x1="11" y1="11" x2="11" y2="3.8" stroke={ink} strokeWidth="1.2" strokeLinecap="round" transform={`rotate(${minute} 11 11)`} />
    </svg>
  );
};

/** Ticks on its own, once a second, so the page around it does not have to
 *  re-render — and with it the whole scene — every time a minute goes by. */
export const ClockBadge = () => {
  const { t } = useTranslation();
  const time = useSchoolClock();
  const dark = time.part === "night" || time.part === "evening";
  const Icon = time.part === "night" ? IoMoonOutline : time.part === "lessons" ? IoSunnyOutline : IoPartlySunnyOutline;
  const partLabel = t(`school.clock.parts.${time.part}`);
  return (
    <div
      role="timer"
      aria-label={t("school.clock.label", { time: formatSchoolTime(time), part: partLabel })}
      title={t("school.clock.hint")}
      className={`inline-flex items-center gap-2 rounded-full py-1 pl-1.5 pr-3 shadow-sm transition-colors duration-700 ${
        dark ? "bg-[#2f3750]/90 text-[#f4e6b8]" : "bg-white/90 text-black/80"
      }`}
    >
      <Face time={time} dark={dark} />
      <span className="text-[13px] font-bold tabular-nums leading-none">{formatSchoolTime(time)}</span>
      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold leading-none ${dark ? "text-[#f4e6b8]/75" : "text-black/45"}`}>
        <Icon size={12} />
        {partLabel}
      </span>
    </div>
  );
};
