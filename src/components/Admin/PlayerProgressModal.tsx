import { useEffect, useState } from "react";
import {
  fetchPlayerProgress,
  AdminPlayerProgress,
} from "../../services/adminServices";

interface PlayerProgressModalProps {
  token: string;
  userId: string;
  onClose: () => void;
}

const PlayerProgressModal = ({ token, userId, onClose }: PlayerProgressModalProps) => {
  const [data, setData] = useState<AdminPlayerProgress | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPlayerProgress(token, userId)
      .then(setData)
      .catch((err) => {
        console.error(err);
        setError("Could not load progress.");
      });
  }, [token, userId]);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-black text-lg">
            {data ? `${data.nickname} — Progress` : "Progress"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-black text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {!data && !error && <p className="text-gray-500 text-sm">Loading...</p>}

        {data && (
          <div className="space-y-4 text-sm">
            <div>
              <span className="text-gray-500">{data.email}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <div className="font-bold text-black">{data.wallet.bitAward}</div>
                <div className="text-xs text-gray-500">BitAward</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <div className="font-bold text-black">{data.wallet.bitWord}</div>
                <div className="text-xs text-gray-500">BitWord</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <div className="font-bold text-black">{data.wallet.bitPhrase}</div>
                <div className="text-xs text-gray-500">BitPhrase</div>
              </div>
            </div>

            <div>
              <div className="font-semibold text-black mb-1">Streak</div>
              <div className="text-gray-700">
                Current {data.streak.current} / Longest {data.streak.longest}
              </div>
            </div>

            <div>
              <div className="font-semibold text-black mb-1">
                Listening & Vocab
              </div>
              <div className="text-gray-700">
                {Math.round(data.totalListeningSeconds / 60)} min listened ·{" "}
                {data.learnedWordsCount} words learned
              </div>
            </div>

            <div>
              <div className="font-semibold text-black mb-1">Room</div>
              <div className="text-gray-700">Apartment: {data.apartmentTier}</div>
            </div>

            <div>
              <div className="font-semibold text-black mb-1">Level Progress</div>
              {data.levelProgress.length === 0 && (
                <p className="text-gray-400">No level progress yet.</p>
              )}
              {data.levelProgress.map((p) => (
                <div key={p.difficulty} className="text-gray-700">
                  {p.difficulty}: {p.completedLevels.length} completed, on level{" "}
                  {p.currentLevel}
                </div>
              ))}
            </div>

            <div>
              <div className="font-semibold text-black mb-1">Story Progress</div>
              {data.storyProgress.length === 0 && (
                <p className="text-gray-400">No story progress yet.</p>
              )}
              {data.storyProgress.map((p) => (
                <div key={`${p.difficulty}-${p.storyId}`} className="text-gray-700">
                  {p.storyId} ({p.difficulty}): {p.completedParts.length} parts done,
                  on part {p.currentPart}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerProgressModal;
