"""malako audio worker: makes PSOLA-slowed copies of story audio.

POST /lengthen?speed=0.8 with an MP3 as the body answers with that MP3 slowed
to 0.8x (so 1/0.8 times as long), the voice kept at its own pitch. The backend
calls it once per speed after a part's audio is uploaded, and stores the
results next to the original (backend/src/services/slowCopies.js).

The settings are the ones a blind listening test picked on 2026-10-04 against
the browser's own stretcher, SoundTouch, Signalsmith and Rubber Band: Praat's
"Lengthen (overlap-add)" with a 75-600 Hz pitch range, written as 128 kbps
mono MP3.

Praat (through praat-parselmouth) is GPLv3. It runs only inside this service
on our own server and is never sent to a browser. See README.md.
"""

import io
import json
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import lameenc
import numpy as np
import parselmouth
import soundfile as sf
from parselmouth.praat import call

MAX_BODY_BYTES = 40 * 1024 * 1024
MIN_SPEED, MAX_SPEED = 0.5, 0.95
# Hz. Wide enough for men, women and children; PSOLA needs the voice's pitch.
PITCH_FLOOR, PITCH_CEILING = 75, 600
BITRATE_KBPS = 128

# Praat works on a whole Sound at once: a 162 s part at 0.65x peaked at 485 MB.
# Cutting the audio into ~30 s pieces at the quietest moment near each boundary
# keeps that under ~200 MB, and a cut in a pause is inaudible.
CHUNK_SECONDS = 30.0
CUT_SEARCH_SECONDS = 3.0
CUT_FRAME_SECONDS = 0.02

# One job at a time keeps memory bounded on a small VM.
JOB = threading.Lock()


def fit(samples: np.ndarray, length: int) -> np.ndarray:
    """Trim or zero-pad to exactly `length` samples."""
    if len(samples) >= length:
        return samples[:length]
    return np.concatenate([samples, np.zeros(length - len(samples))])


def cut_points(audio: np.ndarray, rate: int) -> list[int]:
    """Sample offsets that split the audio into ~CHUNK_SECONDS pieces, each in a pause."""
    frame = max(1, int(CUT_FRAME_SECONDS * rate))
    search = int(CUT_SEARCH_SECONDS * rate)
    cuts = []
    target = int(CHUNK_SECONDS * rate)
    while target < len(audio) - search:
        lo, hi = target - search, target + search
        window = audio[lo:hi]
        frames = len(window) // frame
        energy = (window[: frames * frame].reshape(frames, frame) ** 2).mean(axis=1)
        cut = lo + int(np.argmin(energy)) * frame
        cuts.append(cut)
        target = cut + int(CHUNK_SECONDS * rate)
    return cuts


def lengthen(mp3: bytes, speed: float) -> bytes:
    """The MP3 slowed to `speed`, as a 128 kbps mono MP3 at the source's sample rate."""
    audio, rate = sf.read(io.BytesIO(mp3), dtype="float32")
    if audio.ndim > 1:
        # Every story track so far is mono, one of them stored as two identical channels.
        audio = audio.mean(axis=1)
    if len(audio) == 0:
        raise ValueError("the file has no audio in it")

    # Each piece comes out exactly len / speed samples long, so a time in the
    # copy is always the original time divided by the speed. The player's
    # markers depend on that.
    bounds = [0, *cut_points(audio, rate), len(audio)]
    # Kept as 32-bit pieces and encoded one at a time: whole-track 64-bit
    # copies for scaling and clipping had doubled the peak memory.
    pieces = []
    done = 0
    peak = 0.0
    for start, end in zip(bounds, bounds[1:]):
        sound = parselmouth.Sound(audio[start:end].astype(np.float64), rate)
        slowed = call(sound, "Lengthen (overlap-add)", PITCH_FLOOR, PITCH_CEILING, 1.0 / speed)
        # Rounded against the running total, so rounding never accumulates.
        length = int(round(end / speed)) - done
        piece = fit(slowed.values[0], length).astype(np.float32)
        peak = max(peak, float(np.max(np.abs(piece))))
        pieces.append(piece)
        done += length
    del audio

    gain = 0.99 / peak if peak > 0.99 else 1.0
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(BITRATE_KBPS)
    encoder.set_in_sample_rate(int(rate))
    encoder.set_channels(1)
    encoder.set_quality(2)
    encoded = []
    for piece in pieces:
        pcm = (np.clip(piece * gain, -1.0, 1.0) * 32767).astype(np.int16)
        encoded.append(encoder.encode(pcm.tobytes()))
    encoded.append(encoder.flush())
    return b"".join(encoded)


class Handler(BaseHTTPRequestHandler):
    server_version = "malako-audio-worker"

    def _send(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _json(self, status: int, payload: dict) -> None:
        self._send(status, json.dumps(payload).encode("utf-8"), "application/json")

    def do_GET(self) -> None:
        if urlparse(self.path).path == "/health":
            self._json(200, {"ok": True})
        else:
            self._json(404, {"error": "Not found."})

    def do_POST(self) -> None:
        url = urlparse(self.path)
        if url.path != "/lengthen":
            self._json(404, {"error": "Not found."})
            return
        try:
            speed = float(parse_qs(url.query).get("speed", [""])[0])
        except ValueError:
            speed = float("nan")
        if not MIN_SPEED <= speed <= MAX_SPEED:
            self._json(400, {"error": f"speed must be a number from {MIN_SPEED} to {MAX_SPEED}."})
            return

        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            self._json(400, {"error": "Send the MP3 as the request body."})
            return
        if length > MAX_BODY_BYTES:
            self._json(413, {"error": f"The file is over {MAX_BODY_BYTES // (1024 * 1024)} MB."})
            return
        body = self.rfile.read(length)

        started = time.monotonic()
        try:
            with JOB:
                out = lengthen(body, speed)
        except Exception as err:  # a file soundfile or Praat cannot read
            self._json(422, {"error": f"Could not slow this audio down: {err}"})
            return
        self.log_message("lengthen %.2fx: %d bytes in, %d out, %.1fs", speed, length, len(out), time.monotonic() - started)
        self._send(200, out, "audio/mpeg")

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write(f"[audio-worker] {fmt % args}\n")


def main() -> None:
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"[audio-worker] listening on {host}:{port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
