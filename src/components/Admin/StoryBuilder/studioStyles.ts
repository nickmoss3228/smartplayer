/** Class strings shared by the Story Builder forms; the components are in studioUi.tsx. */

export const fieldLabel = "mb-1.5 block text-sm font-semibold text-ink";
export const fieldHint = "mt-1.5 text-xs leading-relaxed text-dim";
/** An input without a width, for boxes that set their own (w-20, w-28…). */
export const inputBase =
  "min-h-11 rounded-[3px] border border-line-strong bg-white px-3 text-[15px] text-ink placeholder:text-muted " +
  "focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-signal disabled:bg-room disabled:text-dim";
export const textInput = `${inputBase} w-full`;
export const textArea = textInput.replace("min-h-11", "min-h-24") + " py-2.5 leading-relaxed";
export const smallButton =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-[3px] border border-line-strong bg-white px-3 py-2 text-sm font-semibold text-ink " +
  "hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:cursor-not-allowed disabled:opacity-45";
export const smallPrimary =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-[3px] bg-ink px-4 py-2 text-sm font-semibold text-white " +
  "hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:cursor-not-allowed disabled:opacity-45";
export const microLabel = "font-mono text-[11px] uppercase tracking-[0.16em] text-dim";

/** English and Russian side by side, each under its own small heading. */
export const LOCALES: { id: "en" | "ru"; label: string }[] = [
  { id: "en", label: "English" },
  { id: "ru", label: "Русский" },
];
