import React from "react";
import { VocabChip } from "./VocabChip";
// import { useTranslation } from "react-i18next";

interface VocabWord {
  word: string;
  audioKey?: string;
}

interface VocabularyRowProps {
  words: VocabWord[];
  onPlay: (audioKey: string) => HTMLAudioElement | null; // ← updated
  volume: number;
}


export const VocabularyRow: React.FC<VocabularyRowProps> = ({ words, onPlay, volume }) => {
  // const { t } = useTranslation(); // ← now you have a place for it

  return (
    <div>
      {/* <p className="text-white/50 text-[10px] uppercase tracking-widest font-semibold font-['Montserrat'] mb-2">
        {t('player.vocabulary')}
      </p> */}
      <div
        className="flex pt-2 gap-2 overflow-x-auto snap-x snap-mandatory pb-1 -mx-4 px-4
                   [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {words.map(({ word, audioKey }) => (
          <div key={word} className="snap-start shrink-0">
            <VocabChip word={word} audioKey={audioKey} onPlay={onPlay} volume={volume} />
          </div>
        ))}
      </div>
    </div>
  );
};