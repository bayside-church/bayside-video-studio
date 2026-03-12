import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import BigButton from '../components/BigButton';
import EmailInput from '../components/EmailInput';
import VideoPreview from '../components/VideoPreview';
import AudioMeter from '../components/AudioMeter';
import Sidebar from '../components/Sidebar';
import RecordingGuides from '../components/RecordingGuides';
import { useSessionStore } from '../store/useSessionStore';
import type { VideoDevice, AudioDevice, AzureBlobSummary, GuideSettings, AdminSettings } from '../../shared/types';
import { probeAudioDevice } from '../utils/audioDevices';
import { listBrowserVideoDevices, filterConnectedVideoDevices, filterConnectedAudioDevices } from '../utils/browserDevices';
import { startPreview as startBrowserPreview, stopPreview as stopBrowserPreview, getStream } from '../utils/browserCapture';
import logoSrc from '../../../assets/logo.png';

type SidebarPanel = 'camera' | 'mic' | 'videos' | 'guides' | 'admin' | null;

export default function HomeScreen() {
  const { email, setEmail, setScreen, setError, setGuides: setStoreGuides, setIsBrowserCapture } = useSessionStore();
  const [previewReady, setPreviewReady] = useState(false);
  const [deviceMissing, setDeviceMissing] = useState(false);
  const [activePanel, setActivePanel] = useState<SidebarPanel>(null);
  const [audioDeviceId, setAudioDeviceId] = useState<string | null>(null);
  const [missingSettings, setMissingSettings] = useState<string[] | null>(null);
  const [browserStream, setBrowserStream] = useState<MediaStream | null>(null);
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const configured = missingSettings !== null && missingSettings.length === 0;

  // Check required settings + start preview on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Log media permission status for debugging
        try {
          const micPerm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          const camPerm = await navigator.permissions.query({ name: 'camera' as PermissionName });
          console.log(`[Permissions] microphone=${micPerm.state}, camera=${camPerm.state}`);
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioLabels = devices.filter((d) => d.kind === 'audioinput').map((d) => d.label || '(empty)');
          console.log(`[Permissions] Audio device labels: ${JSON.stringify(audioLabels)}`);
        } catch (err) {
          console.warn('[Permissions] Could not query permissions:', err);
        }

        const missing = await window.baysideAPI.getMissingSettings();
        if (cancelled) return;
        setMissingSettings(missing);

        const device = await window.baysideAPI.detectDevice();
        if (cancelled) return;

        // Load audio device for meter
        const [audio, savedGuides] = await Promise.all([
          window.baysideAPI.getSelectedAudioDevice(),
          window.baysideAPI.getGuides(),
        ]);
        if (!cancelled) {
          setAudioDeviceId(audio?.id ?? null);
          setStoreGuides(savedGuides);
        }

        if (!device) {
          setDeviceMissing(true);
          return;
        }

        await window.baysideAPI.startPreview();
        if (!cancelled) setPreviewReady(true);
      } catch (err) {
        if (!cancelled) setDeviceMissing(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const togglePanel = useCallback((panel: SidebarPanel) => {
    setActivePanel((cur) => cur !== panel ? panel : null);
  }, []);

  const restartPreview = useCallback(async () => {
    setPreviewReady(false);
    stopBrowserPreview();
    setBrowserStream(null);
    setIsBrowserCapture(false);
    try {
      await window.baysideAPI.resetSession();
      const device = await window.baysideAPI.detectDevice();
      if (!device) {
        setDeviceMissing(true);
        return;
      }
      setDeviceMissing(false);
      await window.baysideAPI.startPreview();
      setPreviewReady(true);
    } catch (err) {
      console.error('[HomeScreen] Failed to restart preview:', err);
      setDeviceMissing(true);
    }
  }, []);

  const handleAdminClose = useCallback(async () => {
    setActivePanel(null);
    const missing = await window.baysideAPI.getMissingSettings();
    setMissingSettings(missing);
    // If settings just became valid and preview isn't running, start it
    if (missing.length === 0 && !previewReady && !deviceMissing) {
      restartPreview();
    }
  }, [previewReady, deviceMissing, restartPreview]);

  const handleStart = async () => {
    if (!isValid || !configured) return;
    // Kill the preview process now so the countdown screen doesn't show a
    // frozen frame while FFmpeg tears down. The countdown will display over
    // a clean dark background, and recording FFmpeg will provide fresh
    // preview frames once it spins up.
    if (!browserStream) {
      await window.baysideAPI.stopPreview().catch(() => {});
    }
    setScreen('countdown');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full relative"
    >
      {/* Full-screen video preview */}
      {previewReady ? (
        <VideoPreview mirror className="absolute inset-0 w-full h-full" mediaStream={browserStream}>
          <RecordingGuides />
        </VideoPreview>
      ) : (
        <div className="absolute inset-0 w-full h-full bg-surface-base flex items-center justify-center">
          {deviceMissing ? (
            <div className="text-center">
              <p className="text-text-secondary text-lg">No camera selected</p>
              <button
                onClick={() => togglePanel('camera')}
                className="mt-3 text-accent hover:text-accent-hover text-sm font-medium transition-colors cursor-pointer"
              >
                Select Camera
              </button>
            </div>
          ) : (
            <div className="w-8 h-8 border-2 border-surface-border border-t-accent rounded-full animate-spin" />
          )}
        </div>
      )}

      {/* Audio level meter — top left */}
      {previewReady && (
        <div className="absolute top-6 left-6 z-20 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-md shadow-[0_0_0_1px_rgba(255,255,255,0.1)]">
          <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
          </svg>
          <AudioMeter deviceId={audioDeviceId} />
        </div>
      )}

      {/* Right-side icon toolbar */}
      <div className="absolute top-6 right-6 z-20 flex flex-col gap-2 p-2.5 rounded-2xl bg-white/10 backdrop-blur-md shadow-[0_0_0_1px_rgba(255,255,255,0.1)]">
        <ToolbarIcon
          active={activePanel === 'camera'}
          onClick={() => togglePanel('camera')}
          title="Camera"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
        </ToolbarIcon>
        <ToolbarIcon
          active={activePanel === 'mic'}
          onClick={() => togglePanel('mic')}
          title="Microphone"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
        </ToolbarIcon>
        <ToolbarIcon
          active={activePanel === 'videos'}
          onClick={() => togglePanel('videos')}
          title="Videos"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-2.625 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0 1 18 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0 1 18 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 0 1 6 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5" />
        </ToolbarIcon>
        <ToolbarIcon
          active={activePanel === 'guides'}
          onClick={() => togglePanel('guides')}
          title="Recording Guides"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
        </ToolbarIcon>
        <ToolbarIcon
          active={activePanel === 'admin'}
          onClick={() => togglePanel('admin')}
          title="Admin Settings"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.212-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </ToolbarIcon>
      </div>

      {/* Camera sidebar */}
      <Sidebar open={activePanel === 'camera'} onClose={() => setActivePanel(null)} title="Camera">
        <CameraPanel
          onDeviceChanged={restartPreview}
          onBrowserDeviceSelected={async (device) => {
            // Stop FFmpeg preview, start browser preview
            setPreviewReady(false);
            stopBrowserPreview();
            setBrowserStream(null);
            await window.baysideAPI.stopPreview();

            try {
              // Match browser audio device
              const selectedAudio = await window.baysideAPI.getSelectedAudioDevice();
              let browserAudioId: string | undefined;
              if (selectedAudio) {
                const browserDevices = await navigator.mediaDevices.enumerateDevices();
                const match = browserDevices.find(
                  (d) =>
                    d.kind === 'audioinput' &&
                    (d.label.toLowerCase().includes(selectedAudio.name.toLowerCase()) ||
                      selectedAudio.name.toLowerCase().includes(d.label.toLowerCase()))
                );
                browserAudioId = match?.deviceId;
              }

              console.log(`[HomeScreen] Starting browser preview with audio device: ${browserAudioId ?? 'none'}`);
              const stream = await startBrowserPreview(device.id, browserAudioId);
              console.log(`[HomeScreen] Browser stream audio tracks: ${stream.getAudioTracks().length}`);
              setBrowserStream(stream);
              setIsBrowserCapture(true);
              await window.baysideAPI.selectDevice(device);
              setDeviceMissing(false);
              setPreviewReady(true);
            } catch (err) {
              console.error('[HomeScreen] Failed to start browser preview:', err);
              setDeviceMissing(true);
            }
          }}
        />
      </Sidebar>

      {/* Microphone sidebar */}
      <Sidebar open={activePanel === 'mic'} onClose={() => setActivePanel(null)} title="Microphone">
        <MicPanel onDeviceChanged={async (id) => {
          setAudioDeviceId(id);
          // If in browser capture mode, restart the stream with the new audio device
          if (browserStream) {
            const currentDevice = await window.baysideAPI.getSelectedDevice();
            if (currentDevice?.format === 'browser') {
              try {
                stopBrowserPreview();
                let browserAudioId: string | undefined;
                if (id) {
                  const selectedAudio = await window.baysideAPI.getSelectedAudioDevice();
                  if (selectedAudio) {
                    const browserDevices = await navigator.mediaDevices.enumerateDevices();
                    const match = browserDevices.find(
                      (d) =>
                        d.kind === 'audioinput' &&
                        (d.label.toLowerCase().includes(selectedAudio.name.toLowerCase()) ||
                          selectedAudio.name.toLowerCase().includes(d.label.toLowerCase()))
                    );
                    browserAudioId = match?.deviceId;
                    console.log(`[MicPanel] Matched browser audio device: ${match?.label ?? 'none'} for "${selectedAudio.name}"`);
                  }
                }
                const stream = await startBrowserPreview(currentDevice.id, browserAudioId);
                setBrowserStream(stream);
                console.log(`[MicPanel] Restarted browser preview with audio tracks: ${stream.getAudioTracks().length}`);
              } catch (err) {
                console.error('[MicPanel] Failed to restart browser preview with new audio:', err);
              }
            }
          }
        }} />
      </Sidebar>

      {/* Videos sidebar */}
      <Sidebar open={activePanel === 'videos'} onClose={() => setActivePanel(null)} title="Videos">
        <AzureVideosPanel />
      </Sidebar>

      {/* Guides sidebar */}
      <Sidebar open={activePanel === 'guides'} onClose={() => setActivePanel(null)} title="Recording Guides">
        <GuidesPanel />
      </Sidebar>

      {/* Admin sidebar */}
      <Sidebar open={activePanel === 'admin'} onClose={handleAdminClose} title="Admin Settings">
        <AdminPanel />
      </Sidebar>

      {/* Bottom overlay */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center pb-10">
        <motion.div
          className="flex flex-col items-center px-10 py-8 rounded-3xl bg-white/10 backdrop-blur-md shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <img src={logoSrc} alt="Bayside Video Studio" className="h-52 m-0 p-10" draggable={false} />

          {!configured ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <p className="text-amber-400 text-sm font-semibold">Setup Required</p>
              </div>
              <p className="text-white/50 text-xs text-center mb-5 max-w-xs">
                Please complete configuration in the Admin menu before recording.
              </p>
              <button
                onClick={() => togglePanel('admin')}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-accent hover:bg-accent-hover transition-colors cursor-pointer"
              >
                Open Admin Settings
              </button>
            </>
          ) : (
            <>
              <p className="text-white/50 text-sm font-medium mt-0 mb-6 p-0">
                Enter your email to get started
              </p>

              <div className="w-full flex justify-center mb-5">
                <EmailInput value={email} onChange={setEmail} onSubmit={handleStart} />
              </div>

              <BigButton onClick={handleStart} disabled={!isValid || !previewReady} pulse={isValid && previewReady}>
                Start Recording
              </BigButton>
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

// --- Toolbar icon button ---

function ToolbarIcon({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-sm transition-colors cursor-pointer ${
        active
          ? 'bg-accent/80 text-white'
          : 'bg-black/30 hover:bg-black/50 text-white/60'
      }`}
      title={title}
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        {children}
      </svg>
    </button>
  );
}

// --- Camera panel ---

function CameraPanel({
  onDeviceChanged,
  onBrowserDeviceSelected,
}: {
  onDeviceChanged: () => void;
  onBrowserDeviceSelected: (device: VideoDevice) => void;
}) {
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [selected, setSelected] = useState<VideoDevice | null>(null);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadDevices();
  }, []);

  async function loadDevices() {
    setScanning(true);
    try {
      const [ffmpegList, current] = await Promise.all([
        window.baysideAPI.listDevices(),
        window.baysideAPI.getSelectedDevice(),
      ]);

      // Filter to only currently connected devices using browser enumerateDevices
      const connectedFfmpeg = await filterConnectedVideoDevices(ffmpegList);

      // Also discover browser-only devices (e.g. Blackmagic UltraStudio)
      let browserDevices: VideoDevice[] = [];
      try {
        browserDevices = await listBrowserVideoDevices(connectedFfmpeg.map((d) => d.name));
      } catch (err) {
        console.warn('Failed to list browser devices:', err);
      }

      setDevices([...connectedFfmpeg, ...browserDevices]);
      setSelected(current);
    } catch (err) {
      console.error('Failed to list devices:', err);
    } finally {
      setScanning(false);
    }
  }

  async function handleSelect(device: VideoDevice) {
    if (device.id === selected?.id) return;
    setError(null);

    if (device.format === 'browser') {
      // Browser device — probe via quick getUserMedia
      setTesting(true);
      try {
        const rawId = device.id.replace(/^browser:/, '');
        const testStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: rawId } },
        });
        testStream.getTracks().forEach((t) => t.stop());
      } catch {
        setTesting(false);
        setError(`"${device.name}" could not be opened`);
        return;
      }
      setTesting(false);
      setSelected(device);
      onBrowserDeviceSelected(device);
      return;
    }

    // FFmpeg device — existing probe path
    setTesting(true);
    await window.baysideAPI.stopPreview();
    const works = await window.baysideAPI.probeVideoDevice(device.id);
    setTesting(false);

    if (!works) {
      setError(`"${device.name}" could not be opened`);
      onDeviceChanged();
      return;
    }

    setSelected(device);
    await window.baysideAPI.selectDevice(device);
    onDeviceChanged();
  }

  return (
    <div className="p-4 space-y-2">
      <div className="flex justify-end mb-1">
        <button
          onClick={loadDevices}
          disabled={scanning}
          className="text-xs text-accent hover:text-accent-hover font-medium transition-colors cursor-pointer disabled:opacity-40"
        >
          {scanning ? 'Scanning...' : 'Refresh'}
        </button>
      </div>

      {scanning && devices.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-surface-border border-t-accent rounded-full animate-spin" />
        </div>
      ) : devices.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-text-secondary text-sm">No cameras found</p>
          <p className="text-text-tertiary text-xs mt-1">Connect a camera and tap Refresh</p>
        </div>
      ) : (
        devices.map((device) => (
          <DeviceButton
            key={device.id}
            name={device.name}
            subtitle={device.format === 'decklink' ? 'DeckLink Capture' : device.format === 'browser' ? 'Browser Capture' : 'Camera'}
            selected={selected?.id === device.id}
            onClick={() => handleSelect(device)}
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            }
          />
        ))
      )}

      {testing && (
        <p className="text-text-tertiary text-xs text-center pt-2">Testing camera...</p>
      )}

      {error && (
        <p className="text-red-400 text-xs text-center pt-2">{error}</p>
      )}
    </div>
  );
}

// --- Mic panel ---

function getAudioDeviceSubtitle(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('macbook') || lower.includes('built-in')) return 'Built-in';
  if (lower.includes('usb')) return 'USB Audio';
  if (lower.includes('blackmagic') || lower.includes('ultrastudio') || lower.includes('decklink')) return 'Capture Device';
  if (lower.includes('zoom') || lower.includes('teams') || lower.includes('skype') || lower.includes('virtual') || lower.includes('aggregate')) return 'Virtual Audio';
  return 'Audio Input';
}

function MicPanel({ onDeviceChanged }: { onDeviceChanged: (id: string | null) => void }) {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selected, setSelected] = useState<AudioDevice | null>(null);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [audioDelayMs, setAudioDelayMs] = useState(0);
  const [audioDelayDraft, setAudioDelayDraft] = useState('0');

  useEffect(() => {
    loadDevices();
    window.baysideAPI.getAudioDelayMs().then((v) => {
      setAudioDelayMs(v);
      setAudioDelayDraft(String(v));
    });
  }, []);

  async function loadDevices() {
    setScanning(true);
    try {
      const [list, current] = await Promise.all([
        window.baysideAPI.listAudioDevices(),
        window.baysideAPI.getSelectedAudioDevice(),
      ]);
      // Filter to only currently connected devices using browser enumerateDevices
      const connected = await filterConnectedAudioDevices(list);
      setDevices(connected);
      setSelected(current);
    } catch (err) {
      console.error('Failed to list audio devices:', err);
    } finally {
      setScanning(false);
    }
  }

  async function handleSelect(device: AudioDevice | null) {
    setError(null);

    if (!device) {
      setSelected(null);
      await window.baysideAPI.selectAudioDevice(null);
      onDeviceChanged(null);
      return;
    }

    // Probe the device before committing
    setTesting(true);
    const available = await probeAudioDevice(device.name);
    setTesting(false);

    if (!available) {
      setError(`"${device.name}" is not available`);
      return;
    }

    setSelected(device);
    await window.baysideAPI.selectAudioDevice(device);
    onDeviceChanged(device.id);
  }

  return (
    <div className="p-4 space-y-2">
      {/* No Audio option */}
      <DeviceButton
        name="No Audio"
        subtitle="Video only"
        selected={!selected}
        onClick={() => handleSelect(null)}
        icon={
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
        }
      />

      {scanning && devices.length === 0 ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-6 h-6 border-2 border-surface-border border-t-accent rounded-full animate-spin" />
        </div>
      ) : (
        devices.map((device) => (
          <DeviceButton
            key={device.id}
            name={device.name}
            subtitle={getAudioDeviceSubtitle(device.name)}
            selected={selected?.id === device.id}
            onClick={() => handleSelect(device)}
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            }
          />
        ))
      )}

      {testing && (
        <p className="text-text-tertiary text-xs text-center pt-2">Testing device...</p>
      )}

      {error && (
        <p className="text-red-400 text-xs text-center pt-2">{error}</p>
      )}

      {selected && (
        <div className="border-t border-surface-border mt-4 pt-4">
          <label className="text-[11px] font-medium text-text-tertiary mb-1 block">
            Audio Sync Correction (ms)
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={audioDelayDraft}
            onChange={(e) => {
              const v = e.target.value;
              if (/^-?\d*$/.test(v)) setAudioDelayDraft(v);
            }}
            onBlur={() => {
              const parsed = parseInt(audioDelayDraft, 10) || 0;
              const clamped = Math.max(-500, Math.min(500, parsed));
              setAudioDelayMs(clamped);
              setAudioDelayDraft(String(clamped));
              window.baysideAPI.setAudioDelayMs(clamped);
            }}
            className="w-full px-2.5 py-1.5 rounded-lg bg-surface-base text-text-primary text-xs placeholder:text-text-tertiary outline-none shadow-[0_0_0_1px_rgba(255,255,255,0.08)] focus:shadow-[0_0_0_1px_rgba(129,140,248,0.5)] transition-shadow"
          />
          <p className="text-text-tertiary text-[10px] mt-1">
            If audio plays before the video, use a positive value. If audio is behind, use a negative value. Only affects DeckLink + USB mic recordings. Range: -500 to 500.
          </p>
        </div>
      )}
    </div>
  );
}

// --- Videos panel ---

function AzureVideosPanel() {
  const [blobs, setBlobs] = useState<AzureBlobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextPage, setNextPage] = useState(2);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  hasMoreRef.current = hasMore;
  loadingMoreRef.current = loadingMore;

  useEffect(() => {
    loadBlobs();
  }, []);

  async function loadBlobs() {
    setLoading(true);
    try {
      const result = await window.baysideAPI.listAzureBlobs(1);
      setBlobs(result.assets);
      setHasMore(result.hasMore);
      setNextPage(result.nextPage);
    } catch (err) {
      console.error('Failed to load Azure blobs:', err);
    } finally {
      setLoading(false);
    }
  }

  const loadMoreRef = useRef<() => void>(undefined);

  async function loadMore() {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    setLoadingMore(true);
    try {
      const result = await window.baysideAPI.listAzureBlobs(nextPage);
      setBlobs((prev) => [...prev, ...result.assets]);
      setHasMore(result.hasMore);
      setNextPage(result.nextPage);
    } catch (err) {
      console.error('Failed to load more Azure blobs:', err);
    } finally {
      setLoadingMore(false);
    }
  }

  loadMoreRef.current = loadMore;

  useEffect(() => {
    const node = scrollContainerRef.current;
    if (!node) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = node;
      if (scrollHeight - scrollTop - clientHeight < 100) {
        loadMoreRef.current?.();
      }
    };
    node.addEventListener('scroll', handleScroll);
    return () => node.removeEventListener('scroll', handleScroll);
  }, []);

  async function handleResend(blobName: string) {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email');
      return;
    }
    setError(null);
    setSending(blobName);
    setSent(null);
    try {
      await window.baysideAPI.resendAzureDownload(blobName, email.trim());
      setSent(blobName);
    } catch (err) {
      setError(`Failed: ${err instanceof Error ? err.message : err}`);
    } finally {
      setSending(null);
    }
  }

  function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-surface-border border-t-accent rounded-full animate-spin" />
          </div>
        ) : blobs.length === 0 ? (
          <div className="py-12 text-center px-4">
            <p className="text-text-secondary text-sm">No videos found</p>
          </div>
        ) : (
          blobs.map((blob) => {
            const isActive = blob.name === selectedName;
            return (
              <button
                key={blob.name}
                onClick={async () => {
                  if (isActive) {
                    setSelectedName(null);
                    setPreviewUrl(null);
                  } else {
                    setEmail(blob.email ?? '');
                    setSelectedName(blob.name);
                    setPreviewUrl(null);
                    setLoadingPreview(true);
                    try {
                      const url = await window.baysideAPI.getAzurePreviewUrl(blob.name);
                      setPreviewUrl(url);
                    } catch {
                      setPreviewUrl(null);
                    } finally {
                      setLoadingPreview(false);
                    }
                  }
                  setError(null);
                  setSent(null);
                }}
                className={`
                  w-full text-left px-5 py-3 border-b border-white/[0.04] transition-colors cursor-pointer
                  ${isActive ? 'bg-accent-muted' : 'hover:bg-white/[0.03]'}
                `}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <p className={`text-sm font-semibold truncate ${isActive ? 'text-accent' : 'text-text-primary'}`}>
                    {formatDate(blob.uploadedAt)}
                  </p>
                  <span className="text-[10px] text-text-tertiary ml-2 flex-shrink-0">
                    {formatSize(blob.size)}
                  </span>
                </div>
                {blob.email && (
                  <p className="text-[11px] text-text-tertiary mt-0.5 truncate">{blob.email}</p>
                )}

                {isActive && (
                  <div
                    className="mt-3 pt-3 border-t border-white/[0.06]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Video preview */}
                    {loadingPreview ? (
                      <div className="flex items-center justify-center py-6 mb-3">
                        <div className="w-5 h-5 border-2 border-surface-border border-t-accent rounded-full animate-spin" />
                      </div>
                    ) : previewUrl ? (
                      <video
                        src={previewUrl}
                        controls
                        className="w-full rounded-lg mb-3"
                        style={{ maxHeight: '200px' }}
                      />
                    ) : null}

                    <p className="text-xs text-text-tertiary mb-2">Re-send download link</p>
                    <div className="flex gap-1.5">
                      <input
                        type="email"
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleResend(blob.name)}
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-base text-text-primary text-xs placeholder:text-text-tertiary outline-none shadow-[0_0_0_1px_rgba(255,255,255,0.08)] focus:shadow-[0_0_0_1px_rgba(129,140,248,0.5)] transition-shadow"
                      />
                      <button
                        onClick={() => handleResend(blob.name)}
                        disabled={sending !== null}
                        className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-accent hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
                      >
                        {sending === blob.name ? '...' : 'Send'}
                      </button>
                    </div>
                    {error && <p className="text-red-400 text-[11px] mt-2">{error}</p>}
                    {sent === blob.name && (
                      <p className="text-success text-[11px] mt-2">Sent!</p>
                    )}
                  </div>
                )}
              </button>
            );
          })
        )}
        {loadingMore && (
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-surface-border border-t-accent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-white/[0.06]">
        <button
          onClick={loadBlobs}
          disabled={loading}
          className="w-full py-2 text-xs text-accent hover:text-accent-hover font-medium transition-colors cursor-pointer disabled:opacity-40"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}

// --- Admin panel with PIN gate ---

function AdminPanel() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinSaved, setPinSaved] = useState(false);
  const [storageDir, setStorageDir] = useState('');
  const [autoDelete, setAutoDelete] = useState(true);
  const [svcSettings, setSvcSettings] = useState<AdminSettings | null>(null);
  const [svcSaved, setSvcSaved] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authenticated) {
      window.baysideAPI.getStorageDir().then(setStorageDir);
      window.baysideAPI.getAutoDelete().then(setAutoDelete);
      window.baysideAPI.getAdminSettings().then(setSvcSettings);
    } else {
      setTimeout(() => pinInputRef.current?.focus(), 100);
    }
  }, [authenticated]);

  async function handlePinChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    setPin(digits);
    setPinError(false);
    if (digits.length === 4) {
      const valid = await window.baysideAPI.verifyAdminPin(digits);
      if (valid) {
        setAuthenticated(true);
        setPinError(false);
      } else {
        setPinError(true);
        setPin('');
        setTimeout(() => pinInputRef.current?.focus(), 50);
      }
    }
  }

  async function handleSavePin() {
    if (newPin.length !== 4) return;
    await window.baysideAPI.setAdminPin(newPin);
    setNewPin('');
    setPinSaved(true);
    setTimeout(() => setPinSaved(false), 2000);
  }

  async function handleBrowseStorage() {
    const chosen = await window.baysideAPI.browseStorageDir();
    if (chosen) setStorageDir(chosen);
  }

  async function handleToggleAutoDelete() {
    const next = !autoDelete;
    await window.baysideAPI.setAutoDelete(next);
    setAutoDelete(next);
  }

  function updateSvc(key: keyof AdminSettings, value: string | number) {
    setSvcSettings((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  async function handleSaveSvcSettings() {
    if (!svcSettings) return;
    await window.baysideAPI.setAdminSettings(svcSettings);
    setSvcSaved(true);
    setTimeout(() => setSvcSaved(false), 2000);
  }

  if (!authenticated) {
    return (
      <div className="p-4 flex flex-col items-center pt-12">
        <div className="w-12 h-12 rounded-full bg-surface-overlay flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <p className="text-text-primary text-sm font-semibold mb-1">Admin Access</p>
        <p className="text-text-tertiary text-xs mb-6">Enter PIN to continue</p>
        <input
          ref={pinInputRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={pin}
          onChange={(e) => handlePinChange(e.target.value)}
          placeholder="----"
          className="w-36 px-3 py-2.5 rounded-lg bg-surface-base text-text-primary text-lg text-center tracking-[0.5em] placeholder:text-text-tertiary placeholder:tracking-[0.5em] outline-none shadow-[0_0_0_1px_rgba(255,255,255,0.08)] focus:shadow-[0_0_0_1px_rgba(129,140,248,0.5)] transition-shadow"
        />
        {pinError && (
          <p className="text-red-400 text-xs mt-3">Incorrect PIN</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Change PIN */}
      <div className="px-3.5 py-3 rounded-xl bg-surface-overlay shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
        <p className="text-sm font-semibold text-text-primary mb-0.5">Change PIN</p>
        <p className="text-xs text-text-tertiary mb-3">Set a new admin PIN code</p>
        <div className="flex gap-1.5">
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onKeyDown={(e) => e.key === 'Enter' && handleSavePin()}
            placeholder="4-digit PIN"
            className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-base text-text-primary text-xs placeholder:text-text-tertiary outline-none shadow-[0_0_0_1px_rgba(255,255,255,0.08)] focus:shadow-[0_0_0_1px_rgba(129,140,248,0.5)] transition-shadow"
          />
          <button
            onClick={handleSavePin}
            disabled={newPin.length !== 4}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-accent hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
          >
            Save
          </button>
        </div>
        {pinSaved && (
          <p className="text-success text-[11px] mt-2">PIN updated!</p>
        )}
      </div>

      {/* Storage Folder */}
      <div className="px-3.5 py-3 rounded-xl bg-surface-overlay shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
        <p className="text-sm font-semibold text-text-primary mb-0.5">Storage Folder</p>
        <p className="text-xs text-text-tertiary mb-3">Where local recordings are saved</p>
        <div className="flex gap-1.5">
          <div className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-base text-text-secondary text-xs truncate shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
            {storageDir}
          </div>
          <button
            onClick={handleBrowseStorage}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-accent hover:bg-accent-hover transition-colors cursor-pointer flex-shrink-0"
          >
            Browse
          </button>
        </div>
      </div>

      {/* Auto-Delete toggle */}
      <div className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-surface-overlay shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
        <div>
          <p className="text-sm font-semibold text-text-primary">Auto-Delete on Upload</p>
          <p className="text-xs text-text-tertiary mt-0.5">Remove local file after uploading</p>
        </div>
        <button
          onClick={handleToggleAutoDelete}
          className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
            autoDelete ? 'bg-accent' : 'bg-surface-base'
          }`}
        >
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            autoDelete ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      {/* Service Credentials */}
      {svcSettings && (
        <div className="px-3.5 py-3 rounded-xl bg-surface-overlay shadow-[0_0_0_1px_rgba(255,255,255,0.06)] space-y-3">
          <div>
            <p className="text-sm font-semibold text-text-primary mb-0.5">Service Settings</p>
            <p className="text-xs text-text-tertiary mb-3">API keys and configuration</p>
          </div>

          <AdminField label="Mailgun API Key" value={svcSettings.mailgunApiKey} onChange={(v) => updateSvc('mailgunApiKey', v)} secret />
          <AdminField label="Mailgun Domain" value={svcSettings.mailgunDomain} onChange={(v) => updateSvc('mailgunDomain', v)} placeholder="mailgun.yourdomain.com" />
          <AdminField label="Email From Name" value={svcSettings.emailFromName} onChange={(v) => updateSvc('emailFromName', v)} placeholder="Bayside Video Studio" />
          <AdminField label="Email From Address" value={svcSettings.emailFromAddress} onChange={(v) => updateSvc('emailFromAddress', v)} placeholder="video@yourdomain.com" />
          <AdminField label="Max Recording (sec)" value={String(svcSettings.maxRecordingSeconds)} onChange={(v) => updateSvc('maxRecordingSeconds', parseInt(v, 10) || 120)} type="number" />
          <AdminField label="Idle Timeout (sec)" value={String(svcSettings.idleTimeoutSeconds)} onChange={(v) => updateSvc('idleTimeoutSeconds', parseInt(v, 10) || 120)} type="number" />
          <AdminField label="Azure Blob Connection String" value={svcSettings.azureBlobConnectionString} onChange={(v) => updateSvc('azureBlobConnectionString', v)} secret />
          <AdminField label="Azure Blob Container Name" value={svcSettings.azureBlobContainerName} onChange={(v) => updateSvc('azureBlobContainerName', v)} placeholder="videos" />

          <button
            onClick={handleSaveSvcSettings}
            className="w-full py-2 rounded-lg text-xs font-semibold text-white bg-accent hover:bg-accent-hover transition-colors cursor-pointer"
          >
            Save Settings
          </button>
          {svcSaved && (
            <p className="text-success text-[11px] text-center">Settings saved!</p>
          )}
        </div>
      )}
    </div>
  );
}

function AdminField({ label, value, onChange, secret, placeholder, type = 'text' }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  secret?: boolean;
  placeholder?: string;
  type?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="text-[11px] font-medium text-text-tertiary mb-1 block">{label}</label>
      <div className="flex gap-1">
        <input
          type={secret && !visible ? 'password' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-surface-base text-text-primary text-xs placeholder:text-text-tertiary outline-none shadow-[0_0_0_1px_rgba(255,255,255,0.08)] focus:shadow-[0_0_0_1px_rgba(129,140,248,0.5)] transition-shadow"
        />
        {secret && (
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="px-2 py-1.5 rounded-lg text-[10px] text-text-tertiary hover:text-text-secondary bg-surface-base shadow-[0_0_0_1px_rgba(255,255,255,0.08)] transition-colors cursor-pointer"
          >
            {visible ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
    </div>
  );
}

// --- Guides panel ---

function GuidesPanel() {
  const guides = useSessionStore((s) => s.guides);
  const setStoreGuides = useSessionStore((s) => s.setGuides);

  async function handleToggle(key: keyof GuideSettings) {
    const updated = { ...guides, [key]: !guides[key] };
    setStoreGuides(updated);
    await window.baysideAPI.setGuides(updated);
  }

  return (
    <div className="p-4 space-y-3">
      <GuideToggle
        label="Rule of Thirds"
        description="3x3 grid overlay"
        enabled={guides.ruleOfThirds}
        onToggle={() => handleToggle('ruleOfThirds')}
      />
      <GuideToggle
        label="Center Crosshair"
        description="Center point marker"
        enabled={guides.centerCrosshair}
        onToggle={() => handleToggle('centerCrosshair')}
      />
      <GuideToggle
        label="Safe Zones"
        description="Title & action safe areas"
        enabled={guides.safeZones}
        onToggle={() => handleToggle('safeZones')}
      />
    </div>
  );
}

// --- Guide toggle ---

function GuideToggle({ label, description, enabled, onToggle }: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-text-primary">{label}</p>
        <p className="text-[11px] text-text-tertiary">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
          enabled ? 'bg-accent' : 'bg-surface-base'
        }`}
      >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
        }`} />
      </button>
    </div>
  );
}

// --- Shared device button ---

function DeviceButton({
  name,
  subtitle,
  selected,
  onClick,
  icon,
}: {
  name: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all cursor-pointer
        ${selected
          ? 'bg-accent-muted shadow-[0_0_0_1px_rgba(129,140,248,0.4)]'
          : 'bg-surface-overlay shadow-[0_0_0_1px_rgba(255,255,255,0.06)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.12)]'
        }
      `}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        selected ? 'bg-accent/20' : 'bg-surface-base'
      }`}>
        <svg className={`w-4 h-4 ${selected ? 'text-accent' : 'text-text-secondary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          {icon}
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${selected ? 'text-accent' : 'text-text-primary'}`}>
          {name}
        </p>
        <p className="text-xs text-text-tertiary mt-0.5">{subtitle}</p>
      </div>
      {selected && (
        <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
      )}
    </button>
  );
}
