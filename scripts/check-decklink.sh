#!/bin/bash
# Verify DeckLink capture card is detected by FFmpeg

echo "Checking for DeckLink devices..."
ffmpeg -f decklink -list_devices 1 -i dummy 2>&1 | grep -E '\[[0-9]+\]'

if [ $? -eq 0 ]; then
    echo ""
    echo "DeckLink device found!"
else
    echo "No DeckLink device detected."
    echo "Make sure:"
    echo "  1. Blackmagic Desktop Video drivers are installed"
    echo "  2. The capture card is connected"
    echo "  3. FFmpeg was built with --enable-decklink"
    exit 1
fi
