import { app, safeStorage } from 'electron';
import path from 'path';
import fs from 'fs';
import type { VideoDevice, AudioDevice } from '../shared/types';

const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');

export interface GuideSettings {
  ruleOfThirds: boolean;
  centerCrosshair: boolean;
  safeZones: boolean;
}

const DEFAULT_GUIDES: GuideSettings = { ruleOfThirds: true, centerCrosshair: true, safeZones: false };

export const DEFAULT_STORAGE_DIR = path.join(app.getPath('documents'), 'Self Serve Videos');

// --- Encryption helpers ---
// Secrets are stored as base64-encoded encrypted blobs via Electron safeStorage.
// Falls back to plaintext if safeStorage is unavailable (e.g. CI/test environments).

function encrypt(plaintext: string): string {
  if (!plaintext) return '';
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(plaintext).toString('base64');
    }
  } catch {
    // Fall through to plaintext
  }
  return plaintext;
}

function decrypt(stored: string): string {
  if (!stored) return '';
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(stored, 'base64'));
    }
  } catch {
    // Stored value may be plaintext from before encryption was enabled, return as-is
  }
  return stored;
}

// Fields stored encrypted on disk
const SECRET_FIELDS = new Set(['adminPin', 'mailgunApiKey', 'azureBlobConnectionString']);

interface Settings {
  selectedDevice: VideoDevice | null;
  selectedAudioDevice: AudioDevice | null;
  adminPin: string;
  guides: GuideSettings;
  storageDir: string;
  autoDeleteOnUpload: boolean;
  mailgunApiKey: string;
  mailgunDomain: string;
  emailFromName: string;
  emailFromAddress: string;
  maxRecordingSeconds: number;
  idleTimeoutSeconds: number;
  azureBlobConnectionString: string;
  azureBlobContainerName: string;
}

function getDefaults(): Settings {
  return {
    selectedDevice: null,
    selectedAudioDevice: null,
    adminPin: '1234',
    guides: DEFAULT_GUIDES,
    storageDir: DEFAULT_STORAGE_DIR,
    autoDeleteOnUpload: true,
    mailgunApiKey: '',
    mailgunDomain: '',
    emailFromName: '',
    emailFromAddress: '',
    maxRecordingSeconds: 0,
    idleTimeoutSeconds: 0,
    azureBlobConnectionString: '',
    azureBlobContainerName: '',
  };
}

function readSettings(): Settings {
  const defaults = getDefaults();
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const raw = { ...defaults, ...JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8')) };
      // Decrypt secret fields
      for (const field of SECRET_FIELDS) {
        if (raw[field]) {
          raw[field] = decrypt(raw[field]);
        }
      }
      return raw;
    }
  } catch {
    // Corrupt file, reset
  }
  return defaults;
}

function writeSettings(settings: Settings): void {
  // Clone and encrypt secret fields before writing to disk
  const toWrite = { ...settings } as Record<string, unknown>;
  for (const field of SECRET_FIELDS) {
    const val = toWrite[field];
    if (typeof val === 'string' && val) {
      toWrite[field] = encrypt(val);
    }
  }
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(toWrite, null, 2));
}

export function getSelectedDevice(): VideoDevice | null {
  return readSettings().selectedDevice;
}

export function setSelectedDevice(device: VideoDevice): void {
  const settings = readSettings();
  settings.selectedDevice = device;
  writeSettings(settings);
}

export function getSelectedAudioDevice(): AudioDevice | null {
  return readSettings().selectedAudioDevice ?? null;
}

export function setSelectedAudioDevice(device: AudioDevice | null): void {
  const settings = readSettings();
  settings.selectedAudioDevice = device;
  writeSettings(settings);
}

export function getAdminPin(): string {
  return readSettings().adminPin ?? '1234';
}

export function setAdminPin(pin: string): void {
  const settings = readSettings();
  settings.adminPin = pin;
  writeSettings(settings);
}

export function getGuides(): GuideSettings {
  return { ...DEFAULT_GUIDES, ...readSettings().guides };
}

export function setGuides(guides: GuideSettings): void {
  const settings = readSettings();
  settings.guides = guides;
  writeSettings(settings);
}

export function getStorageDir(): string {
  return readSettings().storageDir ?? DEFAULT_STORAGE_DIR;
}

export function setStorageDir(dir: string): void {
  const settings = readSettings();
  settings.storageDir = dir;
  writeSettings(settings);
}

export function getAutoDeleteOnUpload(): boolean {
  const val = readSettings().autoDeleteOnUpload;
  return val ?? true;
}

export function setAutoDeleteOnUpload(enabled: boolean): void {
  const settings = readSettings();
  settings.autoDeleteOnUpload = enabled;
  writeSettings(settings);
}

// --- Service credentials ---

export function getMailgunApiKey(): string {
  return readSettings().mailgunApiKey ?? '';
}

export function setMailgunApiKey(value: string): void {
  const settings = readSettings();
  settings.mailgunApiKey = value;
  writeSettings(settings);
}

export function getMailgunDomain(): string {
  return readSettings().mailgunDomain ?? '';
}

export function setMailgunDomain(value: string): void {
  const settings = readSettings();
  settings.mailgunDomain = value;
  writeSettings(settings);
}

export function getEmailFromName(): string {
  return readSettings().emailFromName ?? '';
}

export function setEmailFromName(value: string): void {
  const settings = readSettings();
  settings.emailFromName = value;
  writeSettings(settings);
}

export function getEmailFromAddress(): string {
  return readSettings().emailFromAddress ?? '';
}

export function setEmailFromAddress(value: string): void {
  const settings = readSettings();
  settings.emailFromAddress = value;
  writeSettings(settings);
}

export function getEmailFrom(): string {
  const name = getEmailFromName();
  const address = getEmailFromAddress();
  if (name && address) return `${name} <${address}>`;
  return address;
}

export function getMaxRecordingSeconds(): number {
  return readSettings().maxRecordingSeconds ?? 0;
}

export function setMaxRecordingSeconds(value: number): void {
  const settings = readSettings();
  settings.maxRecordingSeconds = value;
  writeSettings(settings);
}

export function getIdleTimeoutSeconds(): number {
  return readSettings().idleTimeoutSeconds ?? 0;
}

export function setIdleTimeoutSeconds(value: number): void {
  const settings = readSettings();
  settings.idleTimeoutSeconds = value;
  writeSettings(settings);
}

// --- Azure Blob Storage ---

export function getAzureBlobConnectionString(): string {
  return readSettings().azureBlobConnectionString ?? '';
}

export function setAzureBlobConnectionString(value: string): void {
  const settings = readSettings();
  settings.azureBlobConnectionString = value;
  writeSettings(settings);
}

export function getAzureBlobContainerName(): string {
  return readSettings().azureBlobContainerName ?? '';
}

export function setAzureBlobContainerName(value: string): void {
  const settings = readSettings();
  settings.azureBlobContainerName = value;
  writeSettings(settings);
}

// --- Configuration validation ---

export function getMissingRequiredSettings(): string[] {
  const missing: string[] = [];
  if (!getMailgunApiKey()) missing.push('Mailgun API Key');
  if (!getMailgunDomain()) missing.push('Mailgun Domain');
  if (!getEmailFromAddress()) missing.push('Email From Address');
  if (!getMaxRecordingSeconds()) missing.push('Max Recording Duration');
  if (!getIdleTimeoutSeconds()) missing.push('Idle Timeout');
  if (!getAzureBlobConnectionString()) missing.push('Azure Blob Connection String');
  if (!getAzureBlobContainerName()) missing.push('Azure Blob Container Name');
  return missing;
}
