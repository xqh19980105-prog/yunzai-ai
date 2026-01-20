import { Request } from 'express';
import * as crypto from 'crypto';

/**
 * Generate device fingerprint from request headers and optional browser fingerprint
 * 
 * Priority for preventing account sharing:
 * 1. Browser fingerprint (hardware-based) - MOST RELIABLE
 * 2. User Agent + Screen/Platform info - RELIABLE
 * 3. IP address - LEAST RELIABLE (only as fallback)
 * 
 * Why hardware fingerprint is key:
 * - IP changes frequently (VPN, mobile network, router restart)
 * - Same network = same IP (family/office sharing)
 * - Hardware fingerprint persists across IP changes
 * - Canvas/WebGL fingerprint = GPU/hardware characteristics
 */
export function getDeviceFingerprint(
  req: Request,
  browserFingerprint?: string,
): string {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const platform = req.headers['sec-ch-ua-platform'] || '';
  const screen = req.headers['sec-ch-ua-viewport-width'] || '';
  
  // Priority 1: Use browser fingerprint if provided (hardware-based, most reliable)
  if (browserFingerprint && browserFingerprint.length > 20) {
    // Combine browser fingerprint with User Agent for additional uniqueness
    const fingerprint = `${browserFingerprint}:${userAgent}:${platform}`;
    return crypto.createHash('sha256').update(fingerprint).digest('hex');
  }

  // Priority 2: Enhanced fingerprint with platform and screen info (more reliable than IP)
  // Note: IP is intentionally excluded here as it's unreliable for device identification
  const fingerprint = `${userAgent}:${acceptLanguage}:${acceptEncoding}:${platform}:${screen}`;
  
  // Hash it using SHA-256 for consistent length and security
  return crypto.createHash('sha256').update(fingerprint).digest('hex');
}
