import { useEffect, useState } from 'react';
import { matchAudioDevice } from '../utils/audioDevices';

/**
 * Opens a Web Audio monitor stream for the given audio device
 * and returns the current RMS level (0-1) at ~60fps.
 *
 * This is purely for metering — the actual recording audio goes through FFmpeg.
 * Passing null deviceId disables monitoring.
 */
export function useAudioLevel(deviceId: string | null): number {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!deviceId) {
      console.log('[AudioMeter] No deviceId, skipping');
      setLevel(0);
      return;
    }

    console.log(`[AudioMeter] Starting monitor for deviceId=${deviceId}`);
    let cancelled = false;
    let animFrame: number;
    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let logCounter = 0;

    (async () => {
      try {
        const constraints = await matchAudioDevice(deviceId);
        console.log('[AudioMeter] getUserMedia constraints:', JSON.stringify(constraints));
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        const tracks = stream.getAudioTracks();
        console.log(`[AudioMeter] Got stream with ${tracks.length} audio track(s)`);
        tracks.forEach((t) => {
          console.log(`[AudioMeter]   Track: label="${t.label}" enabled=${t.enabled} muted=${t.muted} readyState=${t.readyState}`);
          const settings = t.getSettings();
          console.log(`[AudioMeter]   Settings: sampleRate=${settings.sampleRate} channelCount=${settings.channelCount} deviceId=${settings.deviceId}`);
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        audioCtx = new AudioContext();
        console.log(`[AudioMeter] AudioContext state=${audioCtx.state} sampleRate=${audioCtx.sampleRate}`);
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Float32Array(analyser.fftSize);

        const tick = () => {
          if (cancelled) return;
          analyser.getFloatTimeDomainData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const scaled = Math.min(1, rms * 3);
          setLevel(scaled);

          // Log levels periodically (every ~2 seconds at 60fps)
          logCounter++;
          if (logCounter % 120 === 1) {
            console.log(`[AudioMeter] rms=${rms.toFixed(6)} scaled=${scaled.toFixed(4)} ctx.state=${audioCtx?.state}`);
          }

          animFrame = requestAnimationFrame(tick);
        };

        tick();
      } catch (err) {
        console.warn('[AudioMeter] Failed to open audio monitor:', err);
        setLevel(0);
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrame);
      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close().catch(() => {});
      setLevel(0);
    };
  }, [deviceId]);

  return level;
}
