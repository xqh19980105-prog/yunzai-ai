/**
 * Enhanced Browser Fingerprint
 * Collects multiple browser/device characteristics to create a unique fingerprint
 * This is more reliable than IP-based identification for preventing account sharing
 */

export interface BrowserFingerprint {
  userAgent: string;
  language: string;
  languages: string[];
  platform: string;
  screenResolution: string;
  timezone: string;
  timezoneOffset: number;
  cookieEnabled: boolean;
  doNotTrack: string | null;
  hardwareConcurrency: number;
  deviceMemory: number | undefined;
  colorDepth: number;
  pixelRatio: number;
  canvasFingerprint: string;
  webglFingerprint: string;
}

/**
 * Generate Canvas fingerprint (hardware-based, very reliable)
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';

    // Draw text with specific font and style
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Browser fingerprint 🎯', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Browser fingerprint 🎯', 4, 17);

    return canvas.toDataURL();
  } catch (e) {
    return 'canvas-error';
  }
}

/**
 * Generate WebGL fingerprint (GPU-based, very reliable)
 */
function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
    if (!gl) return 'no-webgl';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      return `${vendor}|${renderer}`;
    }

    return 'no-debug-info';
  } catch (e) {
    return 'webgl-error';
  }
}

/**
 * Collect comprehensive browser fingerprint
 */
export function collectBrowserFingerprint(): BrowserFingerprint {
  const nav = navigator;
  const screen = window.screen;

  return {
    userAgent: nav.userAgent,
    language: nav.language,
    languages: Array.from(nav.languages || []),
    platform: nav.platform,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    cookieEnabled: nav.cookieEnabled,
    doNotTrack: nav.doNotTrack || null,
    hardwareConcurrency: nav.hardwareConcurrency || 0,
    deviceMemory: (nav as any).deviceMemory,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio || 1,
    canvasFingerprint: getCanvasFingerprint(),
    webglFingerprint: getWebGLFingerprint(),
  };
}

/**
 * Generate a stable fingerprint hash from browser characteristics
 * This creates a unique identifier that persists across IP changes
 */
export function generateFingerprintHash(): string {
  const fingerprint = collectBrowserFingerprint();
  
  // Create a stable string from key characteristics
  // Exclude IP and include hardware/software features
  const fingerprintString = [
    fingerprint.userAgent,
    fingerprint.platform,
    fingerprint.screenResolution,
    fingerprint.timezone,
    fingerprint.timezoneOffset,
    fingerprint.hardwareConcurrency,
    fingerprint.deviceMemory,
    fingerprint.colorDepth,
    fingerprint.pixelRatio,
    fingerprint.canvasFingerprint.substring(0, 100), // First 100 chars of canvas
    fingerprint.webglFingerprint,
    fingerprint.languages.join(','),
  ].join('|');

  // Hash it (this will be done on backend, but we can also do a simple hash here)
  return btoa(fingerprintString).substring(0, 128);
}
