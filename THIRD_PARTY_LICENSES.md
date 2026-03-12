# Third-Party Licenses

## FFmpeg

The `resources/ffmpeg` binary is a custom build of FFmpeg, included for
DeckLink capture card support.

- **Version:** git-2026-03-11-ba0f808
- **Build flags:** `--enable-gpl --enable-nonfree --enable-decklink`
- **License:** GPL v2 or later (due to `--enable-gpl`)
- **Website:** https://ffmpeg.org/
- **License text:** https://www.gnu.org/licenses/old-licenses/gpl-2.0.html

Because this binary is built with `--enable-gpl`, it is licensed under the
GNU General Public License v2 or later. The `--enable-nonfree` flag indicates
it also links against libraries with non-free licenses (e.g., Blackmagic
DeckLink SDK).

**Important:** The FFmpeg binary is distributed separately from the MIT-licensed
source code of this project. The GPL license applies only to the FFmpeg binary
itself, not to the rest of this project. If you redistribute this application
with the included FFmpeg binary, you must comply with the GPL and provide
access to the FFmpeg source code used to build it.

To build your own FFmpeg binary, see https://trac.ffmpeg.org/wiki/CompilationGuide.
