import type { ReactNode } from "react";
import { IoCheckmarkCircle } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { fieldLabel, smallButton, smallPrimary } from "./studioStyles";

/**
 * The Story Builder's form vocabulary, in one place, so every settings card
 * reads the same way: a bold label above the field, a one-line hint under it,
 * 44 px inputs, and a save bar that only wakes up when something changed.
 */

/** A card on the Set settings page: a title, one sentence of why, the body. */
export function SettingsSection({ id, title, description, status, children, footer }: {
  id: string;
  title: string;
  description?: ReactNode;
  /** A short state shown beside the title, e.g. "None set" or "3 characters". */
  status?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 rounded-card border border-line bg-white">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h3 id={`${id}-title`} className="text-lg font-bold text-ink">{title}</h3>
          {description && <p className="mt-0.5 max-w-2xl text-sm text-dim">{description}</p>}
        </div>
        {status && <span className="mt-1 shrink-0 text-xs font-semibold text-dim">{status}</span>}
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
      {footer && <footer className="border-t border-line px-5 py-3 sm:px-6">{footer}</footer>}
    </section>
  );
}

/**
 * Save / discard for a card that is edited in place. Quiet while nothing has
 * changed; says "Unsaved changes" and arms the buttons once something has.
 */
export function SaveBar({ dirty, saving, saved, error, onSave, onDiscard, saveLabel }: {
  dirty: boolean;
  saving: boolean;
  saved?: boolean;
  error?: string;
  onSave: () => void;
  onDiscard: () => void;
  saveLabel?: string;
}) {
  const { t } = useTranslation("studio");
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p role="status" className={`text-sm ${error ? "text-red-700" : dirty ? "font-semibold text-amber-800" : "text-dim"}`}>
        {error ? error : dirty ? t("common.unsaved") : saved ? <span className="inline-flex items-center gap-1.5 text-emerald-800"><IoCheckmarkCircle aria-hidden="true" />{t("common.saved")}</span> : t("common.noChanges")}
      </p>
      <div className="flex flex-wrap gap-2">
        {dirty && <button type="button" onClick={onDiscard} disabled={saving} className={smallButton}>{t("common.discard")}</button>}
        <button type="button" onClick={onSave} disabled={!dirty || saving} className={smallPrimary}>{saving ? t("common.saving") : saveLabel ?? t("common.saveChanges")}</button>
      </div>
    </div>
  );
}

/** A row of mutually exclusive choices that all stay visible — easier to read than a select. */
export function Segmented<T extends string>({ label, value, options, onChange, name }: {
  label: string;
  name: string;
  value: T;
  options: readonly { value: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className={fieldLabel}>{label}</legend>
      <div className={`grid gap-2 ${options.length > 2 ? "grid-cols-3" : "sm:grid-cols-2"}`}>
        {options.map((option) => {
          const on = option.value === value;
          return (
            <label key={option.value} className={`flex min-h-11 cursor-pointer items-start gap-2.5 rounded-tile border px-3 py-2.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal ${on ? "border-ink bg-room" : "border-line hover:border-line-strong"}`}>
              <input type="radio" name={name} value={option.value} checked={on} onChange={() => onChange(option.value)} className="sr-only" />
              <span aria-hidden="true" className={`mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${on ? "border-ink" : "border-line-strong"}`}>
                {on && <span className="h-2 w-2 rounded-full bg-ink" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{option.label}</span>
                {option.hint && <span className="mt-0.5 block text-xs text-dim">{option.hint}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
