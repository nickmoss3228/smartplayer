"""Checks that lengthen() keeps the timing contract the player depends on.

Run with the worker's own Python: python -m unittest test_server.py
"""

import io
import unittest

import lameenc
import numpy as np
import soundfile as sf

from server import lengthen

RATE = 44100


def voice_like_mp3(seconds: float) -> bytes:
    """A pitched buzz with a few gaps: enough for PSOLA to find a voice in."""
    t = np.arange(int(seconds * RATE)) / RATE
    tone = sum(np.sin(2 * np.pi * 140 * k * t) / k for k in range(1, 8)) * 0.2
    gate = (np.sin(2 * np.pi * 0.7 * t) > -0.3).astype(float)
    pcm = (tone * gate * 32767).astype(np.int16)
    enc = lameenc.Encoder()
    enc.set_bit_rate(128)
    enc.set_in_sample_rate(RATE)
    enc.set_channels(1)
    enc.set_quality(2)
    return enc.encode(pcm.tobytes()) + enc.flush()


class LengthenTest(unittest.TestCase):
    def setUp(self) -> None:
        self.source = voice_like_mp3(6.0)
        self.source_seconds = sf.info(io.BytesIO(self.source)).duration

    def check(self, speed: float) -> None:
        out = lengthen(self.source, speed)
        info = sf.info(io.BytesIO(out))
        self.assertEqual(info.channels, 1)
        self.assertEqual(info.samplerate, RATE)
        # MP3 framing adds up to a frame or two at each end.
        self.assertAlmostEqual(info.duration, self.source_seconds / speed, delta=0.06)

    def test_0_8(self) -> None:
        self.check(0.8)

    def test_0_65(self) -> None:
        self.check(0.65)

    def test_long_part_is_cut_into_pieces_without_drifting(self) -> None:
        source = voice_like_mp3(75.0)
        seconds = sf.info(io.BytesIO(source)).duration
        out = sf.info(io.BytesIO(lengthen(source, 0.65)))
        self.assertAlmostEqual(out.duration, seconds / 0.65, delta=0.06)

    def test_rejects_non_audio(self) -> None:
        with self.assertRaises(Exception):
            lengthen(b"not an mp3 at all", 0.8)


if __name__ == "__main__":
    unittest.main()
