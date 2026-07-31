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
  /** Keys (lowercased audioKey ?? word) the student has already answered correctly */
  learnedWords?: Set<string>;
}


export const VocabularyRow: React.FC<VocabularyRowProps> = ({ words, onPlay, volume, learnedWords }) => {
  return (
    <div>
      <div
        className="flex pt-2 gap-2 overflow-x-auto snap-x snap-mandatory pb-1 -mx-4 px-4 scroll-px-4
                   [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {words.map(({ word, audioKey }) => {
          const key = (audioKey ?? word).toLowerCase();
          return (
            <div key={word} className="snap-start shrink-0">
              <VocabChip
                word={word}
                audioKey={audioKey}
                onPlay={onPlay}
                volume={volume}
                isLearned={learnedWords?.has(key)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};