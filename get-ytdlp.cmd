@echo off
setlocal
set "BIN=%~dp0bin"
if not exist "%BIN%" mkdir "%BIN%"
echo Downloading latest yt-dlp.exe...
curl -L -o "%BIN%\yt-dlp.exe" https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe
"%BIN%\yt-dlp.exe" --version
