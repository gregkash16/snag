#!/usr/bin/env bash
# Fetch the macOS binaries Snag bundles -> bin/mac/
#   yt-dlp            universal (arm64 + x86_64) from yt-dlp releases
#   deno-arm64/-x64   from denoland releases
#   ffmpeg-arm64/-x64 static builds from ffmpeg.martin-riedl.de (native on both CPUs, no Rosetta)
# The panel picks the "-arm64" / "-x64" variant for the current CPU (see client/runtime.js).
# Run on a Mac.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
BIN="$ROOT/bin/mac"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$BIN"

fetch() { # url dest
  curl -fL --retry 3 -o "$2" "$1" || { echo "download failed: $1"; exit 1; }
}
unzip_one() { # zip name dest
  unzip -q -o "$1" -d "$TMP/x-$3" && cp "$TMP/x-$3/$2" "$BIN/$3"
}

echo "yt-dlp (universal)..."
fetch "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos" "$BIN/yt-dlp"

echo "deno (arm64)..."
fetch "https://github.com/denoland/deno/releases/latest/download/deno-aarch64-apple-darwin.zip" "$TMP/deno-arm64.zip"
unzip_one "$TMP/deno-arm64.zip" deno deno-arm64
echo "deno (x64)..."
fetch "https://github.com/denoland/deno/releases/latest/download/deno-x86_64-apple-darwin.zip" "$TMP/deno-x64.zip"
unzip_one "$TMP/deno-x64.zip" deno deno-x64

echo "ffmpeg (arm64, martin-riedl.de)..."
fetch "https://ffmpeg.martin-riedl.de/redirect/latest/macos/arm64/release/ffmpeg.zip" "$TMP/ffmpeg-arm64.zip"
unzip_one "$TMP/ffmpeg-arm64.zip" ffmpeg ffmpeg-arm64
echo "ffmpeg (x64, martin-riedl.de)..."
fetch "https://ffmpeg.martin-riedl.de/redirect/latest/macos/amd64/release/ffmpeg.zip" "$TMP/ffmpeg-x64.zip"
unzip_one "$TMP/ffmpeg-x64.zip" ffmpeg ffmpeg-x64

chmod 755 "$BIN"/*
xattr -dr com.apple.quarantine "$BIN" 2>/dev/null || true
ls -lh "$BIN"
"$BIN/yt-dlp" --version
ARCH="$(uname -m | sed 's/x86_64/x64/')"
"$BIN/ffmpeg-$ARCH" -version | head -1
