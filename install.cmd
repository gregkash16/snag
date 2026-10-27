@echo off
setlocal
set "SRC=%~dp0"
if "%SRC:~-1%"=="\" set "SRC=%SRC:~0,-1%"
set "DST=%APPDATA%\Adobe\CEP\extensions\com.gregk.snag"

echo Enabling unsigned CEP panels (PlayerDebugMode)...
reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul
reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul

if not exist "%APPDATA%\Adobe\CEP\extensions" mkdir "%APPDATA%\Adobe\CEP\extensions"
if exist "%DST%" rmdir "%DST%" 2>nul
echo Linking %DST% -^> %SRC%
mklink /J "%DST%" "%SRC%"

if not exist "%SRC%\bin\yt-dlp.exe" call "%SRC%\get-ytdlp.cmd"

echo.
echo Done. Restart After Effects / Premiere, then Window ^> Extensions ^> Snag
pause
