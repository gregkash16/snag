# Snag

CEP panel for After Effects and Premiere Pro that pulls video or audio from any
site yt-dlp supports (YouTube, Facebook, Instagram, TikTok, X, Vimeo, ...) and
drops it straight into the open project.

## Features

- Video or **audio-only** (WAV / MP3 320k / M4A / FLAC)
- Max resolution cap, H.264 preferred so AE/Premiere import cleanly
- Optional ProRes 422 MOV transcode via ffmpeg
- In / out trim: full file is downloaded (fast, parallel), then cut locally
  with ffmpeg. yt-dlp's own `--download-sections` was tested and crawls at
  ~1 KB/s on YouTube, so it is deliberately not used.
- Needs a JS runtime for YouTube (yt-dlp EJS). Auto-detects `bin/deno.exe`,
  `bin/node.exe`, system Node, or `deno`/`node` on PATH.
- Browser-cookie login for Instagram / Facebook / private posts
- Imports into a `Snag` bin/folder in the project
- One-click `yt-dlp -U`

## Layout

```
CSXS/manifest.xml   CEP manifest (AEFT + PPRO, CSXS 11)
client/             panel HTML/CSS/JS (Node enabled via --enable-nodejs)
host/host.jsx       ExtendScript import bridge (snagImport)
bin/yt-dlp.exe      downloader (gitignored, ~23 MB)
.debug              Chrome remote debug: AE :8088, PPro :8089
```

ffmpeg is looked up in `bin/ffmpeg.exe`, then `C:\ffmpeg\bin`, then PATH.

## Install (dev)

1. Enable unsigned panels once (already done on this PC):
   `HKCU\Software\Adobe\CSXS.11` and `CSXS.12` → `PlayerDebugMode` = `"1"`
2. Junction the repo into the CEP folder (`install.cmd` does this):
   `%APPDATA%\Adobe\CEP\extensions\com.gregk.snag` → this folder
3. Fetch yt-dlp if `bin/yt-dlp.exe` is missing (`get-ytdlp.cmd`).
4. Restart AE / Premiere → **Window ▸ Extensions ▸ Snag**.

Debug the panel at `http://localhost:8088` (AE) in Chrome while it is open.

## Notes

- Downloads land in `%USERPROFILE%\Videos\Snag` by default.
- yt-dlp breaks when YouTube changes things; hit **Update yt-dlp** in the footer.
- Instagram/Facebook usually need **Login cookies** set to the browser you are
  signed in with.
