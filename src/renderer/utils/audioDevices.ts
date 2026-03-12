/**
 * Given an avfoundation device ID (e.g. "avfoundation:0"), find the matching
 * Web Audio device and return getUserMedia constraints for it.
 */
export async function matchAudioDevice(avfDeviceId: string): Promise<MediaStreamConstraints> {
  const selectedAudio = await window.baysideAPI.getSelectedAudioDevice();
  if (!selectedAudio) return { audio: true };

  // Ensure labels are populated — enumerateDevices() returns empty labels
  // without a prior getUserMedia grant, causing wrong-device matching.
  const preCheck = await navigator.mediaDevices.enumerateDevices();
  const hasLabels = preCheck.some((d) => d.kind === 'audioinput' && d.label);

  if (!hasLabels) {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tempStream.getTracks().forEach((t) => t.stop());
    } catch {
      return { audio: true };
    }
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  const audioInputs = devices.filter((d) => d.kind === 'audioinput');

  const match = audioInputs.find((d) =>
    d.label.toLowerCase().includes(selectedAudio.name.toLowerCase()) ||
    selectedAudio.name.toLowerCase().includes(d.label.toLowerCase())
  );

  if (match) {
    console.log(`[AudioMatch] Matched "${selectedAudio.name}" → "${match.label}" (${match.deviceId})`);
  } else {
    console.warn(`[AudioMatch] No browser device matching "${selectedAudio.name}". Available:`, audioInputs.map((d) => d.label));
  }

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
    // Get a temp stream first to populate device labels
    const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const devices = await navigator.mediaDevices.enumerateDevices();
    tempStream.getTracks().forEach((t) => t.stop());

    const audioInputs = devices.filter((d) => d.kind === 'audioinput');

    const match = audioInputs.find((d) =>
      d.label.toLowerCase().includes(deviceName.toLowerCase()) ||
      deviceName.toLowerCase().includes(d.label.toLowerCase())
    );

    if (!match) return false;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: { exact: match.deviceId } },
    });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}
