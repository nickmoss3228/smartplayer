import { useTranslation } from "react-i18next";

/** Full-screen spinner for auth checks and lazy routes (replaces the bare "Loading..."). */
export default function PageLoader() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-live="polite" className="flex min-h-dvh items-center justify-center">
      <div
        className="h-12 w-12 animate-spin rounded-full border-2 border-black/10 border-b-black/60"
        aria-hidden="true"
      />
      <span className="sr-only">{t("common.loading")}</span>
    </div>
  );
}
