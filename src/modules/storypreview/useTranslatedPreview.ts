import { useTranslation } from "react-i18next";
import { storyPreviewData } from "./storyPreviewData";

export function useTranslatedPreview(key: string) {
  const { t } = useTranslation();
  const base = storyPreviewData[key];
  if (!base) return null;
  return {
    ...base,
    title:       t(`stories.${key}.title`),
    difficulty:  t(`stories.${key}.difficulty`),
    duration:    t(`stories.${key}.duration`),
    description: t(`stories.${key}.description`),
    grammar:     t(`stories.${key}.grammar`, { returnObjects: true }) as string[],
    topics:      t(`stories.${key}.topics`,  { returnObjects: true }) as string[],
    tip:         t(`stories.${key}.tip`),
  };
}