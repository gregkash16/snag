# Fetch the Windows binaries Snag bundles: yt-dlp, ffmpeg, deno  ->  bin\win\
$ErrorActionPreference = "Stop"
$bin = Join-Path $PSScriptRoot "bin\win"
New-Item -ItemType Directory -Force $bin | Out-Null
$tmp = Join-Path $env:TEMP "snag-bins"
New-Item -ItemType Directory -Force $tmp | Out-Null

Write-Host "yt-dlp..."
Invoke-WebRequest "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile "$bin\yt-dlp.exe"

Write-Host "deno..."
Invoke-WebRequest "https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip" -OutFile "$tmp\deno.zip"
Expand-Archive "$tmp\deno.zip" "$tmp\deno" -Force
Copy-Item "$tmp\deno\deno.exe" "$bin\deno.exe" -Force

if (Test-Path "C:\ffmpeg\bin\ffmpeg.exe") {
  Write-Host "ffmpeg (from C:\ffmpeg\bin)..."
  Copy-Item "C:\ffmpeg\bin\ffmpeg.exe" "$bin\ffmpeg.exe" -Force
} else {
  Write-Host "ffmpeg (gyan.dev essentials, ~100 MB)..."
  Invoke-WebRequest "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" -OutFile "$tmp\ffmpeg.zip"
  Expand-Archive "$tmp\ffmpeg.zip" "$tmp\ffmpeg" -Force
  $exe = Get-ChildItem "$tmp\ffmpeg" -Recurse -Filter ffmpeg.exe | Select-Object -First 1
  Copy-Item $exe.FullName "$bin\ffmpeg.exe" -Force
}

Remove-Item $tmp -Recurse -Force
Get-ChildItem $bin -Filter *.exe | Select-Object Name, @{n = "MB"; e = { [math]::Round($_.Length / 1MB, 1) } }
& "$bin\yt-dlp.exe" --version
