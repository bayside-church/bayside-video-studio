/**
 * Browser-based capture using getUserMedia + MediaRecorder.
 * Module-level state (not React hooks) to avoid putting MediaStream in Zustand.
 */

let stream: MediaStream | null = null;
let recorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
let recordingStartTime = 0;

// Audio-only recording state (used for DeckLink video + external mic)
let audioOnlyStream: MediaStream | null = null;
let audioOnlyRecorder: MediaRecorder | null = null;
let audioOnlyChunks: Blob[] = [];

export function getStream(): MediaStream | null {
  return stream;
}

export async function startPreview(
  videoDeviceId: string,
  audioDeviceId?: string
): Promise<MediaStream> {
  // Stop any existing stream
  stopPreview();

  // Strip the "browser:" prefix to get the raw device ID
  const rawVideoId = videoDeviceId.replace(/^browser:/, '');

  const constraints: MediaStreamConstraints = {
    video: {
      deviceId: { exact: rawVideoId },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : false,
  };

  stream = await navigator.mediaDevices.getUserMedia(constraints);
  return stream;
}

export function startRecording(): void {
  if (!stream) throw new Error('No browser capture stream active');

  const audioTracks = stream.getAudioTracks();
  const videoTracks = stream.getVideoTracks();
  console.log(`[BrowserCapture] Starting recording — video tracks: ${videoTracks.length}, audio tracks: ${audioTracks.length}`);
  audioTracks.forEach((t) => console.log(`[BrowserCapture]   Audio track: "${t.label}" enabled=${t.enabled} muted=${t.muted} readyState=${t.readyState}`));

  chunks = [];
  recordingStartTime = Date.now();

  // Prefer MP4 (Chromium 132+), fall back to WebM
  const mimeType = MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.42E01E, mp4a.40.2"')
    ? 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
    : MediaRecorder.isTypeSupported('video/mp4')
      ? 'video/mp4'
      : 'video/webm; codecs=vp9,opus';

  console.log(`[BrowserCapture] Using mimeType: ${mimeType}`);
  recorder = new MediaRecorder(stream, { mimeType });
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start(1000); // collect data every second
}

export async function stopRecording(): Promise<{ blob: Blob; durationSeconds: number }> {
  return new Promise((resolve, reject) => {
    if (!recorder || recorder.state === 'inactive') {
      reject(new Error('No active browser recording'));
      return;
    }

    recorder.onstop = () => {
      const durationSeconds = (Date.now() - recordingStartTime) / 1000;
      const mimeType = recorder!.mimeType;
      const blob = new Blob(chunks, { type: mimeType });
      chunks = [];
      recorder = null;
      resolve({ blob, durationSeconds });
    };

    recorder.onerror = (e) => {
      recorder = null;
      chunks = [];
      reject(e);
    };

    recorder.stop();
  });
}

/**
 * Start audio-only recording from a specific device (for DeckLink video + external mic).
 * Matches the avfoundation device name to a browser audio device.
 */
export async function startAudioOnlyRecording(deviceName: string): Promise<void> {
  stopAudioOnlyRecording();

  // Enumerate browser audio devices and find one matching by name
  let tempStream: MediaStream | null = null;
  try {
    tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    throw new Error('No audio permission');
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  tempStream.getTracks().forEach((t) => t.stop());

  const audioInputs = devices.filter((d) => d.kind === 'audioinput');
  const nameLower = deviceName.toLowerCase();
  const match = audioInputs.find((d) => {
    const label = d.label.toLowerCase();
    return label.includes(nameLower) || nameLower.includes(label);
  });

  if (!match) {
    console.warn(`[AudioOnly] No browser audio device matching "${deviceName}". Available:`, audioInputs.map((d) => d.label));
    throw new Error(`No browser audio device matching "${deviceName}"`);
  }

  console.log(`[AudioOnly] Matched "${deviceName}" → browser device "${match.label}" (${match.deviceId})`);

  audioOnlyStream = await navigator.mediaDevices.getUserMedia({
    audio: { deviceId: { exact: match.deviceId } },
  });

  audioOnlyChunks = [];

  // Use audio-only mime type
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm';

  console.log(`[AudioOnly] Starting recording, mimeType: ${mimeType}`);
  audioOnlyRecorder = new MediaRecorder(audioOnlyStream, { mimeType });
  audioOnlyRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) audioOnlyChunks.push(e.data);
  };
  audioOnlyRecorder.start(1000);
}

export async function stopAudioOnlyRecording(): Promise<Blob | null> {
  if (!audioOnlyRecorder || audioOnlyRecorder.state === 'inactive') {
    if (audioOnlyStream) {
      audioOnlyStream.getTracks().forEach((t) => t.stop());
      audioOnlyStream = null;
    }
    return null;
  }

  return new Promise((resolve) => {
    audioOnlyRecorder!.onstop = () => {
      const mimeType = audioOnlyRecorder!.mimeType;
      const blob = new Blob(audioOnlyChunks, { type: mimeType });
      console.log(`[AudioOnly] Stopped recording, blob size: ${blob.size} bytes`);
      audioOnlyChunks = [];
      audioOnlyRecorder = null;
      if (audioOnlyStream) {
        audioOnlyStream.getTracks().forEach((t) => t.stop());
        audioOnlyStream = null;
      }
      resolve(blob);
    };
    audioOnlyRecorder!.stop();
  });
}

export function isAudioOnlyRecording(): boolean {
  return audioOnlyRecorder !== null && audioOnlyRecorder.state === 'recording';
}



export function stopPreview(): void {
  if (recorder && recorder.state !== 'inactive') {
    try { recorder.stop(); } catch { /* ignore */ }
    recorder = null;
    chunks = [];
  }
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
}
