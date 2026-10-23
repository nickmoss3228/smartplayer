# audio-worker

A small HTTP service that makes the slowed copies of story audio the player
uses at 0.65× and 0.8×. The backend calls it after a part's audio is uploaded
(`backend/src/services/slowCopies.js`) and stores the copies next to the
original. Without it, the player falls back to the browser's own stretching,
which sounds echoey at slow speeds.

## What it does

`POST /lengthen?speed=0.8` with an MP3 as the request body returns that MP3
slowed to 0.8×. The voice keeps its own pitch. The copy is exactly
`duration / speed` long, because the player maps a time in the copy back to the
original by multiplying by the speed.

It uses Praat's "Lengthen (overlap-add)" (PSOLA), pitch range 75–600 Hz, and
writes 128 kbps mono MP3. A blind listening test on 2026-10-04 chose this over
the browser's stretcher, SoundTouch, Signalsmith and Rubber Band at every
speed. Praat adds a little randomness on unvoiced sounds, so two runs on the
same file are not byte-identical. They sound the same.

`GET /health` answers `{"ok": true}`.

## Licence

Praat, through `praat-parselmouth`, is **GPLv3**. That is why this is a
separate service. It runs only on our own server and its code is never sent to
a browser, so the GPL places no obligations on the app. If this service is
ever given to someone else to run, its source has to go with it.

## Running it

In Docker (production and staging share one instance; it keeps no state):

```sh
docker compose up -d audio-worker
```

Locally, from a virtualenv. On this machine, keep it on D:, because C: is full:

```sh
python -m venv D:/venvs/audio-worker
D:/venvs/audio-worker/Scripts/pip install -r requirements.txt
D:/venvs/audio-worker/Scripts/python server.py   # listens on 127.0.0.1:8000
```

Then set `AUDIO_WORKER_URL=http://127.0.0.1:8000` in `backend/.env`.

`HOST` and `PORT` change where it listens. The Docker image sets `HOST=0.0.0.0`.
The service has no authentication, so never publish its port. Compose only
`expose`s it on the internal network.

## Tests

```sh
python -m unittest test_server.py
```
