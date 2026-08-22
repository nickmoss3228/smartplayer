"""
Generates the 4:5 story covers used by the story cards in src/pages/List.tsx.

The comic pages in public/assets/<character>/comics are 1024x1536 and ~270 KB
each -- far too heavy to load five of them into a grid on a phone. This crops
the top-left region of a story's chosen page (which holds the character on all
thirty pages), drops it to greyscale (the art already is), and writes a ~50 KB
progressive JPEG to public/assets/covers.

Adding a story? Add a line to JOBS, run this, then point the story's `cover`
field in src/types/storyGroups.ts at the file it writes. A story with no cover
falls back to the halftone + emoji card, so this step is optional.

    pip install pillow
    python scripts/make-covers.py

Run from the smartplayer package root.
"""

import glob
import os
import sys

from PIL import Image

# (output slug, character folder, 1-based comic page to crop the cover from)
JOBS = [
    ("leo", "leo", 1),
    ("leo-additional", "leo", 9),
    ("maya", "maya", 1),
    ("daniel", "daniel", 1),
]

# The top-left region of a 1024x1536 page, already 4:5.
CROP = (0, 0, 512, 640)
SIZE = (480, 600)
QUALITY = 75

OUT_DIR = os.path.join("public", "assets", "covers")


def comic_pages(character):
    """Comic pages for a character, ordered by their leading page number."""
    paths = glob.glob(os.path.join("public", "assets", character, "comics", "*.jpg"))
    return sorted(paths, key=lambda p: int(os.path.basename(p).split(".")[0]))


def main():
    if not os.path.isdir("public"):
        sys.exit("Run this from the smartplayer package root (public/ not found).")

    os.makedirs(OUT_DIR, exist_ok=True)

    for slug, character, page in JOBS:
        pages = comic_pages(character)
        if len(pages) < page:
            print(f"skip {slug}: {character} has no page {page}")
            continue

        source = pages[page - 1]
        cover = Image.open(source).convert("L").crop(CROP).resize(SIZE, Image.LANCZOS)

        out_path = os.path.join(OUT_DIR, f"{slug}.jpg")
        cover.save(out_path, "JPEG", quality=QUALITY, optimize=True, progressive=True)

        kb = os.path.getsize(out_path) // 1024
        print(f"{slug:16} <- {os.path.basename(source):45} {kb:3} KB")


if __name__ == "__main__":
    main()
