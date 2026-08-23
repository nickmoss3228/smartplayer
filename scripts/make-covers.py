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

# (output slug, comic folder under public/assets, 1-based page, greyscale?)
#
# The character stories' comics are drawn in greyscale, so converting costs
# them nothing and keeps the cards a consistent set. The News & Interesting
# Things artwork is colour and stays colour — that section is meant to read as
# different from the story shelves, and draining it would throw that away.
JOBS = [
    ("leo", "leo", 1, True),
    # Was cropped from leo page 9 while this story had no artwork of its own.
    ("leo-additional", "leo-additional", 1, True),
    ("maya", "maya", 1, True),
    ("daniel", "daniel", 1, True),
    ("news-roland-garros", "news-roland-garros", 1, False),
    ("news-grazing-board", "news-grazing-board", 1, False),
]

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

    for slug, character, page, greyscale in JOBS:
        pages = comic_pages(character)
        if len(pages) < page:
            print(f"skip {slug}: {character} has no page {page}")
            continue

        source = pages[page - 1]
        art = Image.open(source).convert("L" if greyscale else "RGB")

        # The crop is derived from the page rather than hardcoded, because the
        # news artwork is square (1024x1024, 1254x1254) while the character
        # stories' pages are 1024x1536. A fixed (0, 0, 512, 640) box reads as
        # "top-left quarter" on a tall page but creeps toward the middle of a
        # square one. Half the width, at 4:5, reproduces the original box
        # exactly for any 1024-wide page and stays framed on the rest.
        crop_w = art.width // 2
        crop_h = min(round(crop_w * 5 / 4), art.height)
        cover = art.crop((0, 0, crop_w, crop_h)).resize(SIZE, Image.LANCZOS)

        out_path = os.path.join(OUT_DIR, f"{slug}.jpg")
        cover.save(out_path, "JPEG", quality=QUALITY, optimize=True, progressive=True)

        kb = os.path.getsize(out_path) // 1024
        tone = "greyscale" if greyscale else "colour"
        print(f"{slug:20} <- {os.path.basename(source):40} {kb:3} KB  {tone}")


if __name__ == "__main__":
    main()
