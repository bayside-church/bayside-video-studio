# Bayside Video Studio

Self-serve video recording kiosk built with Electron, React, and FFmpeg. Users record a short video at an unattended kiosk, and the app uploads it to Mux and emails them a playback link via Mailgun.

## Prerequisites

- Node.js 20+
- FFmpeg (with DeckLink support for production, or a webcam for dev mode)
- macOS (DeckLink capture card required for production)

## Setup

```bash
npm install
```

Credentials (Mux, Mailgun, admin PIN) are configured through the in-app admin panel and stored encrypted on disk via Electron's `safeStorage`.

## Development

```bash
npm run dev          # Start in dev mode (uses webcam)
npm run typecheck    # TypeScript type checking
npm test             # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run Playwright E2E tests
```

## Production

A pre-built, signed DMG is available on the [Releases](https://github.com/bayside-church/bayside-video-studio/releases) page.

### Building from source

The DMG is code-signed and notarized with a Developer ID certificate. To build a signed release yourself, you'll need an Apple Developer account with a **Developer ID Application** certificate installed in your keychain.

```bash
APPLE_ID="your@appleid.com" APPLE_ID_PASSWORD="app-specific-password" npm run make
```

The `APPLE_ID_PASSWORD` should be an [app-specific password](https://support.apple.com/en-us/102654), not your Apple ID password. The built DMG will be in `out/make/`.

To build unsigned (for local testing only):

```bash
npm run make
```

The app runs in kiosk/fullscreen mode in production. To auto-start on boot:

```bash
./scripts/install-launchagent.sh
```

## Architecture

```
src/
  main/           # Electron main process
    ffmpeg/       # FFmpeg device detection & recording controller
    mux/          # Mux upload & asset polling
    email/        # Mailgun email sender
    ipc/          # IPC handler registration
  preload/        # contextBridge API (renderer ↔ main)
  renderer/       # React UI
    screens/      # Screen components (Welcome → Email → PreRecord → Countdown → Recording → Processing → Complete)
    components/   # Reusable UI components
    hooks/        # Custom hooks (preview, idle timeout, auto-reset)
    store/        # Zustand session store
  shared/         # Types and constants shared across processes
```

## Hardware Setup

For production kiosk deployment:
1. Install Blackmagic Desktop Video drivers
2. Connect DeckLink capture card
3. Verify with `./scripts/check-decklink.sh`
