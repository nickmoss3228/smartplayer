"""
Turns generated comic artwork into the pages the player actually serves.

Sources live in assets-src/comics/ and are deliberately NOT under public/:
everything in public/ is copied verbatim into dist/ and shipped in the frontend
image, so leaving the 2-3 MB RGBA PNGs there would send ~16 MB of masters to
every student on a phone. They go out as ~300 KB progressive JPEGs instead,
matching the built-in stories' pages (1024x1536, RGB, ~270 KB).

Output layout mirrors the built-in stories, one folder per story with pages
numbered from 1, which is also what scripts/make-covers.py globs:

    public/assets/<story slug>/comics/1.jpg

Adding a story? Drop the art in assets-src/comics/, add a line to JOBS, run
this, then point that part's `comicUrl` at the file it writes (see
src/modules/audiodata/audioDataNewsPlaceholder.ts for the pattern).

    pip install pillow
    python scripts/make-comics.py

Run from the smartplayer package root.
"""

import os
import sys

from PIL import Image

# (source file in assets-src/comics, output story slug, 1-based page number)
JOBS = [
    ("additional-1.png", "leo-additional", 1),
    ("additional-2.png", "leo-additional", 2),
    ("rolangarros2026.png", "news-roland-garros", 1),
    ("rolangarros2026-discussion.png", "news-roland-garros", 2),
    ("grazingboard.png", "news-grazing-board", 1),
    ("grazingboard-discussion.png", "news-grazing-board", 2),
]

SRC_DIR = os.path.join("assets-src", "comics")
QUALITY = 82


def main():
    if not os.path.isdir("public"):
        sys.exit("Run this from the smartplayer package root (public/ not found).")
    if not os.path.isdir(SRC_DIR):
        sys.exit(f"No {SRC_DIR}/ — put the generated artwork there first.")

    for filename, slug, page in JOBS:
        source = os.path.join(SRC_DIR, filename)
        if not os.path.isfile(source):
            print(f"skip {slug} page {page}: {source} not found")
            continue

        out_dir = os.path.join("public", "assets", slug, "comics")
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, f"{page}.jpg")

        # Flatten onto white rather than convert("RGB") directly: these are
        # RGBA, and a straight convert composites transparent pixels onto black,
        # which turns any soft edge into a dark halo.
        art = Image.open(source)
        if art.mode in ("RGBA", "LA", "P"):
            art = art.convert("RGBA")
            flat = Image.new("RGB", art.size, (255, 255, 255))
            flat.paste(art, mask=art.split()[-1])
            art = flat
        else:
            art = art.convert("RGB")

        art.save(out_path, "JPEG", quality=QUALITY, optimize=True, progressive=True)

        before = os.path.getsize(source) // 1024
        after = os.path.getsize(out_path) // 1024
        print(f"{slug:20} page {page}  {art.size[0]}x{art.size[1]}  {before:5} KB -> {after:4} KB")


if __name__ == "__main__":
    main()
