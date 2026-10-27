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
client/runtime.js   Windows/macOS abstraction: bundled-binary install, which, kill, reveal folder
client/main.js      panel logic
host/host.jsx       ExtendScript import bridge (snagImport)
bin/win/            yt-dlp.exe, ffmpeg.exe, deno.exe      (gitignored; get-bins.ps1)
bin/mac/            yt-dlp, ffmpeg, deno-arm64, deno-x64  (gitignored; get-bins.sh, run on a Mac)
.debug              Chrome remote debug: AE :8088, PPro :8089
```

On first launch the panel copies `bin/<platform>` to a per-user folder
(`%LOCALAPPDATA%\Snag\bin` / `~/Library/Application Support/Snag/bin`) and runs
from there, so `yt-dlp -U` can self-update and macOS gets exec bits + no
quarantine flag. It re-copies whenever `ExtensionBundleVersion` changes.
Fallbacks: `C:\ffmpeg\bin`, Homebrew paths, PATH.

## Install (dev)

1. Enable unsigned panels once: `PlayerDebugMode` = `"1"` under
   `HKCU\Software\Adobe\CSXS.11` and `CSXS.12` (Mac: `defaults write com.adobe.CSXS.11 PlayerDebugMode 1`, same for 12).
2. Junction/symlink the repo into the CEP extensions folder (`install.cmd` does this on Windows).
3. `get-bins.ps1` (Windows) or `./get-bins.sh` (Mac) to fetch the binaries.
4. Restart AE / Premiere → **Window ▸ Extensions ▸ Snag**.

Debug the panel at `http://localhost:8088` (AE) in Chrome while it is open.

## Ship a ZXP

- Windows: `build-zxp.ps1 [version]` → `dist\Snag-<v>-win.zxp`
- Mac: `./build-zxp.sh [version]` → `dist/Snag-<v>-mac.zxp` (sign on a Mac; Adobe's advice)

Both sign with a self-signed "CEP Panels" cert kept outside the repo
(`%LOCALAPPDATA%\cep-tools` / `~/.cep-tools`, created on first run). Friends
install with the aescripts ZXP/UXP Installer; see INSTALL.md.

## Notes

- Downloads land in `%USERPROFILE%\Videos\Snag` by default.
- yt-dlp breaks when YouTube changes things; hit **Update yt-dlp** in the footer.
- Instagram/Facebook usually need **Login cookies** set to the browser you are
  signed in with.
