import { Request } from 'express';

/**
 * Get real client IP address from request
 * Handles proxy/load balancer scenarios (X-Forwarded-For, X-Real-IP)
 */
export function getClientIp(req: Request): string {
  // Check X-Forwarded-For header (most common proxy header)
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
    // The first one is usually the real client IP
    const ips = Array.isArray(xForwardedFor) 
      ? xForwardedFor[0] 
      : xForwardedFor;
    const firstIp = ips.split(',')[0].trim();
    if (firstIp && firstIp !== 'unknown') {
      return firstIp;
    }
  }

  // Check X-Real-IP header (Nginx proxy)
  const xRealIp = req.headers['x-real-ip'];
  if (xRealIp && typeof xRealIp === 'string' && xRealIp !== 'unknown') {
    return xRealIp;
  }

  // Check CF-Connecting-IP header (Cloudflare)
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (cfConnectingIp && typeof cfConnectingIp === 'string' && cfConnectingIp !== 'unknown') {
    return cfConnectingIp;
  }

  // Fallback to req.ip (set by express trust proxy)
  if (req.ip && req.ip !== 'unknown') {
    return req.ip;
  }

  // Last resort: socket remote address
  if (req.socket?.remoteAddress) {
    return req.socket.remoteAddress;
  }

  return 'unknown';
}
