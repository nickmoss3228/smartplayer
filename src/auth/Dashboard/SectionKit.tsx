// auth/Dashboard/SectionKit.tsx
//
// The pieces the Dashboard is built from: a headed section, a card that holds
// rows, and the row itself (icon tile, what it is, a line saying what it does,
// and where it goes). Every option on the page is one of these rows, so each
// one reads the same way: name first, then the one-line hint.

import React from "react";
import type { IconType } from "react-icons";
import { IoChevronDown, IoChevronForward } from "react-icons/io5";

export const DashboardSection: React.FC<{
  id: string;
  title: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ id, title, hint, className = "", children }) => (
  <section
    id={id}
    aria-labelledby={`${id}-title`}
    className={`scroll-mt-32 min-w-0 flex flex-col gap-3 ${className}`}
  >
    <div className="flex items-baseline justify-between gap-3 px-0.5">
      <h2 id={`${id}-title`} className="m-0 text-xl font-extrabold tracking-tight text-ink">
        {title}
      </h2>
      {hint && <p className="m-0 text-[13px] text-dim text-right">{hint}</p>}
    </div>
    {children}
  </section>
);

/** A white card whose rows are divided by hairlines. */
export const RowCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div
    className={`bg-white rounded-card border border-line overflow-hidden divide-y divide-line ${className}`}
  >
    {children}
  </div>
);

interface ListRowProps {
  icon?: IconType;
  /** The icon tile in ink instead of the room grey */
  iconDark?: boolean;
  title: string;
  hint?: React.ReactNode;
  onClick: () => void;
  /** Set for a row that opens in place; the chevron then points down/up. */
  expanded?: boolean;
  controls?: string;
  /** For dialogs */
  hasPopup?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

export const ListRow: React.FC<ListRowProps> = ({
  icon: Icon,
  iconDark = false,
  title,
  hint,
  onClick,
  expanded,
  controls,
  hasPopup = false,
  danger = false,
  disabled = false,
}) => {
  const disclosure = expanded !== undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={disclosure ? expanded : undefined}
      aria-controls={controls}
      aria-haspopup={hasPopup ? "dialog" : undefined}
      className="w-full min-h-[56px] flex items-center gap-3 px-4 py-2.5 text-left bg-white hover:bg-room/70 active:bg-room transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal"
    >
      {Icon && (
        <span
          className={`w-9 h-9 rounded-tile flex items-center justify-center flex-shrink-0 ${
            iconDark ? "bg-ink text-white" : danger ? "bg-room text-signal-ink" : "bg-room text-ink"
          }`}
        >
          <Icon size={18} aria-hidden="true" />
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className={`block text-[15px] font-bold ${danger ? "text-signal-ink" : "text-ink"}`}>
          {title}
        </span>
        {hint && <span className="block text-[13px] leading-snug text-dim mt-0.5">{hint}</span>}
      </span>
      {!danger &&
        (disclosure ? (
          <IoChevronDown
            size={16}
            aria-hidden="true"
            className={`text-muted flex-shrink-0 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        ) : (
          <IoChevronForward size={16} aria-hidden="true" className="text-muted flex-shrink-0" />
        ))}
    </button>
  );
};
