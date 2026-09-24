import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IoSyncOutline } from "react-icons/io5";
import { DeviceLimitError } from "../../types/Auth";
import { evictDevice } from "../../services/sessionServices";
import { formatRelativeTime } from "../../utils/relativeTime";

interface DeviceLimitPanelProps {
  limit: DeviceLimitError;
  /** Called once a slot is free, to retry the sign-in that was refused. */
  onFreed: () => void;
  onCancel: () => void;
}

/**
 * Shown when a correct password is refused because the account is already
 * signed in on the maximum number of devices.
 *
 * Blocking rather than silently evicting the oldest device is the deliberate
 * product choice: a user quietly signed out of their own phone has no idea why
 * it happened, whereas this screen tells the account holder plainly that
 * something is using their login elsewhere. That is the deterrent.
 *
 * Drawn as a plain panel rather than a warning-coloured one: the password was
 * correct and nothing has gone wrong, so this is a list to act on, not an
 * alarm. Amber is kept for the "you were signed out elsewhere" notice, which
 * is the case that genuinely deserves a second look.
 */
const DeviceLimitPanel = ({ limit, onFreed, onCancel }: DeviceLimitPanelProps) => {
  const { t, i18n } = useTranslation();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleEvict = async (deviceId: string) => {
    setError("");
    setPendingId(deviceId);
    try {
      await evictDevice(limit.ticket, deviceId);
      onFreed();
    } catch {
      // The overwhelmingly likely cause is the five-minute ticket expiring
      // while this panel sat open, and the fix for every cause is the same:
      // start the sign-in again.
      setError(t("login.deviceLimit.evictFailed"));
      setPendingId(null);
    }
  };

  return (
    <div className="mb-5 bg-white border border-line rounded-[3px] animate-fade-in">
      <div className="px-4 py-3.5 border-b border-line">
        <p className="m-0 font-mono text-[10px] tracking-[0.16em] uppercase text-dim">
          {t("login.deviceLimit.title")}
        </p>
        <p className="m-0 mt-2 text-sm leading-relaxed text-[#47586a]">
          {t("login.deviceLimit.description")}
        </p>
      </div>

      <ul className="m-0 p-0 list-none">
        {limit.devices.map((device) => (
          <li
            key={device.deviceId}
            className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#eef2f6] last:border-b-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <svg
                viewBox="0 0 24 24"
                className="w-[19px] h-[19px] flex-none"
                fill="none"
                stroke="#5b6b7a"
                strokeWidth="1.8"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="7" y="2.5" width="10" height="19" rx="2" />
                <path d="M11 18.6h2" />
              </svg>
              <div className="min-w-0">
                <p className="m-0 text-sm font-semibold text-ink truncate">{device.label}</p>
                <p className="m-0 font-mono text-[11px] text-muted">
                  {t("login.deviceLimit.lastUsed", {
                    when: formatRelativeTime(device.lastSeenAt, i18n.language),
                  })}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleEvict(device.deviceId)}
              disabled={pendingId !== null}
              className="flex-none h-9 px-3.5 flex items-center justify-center bg-transparent border border-line-strong rounded-[3px] text-[13px] text-ink cursor-pointer hover:border-ink disabled:opacity-50 disabled:cursor-not-allowed focus:outline-2 focus:outline-offset-2 focus:outline-signal"
            >
              {pendingId === device.deviceId ? (
                <IoSyncOutline size={14} className="animate-spin" />
              ) : (
                t("login.deviceLimit.signOut")
              )}
            </button>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="m-0 px-4 py-3 border-t border-line text-sm text-signal-ink">
          {error}
        </p>
      )}

      <div className="px-4 py-3 border-t border-line">
        <button
          type="button"
          onClick={onCancel}
          className="text-[13px] text-dim hover:text-ink underline underline-offset-2 cursor-pointer"
        >
          {t("login.deviceLimit.cancel")}
        </button>
      </div>
    </div>
  );
};

export default DeviceLimitPanel;
