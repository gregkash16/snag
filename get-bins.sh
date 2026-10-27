#!/usr/bin/env bash
# Fetch the macOS binaries Snag bundles: yt-dlp, ffmpeg, deno (arm64 + x64)  ->  bin/mac/
# Run on a Mac. ffmpeg comes from evermeet.cx (static, x86_64; runs on Apple Silicon via Rosetta).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
BIN="$ROOT/bin/mac"
TMP="$(mktemp -d)"
mkdir -p "$BIN"

echo "yt-dlp..."
curl -L -o "$BIN/yt-dlp" "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos"

echo "deno (arm64)..."
curl -L -o "$TMP/deno-arm64.zip" "https://github.com/denoland/deno/releases/latest/download/deno-aarch64-apple-darwin.zip"
unzip -q -o "$TMP/deno-arm64.zip" -d "$TMP/deno-arm64" && cp "$TMP/deno-arm64/deno" "$BIN/deno-arm64"
echo "deno (x64)..."
curl -L -o "$TMP/deno-x64.zip" "https://github.com/denoland/deno/releases/latest/download/deno-x86_64-apple-darwin.zip"
unzip -q -o "$TMP/deno-x64.zip" -d "$TMP/deno-x64" && cp "$TMP/deno-x64/deno" "$BIN/deno-x64"

echo "ffmpeg (evermeet.cx static)..."
curl -L -o "$TMP/ffmpeg.zip" "https://evermeet.cx/ffmpeg/getrelease/zip"
unzip -q -o "$TMP/ffmpeg.zip" -d "$TMP/ffmpeg" && cp "$TMP/ffmpeg/ffmpeg" "$BIN/ffmpeg"

chmod 755 "$BIN"/*
xattr -dr com.apple.quarantine "$BIN" 2>/dev/null || true
rm -rf "$TMP"
ls -lh "$BIN"
"$BIN/yt-dlp" --version
