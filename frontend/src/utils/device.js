/**
 * Device identification & fingerprinting utility.
 * Persists a unique device identifier across browser sessions via localStorage and cookies,
 * preventing multiple student accounts from recording proxy attendance on the same device.
 */

const STORAGE_KEY = 'campus_student_device_id';
const COOKIE_NAME = 'campus_student_device_id';

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

function setCookie(name, value, days = 365) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Generate a consistent pseudo-random UUID
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Compute a basic hardware/browser fingerprint hash
 */
function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'nocanvas';
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(10, 5, 60, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('CampusAttend', 12, 22);
    return canvas.toDataURL().slice(-32);
  } catch {
    return 'canvaserr';
  }
}

/**
 * Get or initialize persistent Device ID
 */
export function getOrCreateDeviceId() {
  if (typeof window === 'undefined') return 'server_render';

  // 1. Try reading from localStorage
  let id = null;
  try {
    id = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors (e.g. private mode)
  }

  // 2. Fall back to Cookie if localStorage was cleared
  if (!id) {
    id = getCookie(COOKIE_NAME);
  }

  // 3. Generate a new persistent Device ID if missing
  if (!id) {
    const baseUUID = generateUUID();
    const fp = getCanvasFingerprint();
    id = `dev_${baseUUID.slice(0, 18)}_${fp.slice(0, 8)}`;
  }

  // Persist across both mechanisms
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Ignore
  }
  setCookie(COOKIE_NAME, id);

  return id;
}

/**
 * Extract human-readable device/browser summary
 */
export function getDeviceSummary() {
  if (typeof navigator === 'undefined') return 'Web Browser';

  const ua = navigator.userAgent || '';
  let os = 'Unknown OS';
  if (/iPhone|iPad|iPod/i.test(ua)) os = 'Apple iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/Chrome|CriOS/i.test(ua) && !/Edge|Edg|OPR/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) browser = 'Safari';
  else if (/Firefox|FxiOS/i.test(ua)) browser = 'Firefox';
  else if (/Edg/i.test(ua)) browser = 'Edge';

  const screenInfo = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '';
  return `${browser} on ${os}${screenInfo ? ` (${screenInfo})` : ''}`;
}
