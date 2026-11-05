"""Builds the release zip with forward-slash paths.

PowerShell's Compress-Archive writes backslash separators, which addons.mozilla.org
rejects with "Invalid file name in archive", so the zip is assembled here instead.

Usage:
    python scripts/build.py            # reads version from manifest.json
    python scripts/build.py 3.1        # overrides the version in the filename
"""
import json
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "extension")
DIST = os.path.join(ROOT, "dist")

FILES = [
    "manifest.json",
    "content.js",
    "popup.html",
    "popup.css",
    "popup.js",
    "icons/icon-16.png",
    "icons/icon-32.png",
    "icons/icon-48.png",
    "icons/icon-128.png",
]


def main():
    with open(os.path.join(SRC, "manifest.json"), encoding="utf-8") as fh:
        manifest = json.load(fh)

    version = sys.argv[1] if len(sys.argv) > 1 else manifest["version"]
    os.makedirs(DIST, exist_ok=True)
    out = os.path.join(DIST, f"twitter-x-link-cleaner-v{version}.zip")

    if os.path.exists(out):
        os.remove(out)

    missing = []
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for rel in FILES:
            path = os.path.join(SRC, rel.replace("/", os.sep))
            if not os.path.isfile(path):
                missing.append(rel)
                continue
            info = zipfile.ZipInfo(rel)
            info.date_time = (2026, 11, 5, 0, 0, 0)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            with open(path, "rb") as fh:
                z.writestr(info, fh.read())

    if missing:
        sys.exit("missing files: " + ", ".join(missing))

    with zipfile.ZipFile(out) as z:
        if z.testzip() is not None:
            sys.exit("archive is corrupt")
        for info in z.infolist():
            if "\\" in info.filename:
                sys.exit("backslash in path: " + info.filename)
            print(f"{info.filename:<24} {info.file_size:>7}")

    print(f"\nname    : {manifest['name']}")
    print(f"version : {manifest['version']}")
    print(f"zip     : {out} ({os.path.getsize(out)} bytes)")


if __name__ == "__main__":
    main()
