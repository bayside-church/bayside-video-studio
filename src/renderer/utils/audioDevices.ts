/**
 * Given an avfoundation device ID (e.g. "avfoundation:0"), find the matching
 * Web Audio device and return getUserMedia constraints for it.
 */
export async function matchAudioDevice(avfDeviceId: string): Promise<MediaStreamConstraints> {
  const selectedAudio = await window.baysideAPI.getSelectedAudioDevice();
  if (!selectedAudio) return { audio: true };

  const devices = await navigator.mediaDevices.enumerateDevices();
  const audioInputs = devices.filter((d) => d.kind === 'audioinput');

  const match = audioInputs.find((d) =>
    d.label.toLowerCase().includes(selectedAudio.name.toLowerCase()) ||
    selectedAudio.name.toLowerCase().includes(d.label.toLowerCase())
  );

  return match
    ? { audio: { deviceId: { exact: match.deviceId } } }
    : { audio: true };
}

/**
 * Probe whether an audio device can actually be opened.
 * Returns true if getUserMedia succeeds, false otherwise.
 */
export async function probeAudioDevice(deviceName: string): Promise<boolean> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((d) => d.kind === 'audioinput');

    const match = audioInputs.find((d) =>
      d.label.toLowerCase().includes(deviceName.toLowerCase()) ||
      deviceName.toLowerCase().includes(d.label.toLowerCase())
    );

    const constraints: MediaStreamConstraints = match
      ? { audio: { deviceId: { exact: match.deviceId } } }
      : { audio: true };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}
