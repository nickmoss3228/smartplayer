import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  IoPhonePortraitOutline,
  IoWarningOutline,
  IoSyncOutline,
} from "react-icons/io5";
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
    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl animate-fade-in">
      <div className="flex items-start gap-2 text-amber-800">
        <IoWarningOutline size={18} className="flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold">{t("login.deviceLimit.title")}</p>
          <p className="text-sm text-amber-700 mt-1">
            {t("login.deviceLimit.description")}
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {limit.devices.map((device) => (
          <li
            key={device.deviceId}
            className="flex items-center justify-between gap-3 p-2.5 bg-white/70 border border-amber-200 rounded-xl"
          >
            <div className="flex items-center gap-2 min-w-0">
              <IoPhonePortraitOutline
                size={16}
                className="flex-shrink-0 text-amber-600"
              />
              <div className="min-w-0">
                <p className="text-sm text-black/80 truncate">{device.label}</p>
                <p className="text-xs text-black/40">
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
              className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      <button
        type="button"
        onClick={onCancel}
        className="mt-3 text-xs text-amber-700 hover:text-amber-900 underline"
      >
        {t("login.deviceLimit.cancel")}
      </button>
    </div>
  );
};

export default DeviceLimitPanel;
