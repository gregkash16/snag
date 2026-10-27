# Installing Snag

Snag is a panel for After Effects and Premiere Pro (2024 or newer) that grabs
video or audio from a URL and drops it into your project. Windows and macOS.

Pick the file for your computer:

- Windows: `Snag-<version>-win.zxp`
- Mac: `Snag-<version>-mac.zxp` (Apple Silicon and Intel)

1. Install a ZXP installer if you don't have one. Either works and both are free:
   - aescripts ZXP/UXP Installer: https://aescripts.com/learn/zxp-installer/
   - Anastasiy's Extension Manager: https://install.anastasiy.com/
2. Open the installer and drag the `.zxp` onto it.
3. Restart After Effects or Premiere Pro.
4. **Window ▸ Extensions ▸ Snag**.

Everything Snag needs (yt-dlp, ffmpeg, a JavaScript runtime) is inside the
package. The first time the panel opens it copies those tools into your user
folder (`%LOCALAPPDATA%\Snag` on Windows, `~/Library/Application Support/Snag`
on Mac) so they can update themselves later.

## Tips

- Downloads go to `Videos\Snag` (Windows) or `Movies/Snag` (Mac) by default.
  Change it in the panel. **Empty folder** in the footer clears it out.
- Instagram / Facebook / private posts need you logged in. Easiest: install the
  "Get cookies.txt LOCALLY" browser extension, export a cookies.txt while on the
  site, and pick **cookies.txt file…** under Login cookies. On Windows, Chrome
  and Edge must be fully closed if you pick them directly; Firefox doesn't care.
- If YouTube downloads start failing, hit **Update yt-dlp** in the footer.
- Blank panel after install? Known Adobe quirk: run the host app once as
  Administrator (Windows) or from an admin account (Mac), open the panel, then
  go back to normal.
- Mac, Intel: nothing extra. Mac, Apple Silicon: if ffmpeg complains about
  Rosetta, run `softwareupdate --install-rosetta` once in Terminal.

## Uninstall

Remove it with the same ZXP installer, or delete the extension folder:

- Windows: `%APPDATA%\Adobe\CEP\extensions\com.gregk.snag` or
  `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\com.gregk.snag`
- Mac: `~/Library/Application Support/Adobe/CEP/extensions/com.gregk.snag` or
  `/Library/Application Support/Adobe/CEP/extensions/com.gregk.snag`

Then delete the tools folder named above if you want a clean slate.
