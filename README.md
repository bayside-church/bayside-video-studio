# Bayside Video Studio

Self-serve video recording kiosk built with Electron, React, and FFmpeg. Users record a short video at an unattended kiosk, and the app uploads it to Mux and emails them a playback link via Mailgun.

## Prerequisites

- Node.js 20+
- FFmpeg (with DeckLink support for production, or a webcam for dev mode)
- macOS (DeckLink capture card required for production)

## Setup

```bash
npm install
cp .env.example .env
# Fill in your Mux and Mailgun credentials in .env
```

## Development

```bash
npm run dev          # Start in dev mode (uses webcam)
npm run typecheck    # TypeScript type checking
npm test             # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run Playwright E2E tests
```

## Production

```bash
npm run make         # Build macOS DMG
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

## Environment Variables

See `.env.example` for all required configuration.

**Important:** In production, set environment variables on the host machine rather than shipping a `.env` file in the app bundle.

## Hardware Setup

For production kiosk deployment:
1. Install Blackmagic Desktop Video drivers
2. Connect DeckLink capture card
3. Verify with `./scripts/check-decklink.sh`
