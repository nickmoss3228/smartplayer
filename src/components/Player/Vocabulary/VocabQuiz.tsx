import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type VocabType = "vocab" | "phrasal";

interface VocabWord {
  word: string;
  audioKey?: string;
  type?: VocabType;
}

interface VocabQuizProps {
  words: VocabWord[];
  onPlay: (audioKey: string, type?: VocabType) => HTMLAudioElement | null;
  onClose: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const VocabQuiz: React.FC<VocabQuizProps> = ({
  words,
  onPlay,
  onClose,
}) => {
  const [order, setOrder] = useState<VocabWord[]>(() => shuffle(words));
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const current = order[roundIndex];
  const finished = roundIndex >= order.length;

  const playCurrent = useCallback(() => {
    if (!current) return;
    const key = (current.audioKey ?? current.word).toLowerCase();
    const audio = onPlay(key, current.type);
    if (audio) audioRef.current = audio;
  }, [current, onPlay]);

  // auto-play the word whenever a new round starts
  useEffect(() => {
    if (!finished) playCurrent();
  }, [roundIndex, finished, playCurrent]);

  const handleChoice = useCallback(
    (choice: VocabWord) => {
      if (status !== "idle" || !current) return;

      const isCorrect = choice.word === current.word;
      setSelected(choice.word);
      setStatus(isCorrect ? "correct" : "wrong");

      if (isCorrect) setScore((s) => s + 1);

      setTimeout(() => {
        setSelected(null);
        setStatus("idle");
        setRoundIndex((i) => i + 1);
      }, 900);
    },
    [status, current],
  );

  const handleRestart = useCallback(() => {
    setOrder(shuffle(words));
    setRoundIndex(0);
    setScore(0);
    setSelected(null);
    setStatus("idle");
  }, [words]);

  // Grid sizing: shrink cell size and font when there are many words,
  // so everything fits on screen without scrolling.
  const gridStyle = useMemo(() => {
    const count = words.length;
    const cols = count <= 4 ? 2 : count <= 12 ? 3 : count <= 12 ? 3 : 4;
    const fontSize = count <= 8 ? "0.9rem" : count <= 16 ? "0.8rem" : "0.68rem";
    return {
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      fontSize,
    } as React.CSSProperties;
  }, [words.length]);

  if (words.length < 4) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
        <p className="text-black/70">
          Недостаточно слов для этой игры (нужно минимум 4).
        </p>
        <button
          onClick={onClose}
          className="px-5 py-2 rounded-full bg-white/90 text-black shadow-sm hover:bg-white transition-colors"
        >
          Назад
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 px-4 pb-4">
      <div className="shrink-0 flex items-center justify-center py-2">
        {/* <button
          onClick={onClose}
          className="text-black/60 hover:text-black text-sm transition-colors"
        >
          ← Назад
        </button> */}
        <span className="text-black/70 text-sm font-semibold">
          Счёт: {score} / {order.length}
        </span>
      </div>

      {finished ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-lg font-bold text-black">
            Готово! Результат: {score} из {order.length}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleRestart}
              className="px-5 py-2 rounded-full bg-green/90 text-white font-semibold hover:bg-green transition-colors"
            >
              Играть снова
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-full bg-white/90 text-black shadow-sm hover:bg-white transition-colors"
            >
              Назад
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="shrink-0 flex flex-col items-center gap-2 py-3">
            <p className="text-black/60 text-xs uppercase tracking-widest font-semibold">
              Нажми на слово, которое ты услышал
            </p>
            <button
              onClick={playCurrent}
              aria-label="Повторить произношение"
              className="w-14 h-14 rounded-full bg-green/90 hover:bg-green text-white flex items-center justify-center shadow-md active:scale-95 transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-6 h-6"
              >
                <path d="M9.25 3.375a.75.75 0 0 0-1.28-.53L4.72 6H2.5A1.5 1.5 0 0 0 1 7.5v5A1.5 1.5 0 0 0 2.5 14h2.22l3.25 3.155a.75.75 0 0 0 1.28-.53V3.375ZM13.36 5.43a.75.75 0 0 1 1.06.02 7.5 7.5 0 0 1 0 9.1.75.75 0 1 1-1.13-.99 6 6 0 0 0 0-7.07.75.75 0 0 1 .07-1.06ZM11.3 7.92a.75.75 0 0 1 1.04.17 4.5 4.5 0 0 1 0 3.82.75.75 0 0 1-1.22-.87 3 3 0 0 0 0-2.08.75.75 0 0 1 .18-1.04Z" />
              </svg>
            </button>

            <div className="h-6 flex items-center justify-center">
              {status === "correct" && (
                <p className="text-green font-bold text-sm animate-bounce">
                  Молодец! 🎉
                </p>
              )}
              {status === "wrong" && (
                <p className="text-red-500 font-bold text-sm">
                  Попробуй ещё раз!
                </p>
              )}
            </div>
          </div>

          <div
            className="flex-1 min-h-0 grid gap-2 content-center"
            style={gridStyle}
          >
            {words.map((w) => {
              const isThisCorrectWord = w.word === current.word;
              const isThisSelected = selected === w.word;

              let stateClasses = "bg-white/70 hover:bg-white text-black";

              if (status !== "idle") {
                if (isThisCorrectWord) {
                  // always highlight the correct word once an answer is given,
                  // whether the player picked it or not
                  stateClasses = "bg-green/95 text-white ring-2 ring-white/60";
                } else if (isThisSelected && status === "wrong") {
                  stateClasses = "bg-red-500 text-white ring-2 ring-white/60";
                }
              }
              return (
                <button
                  key={w.word}
                  onClick={() => handleChoice(w)}
                  disabled={status !== "idle"}
                  className={`rounded-xl px-2 py-3 min-h-[3.5rem] font-semibold font-['Montserrat'] leading-snug text-center break-words whitespace-normal transition-colors duration-150 disabled:cursor-default ${stateClasses}`}
                >
                  {w.word}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

VocabQuiz.displayName = "VocabQuiz";
