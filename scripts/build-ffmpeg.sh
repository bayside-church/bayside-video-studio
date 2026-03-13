#!/usr/bin/env bash
#
# Build a DeckLink-capable FFmpeg binary for macOS (arm64).
# All source dependencies are bundled in resources/build-deps — no network needed.
#
# The resulting binary is placed in resources/ffmpeg.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DEPS_DIR="$PROJECT_DIR/resources/build-deps"
BUILD_DIR="$PROJECT_DIR/.ffmpeg-build"
PREFIX="$BUILD_DIR/prefix"
OUTPUT="$PROJECT_DIR/resources/ffmpeg"
NJOBS="$(sysctl -n hw.ncpu)"

export PATH="$PREFIX/bin:$PATH"
export PKG_CONFIG_PATH="$PREFIX/lib/pkgconfig"

mkdir -p "$BUILD_DIR" "$PREFIX/lib/pkgconfig" "$PREFIX/include" "$PREFIX/bin"

# ── Find DeckLink SDK headers ─────────────────────────────────────

DECKLINK_HEADERS=""

if [ -n "${1:-}" ]; then
  for sub in "Mac/include" "include" "Mac/Include" "Include" "."; do
    candidate="${1}/${sub}"
    if [ -f "$candidate/DeckLinkAPI.h" ]; then
      DECKLINK_HEADERS="$candidate"
      break
    fi
  done
fi

# Auto-extract any DeckLink SDK zips
for dir in "$HOME/Downloads" "$HOME/Desktop" "$HOME/Documents"; do
  for zip in "$dir"/Blackmagic_DeckLink_SDK*.zip "$dir"/blackmagic_decklink_sdk*.zip; do
    if [ -f "$zip" ]; then
      extract_dir="${zip%.zip}"
      if [ ! -d "$extract_dir" ]; then
        echo "Extracting $(basename "$zip")..."
        unzip -qo "$zip" -d "$extract_dir" 2>/dev/null || true
      fi
    fi
  done
done

if [ -z "$DECKLINK_HEADERS" ]; then
  for dir in "$HOME/Downloads" "$HOME/Desktop" "$HOME/Documents" \
             "/Library/Application Support/Blackmagic Design" "/opt" "/usr/local/include"; do
    if [ -d "$dir" ]; then
      found=$(find "$dir" -maxdepth 6 -name "DeckLinkAPI.h" -print -quit 2>/dev/null || true)
      if [ -n "$found" ]; then
        DECKLINK_HEADERS="$(dirname "$found")"
        break
      fi
    fi
  done
fi

if [ -z "$DECKLINK_HEADERS" ]; then
  echo "NEED_SDK"
  echo "Could not find the Blackmagic DeckLink SDK headers (DeckLinkAPI.h)."
  echo "Please download the DeckLink SDK from Blackmagic Design and leave it in"
  echo "your Downloads folder, then try again."
  exit 1
fi

echo "Found DeckLink SDK headers: $DECKLINK_HEADERS"

# Stage DeckLink headers + sources
DECKLINK_INCLUDE="$BUILD_DIR/decklink-include"
mkdir -p "$DECKLINK_INCLUDE"
cp "$DECKLINK_HEADERS"/DeckLink*.h "$DECKLINK_INCLUDE/" 2>/dev/null || true
cp "$DECKLINK_HEADERS"/DeckLink*.idl "$DECKLINK_INCLUDE/" 2>/dev/null || true
cp "$DECKLINK_HEADERS"/DeckLink*.cpp "$DECKLINK_INCLUDE/" 2>/dev/null || true

# ── Ensure Xcode Command Line Tools ───────────────────────────────

if ! xcode-select -p &>/dev/null; then
  echo "Xcode Command Line Tools are required."
  xcode-select --install
  echo "Please re-run after Xcode tools finish installing."
  exit 1
fi

# ── Build nasm ─────────────────────────────────────────────────────

if [ ! -f "$PREFIX/bin/nasm" ]; then
  echo "Building nasm..."
  cd "$BUILD_DIR"
  tar xf "$DEPS_DIR/nasm-2.16.03.tar.xz" 2>/dev/null || true
  cd nasm-2.16.03
  ./configure --prefix="$PREFIX" 2>&1 | tail -1
  make -j"$NJOBS" 2>&1 | tail -1
  make install 2>&1 | tail -1
  echo "  nasm: done"
fi

# ── Build pkgconf ──────────────────────────────────────────────────

if [ ! -f "$PREFIX/bin/pkg-config" ]; then
  echo "Building pkgconf..."
  cd "$BUILD_DIR"
  tar xf "$DEPS_DIR/pkgconf-2.3.0.tar.xz" 2>/dev/null || true
  cd pkgconf-2.3.0
  ./configure --prefix="$PREFIX" 2>&1 | tail -1
  make -j"$NJOBS" 2>&1 | tail -1
  make install 2>&1 | tail -1
  ln -sf "$PREFIX/bin/pkgconf" "$PREFIX/bin/pkg-config"
  echo "  pkgconf: done"
fi

# ── Build x264 ─────────────────────────────────────────────────────

if [ ! -f "$PREFIX/lib/pkgconfig/x264.pc" ]; then
  echo "Building x264..."
  cd "$BUILD_DIR"
  tar xf "$DEPS_DIR/x264-master.tar.bz2" 2>/dev/null || true
  cd x264-master
  ./configure --prefix="$PREFIX" --enable-static --disable-cli 2>&1 | tail -1
  make -j"$NJOBS" 2>&1 | tail -1
  make install 2>&1 | tail -1
  echo "  x264: done"
fi

# ── Build opus ─────────────────────────────────────────────────────

if [ ! -f "$PREFIX/lib/pkgconfig/opus.pc" ]; then
  echo "Building opus..."
  cd "$BUILD_DIR"
  tar xf "$DEPS_DIR/opus-1.5.2.tar.gz" 2>/dev/null || true
  cd opus-1.5.2
  ./configure --prefix="$PREFIX" --enable-static --disable-shared 2>&1 | tail -1
  make -j"$NJOBS" 2>&1 | tail -1
  make install 2>&1 | tail -1
  echo "  opus: done"
fi

# Skipping fdk-aac — using macOS AudioToolbox for AAC encoding instead

# ── Build FFmpeg ───────────────────────────────────────────────────

echo "Preparing FFmpeg..."
cd "$BUILD_DIR"
if [ ! -d "ffmpeg-7.1" ]; then
  tar xf "$DEPS_DIR/ffmpeg-7.1.tar.xz"
fi

FFMPEG_SRC="$BUILD_DIR/ffmpeg-7.1"

# ── Patch FFmpeg for DeckLink SDK 15.x compatibility ─────────────
# SDK 15.x removed IDeckLinkMemoryAllocator, GetBytes() from IDeckLinkVideoFrame,
# and SetVideoInputFrameMemoryAllocator() from IDeckLinkInput. The SDK ships
# backward-compat headers. We use v11.5.1 input interfaces (supported by drivers
# >= 11.5.1, including 14.2+) and v14.2.1 types for frames/allocator.

DECKLINK_DEC="$FFMPEG_SRC/libavdevice/decklink_dec.cpp"
DECKLINK_COMMON_H="$FFMPEG_SRC/libavdevice/decklink_common.h"
DECKLINK_COMMON_C="$FFMPEG_SRC/libavdevice/decklink_common.cpp"
PATCH_MARKER="$FFMPEG_SRC/.decklink_compat_v2"

# Only apply patches once (check for marker file)
if [ ! -f "$PATCH_MARKER" ]; then
  echo "Patching FFmpeg for DeckLink SDK 15.x compatibility..."

  # decklink_common.h: include compat headers, change IDeckLinkInput type
  sed -i '' '/#include <DeckLinkAPIVersion.h>/a\
#include "DeckLinkAPIVideoInput_v11_5_1.h"\
#include "DeckLinkAPIMemoryAllocator_v14_2_1.h"
' "$DECKLINK_COMMON_H"
  sed -i '' 's/IDeckLinkInput \*dli;/IDeckLinkInput_v11_5_1 *dli;/' "$DECKLINK_COMMON_H"

  # decklink_common.cpp: use v11.5.1 input interface for device listing
  sed -i '' 's/IDeckLinkInput \*input_config;/IDeckLinkInput_v11_5_1 *input_config;/' "$DECKLINK_COMMON_C"
  sed -i '' 's/IID_IDeckLinkInput,/IID_IDeckLinkInput_v11_5_1,/g' "$DECKLINK_COMMON_C"

  # decklink_dec.cpp: use compat interfaces throughout
  sed -i '' 's/IDeckLinkMemoryAllocator/IDeckLinkMemoryAllocator_v14_2_1/g' "$DECKLINK_DEC"
  sed -i '' 's/IDeckLinkInputCallback/IDeckLinkInputCallback_v11_5_1/g' "$DECKLINK_DEC"
  sed -i '' 's/IDeckLinkVideoInputFrame/IDeckLinkVideoInputFrame_v14_2_1/g' "$DECKLINK_DEC"
  sed -i '' 's/IID_IDeckLinkInput,/IID_IDeckLinkInput_v11_5_1,/g' "$DECKLINK_DEC"

  touch "$PATCH_MARKER"
  echo "  DeckLink SDK compat patches applied."
fi

# Build out-of-tree to avoid ./version conflicting with C++ <version> header
OBJ_DIR="$BUILD_DIR/ffmpeg-obj"
rm -rf "$OBJ_DIR"
mkdir -p "$OBJ_DIR"
cd "$OBJ_DIR"

echo "Configuring FFmpeg with DeckLink support..."

"$FFMPEG_SRC/configure" \
  --prefix="$PREFIX" \
  --arch=arm64 \
  --cc=/usr/bin/clang \
  --extra-cflags="-I${DECKLINK_INCLUDE} -I${PREFIX}/include" \
  --extra-cxxflags="-I${DECKLINK_INCLUDE} -I${PREFIX}/include" \
  --extra-ldflags="-L${PREFIX}/lib" \
  --pkg-config="$PREFIX/bin/pkg-config" \
  --enable-gpl \
  --enable-nonfree \
  --enable-libx264 \
  --enable-libopus \
  --enable-decklink \
  --enable-videotoolbox \
  --enable-audiotoolbox \
  --enable-neon \
  --enable-runtime-cpudetect \
  --enable-postproc \
  --disable-doc \
  --disable-debug

# The FFmpeg source tree has a file called 'version' which conflicts with
# the C++20 <version> standard header on newer macOS SDKs. Rename it so
# the compiler doesn't pick it up via -I src/ include paths.
if [ -f "$FFMPEG_SRC/version" ]; then
  mv "$FFMPEG_SRC/version" "$FFMPEG_SRC/VERSION_FILE"
fi
# Always patch the Makefile (it's regenerated each configure run)
if [ -f "$FFMPEG_SRC/VERSION_FILE" ]; then
  sed -i '' 's|$(SRC_PATH)/version|$(SRC_PATH)/VERSION_FILE|g' Makefile
fi

echo "Building FFmpeg (this may take several minutes)..."
make -j"$NJOBS" 2>&1

# ── Install to resources/ ──────────────────────────────────────────

echo "Installing to $OUTPUT..."
cp ffmpeg "$OUTPUT"
chmod +x "$OUTPUT"

if "$OUTPUT" -hide_banner -formats 2>/dev/null | grep -q decklink || \
   "$OUTPUT" -hide_banner -devices 2>/dev/null | grep -q decklink; then
  echo ""
  echo "BUILD_SUCCESS"
else
  echo ""
  echo "Warning: Build completed but DeckLink format not detected."
  exit 1
fi
