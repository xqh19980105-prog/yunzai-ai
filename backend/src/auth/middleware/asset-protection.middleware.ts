import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AssetProtectionTriggeredException } from '../../common/exceptions/custom.exceptions';

@Injectable()
export class AssetProtectionMiddleware implements NestMiddleware {
  private readonly MAX_DEVICES = 5;
  private readonly WINDOW_HOURS = 24;
  private readonly WINDOW_SECONDS = this.WINDOW_HOURS * 60 * 60;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip if no user (will be handled by auth guard)
    const user = (req as any).user;
    if (!user) {
      return next();
    }

    // Skip asset protection if Redis is not available
    if (!this.redis.isRedisAvailable()) {
      console.warn('Redis not available, skipping asset protection check');
      return next();
    }

    const deviceFingerprint = this.getDeviceFingerprint(req);
    const windowStart = Math.floor(Date.now() / 1000) - this.WINDOW_SECONDS;
    const redisKey = `device_fingerprints:${user.userId}`;

    try {
      // Remove old entries from sliding window
      await this.redis.removeOldEntries(redisKey, windowStart);

      // Check if this device already exists
      const deviceScore = await this.redis.getClient().zScore(redisKey, deviceFingerprint);
      const isExistingDevice = deviceScore !== null;

      if (isExistingDevice) {
        // Update timestamp for existing device (sliding window)
        const currentTimestamp = Math.floor(Date.now() / 1000);
        await this.redis.addToSortedSet(redisKey, deviceFingerprint, currentTimestamp);
        return next();
      }

      // Handle new device
      await this.handleNewDevice(redisKey, deviceFingerprint, windowStart, res, user.userId);
      next();
    } catch (error) {
      // If it's an AssetProtectionTriggeredException, re-throw it
      if (error instanceof AssetProtectionTriggeredException) {
        throw error;
      }
      // If Redis operation fails, log and continue (don't block requests)
      console.error('Asset protection middleware error:', error);
      return next();
    }
  }

  /**
   * Handle new device registration and check device limits
   */
  private async handleNewDevice(
    redisKey: string,
    deviceFingerprint: string,
    windowStart: number,
    res: Response,
    userId: string,
  ): Promise<void> {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    
    // Add new device to sorted set
    await this.redis.addToSortedSet(redisKey, deviceFingerprint, currentTimestamp);
    await this.redis.expire(redisKey, this.WINDOW_SECONDS);

    // Count total devices in time window
    const deviceCount = await this.redis.countInTimeWindow(redisKey, windowStart);

    // Device count warnings: Yellow card (3-4 devices), Red card (5+ devices)
    if (this.isYellowCardWarning(deviceCount)) {
      res.setHeader('X-Device-Warning', `YELLOW:${deviceCount}`);
    }

    if (deviceCount >= this.MAX_DEVICES) {
      // Trigger asset protection (Red card)
      await this.triggerAssetProtection(userId);
      throw new AssetProtectionTriggeredException();
    }
  }

  /**
   * Check if device count triggers yellow card warning
   */
  private isYellowCardWarning(deviceCount: number): boolean {
    return deviceCount === 3 || deviceCount === 4;
  }

  private getDeviceFingerprint(req: Request): string {
    // Generate fingerprint from request headers
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const ip = req.ip || req.socket.remoteAddress || '';

    // Simple fingerprint (in production, use a more robust method)
    const fingerprint = `${ip}:${userAgent}:${acceptLanguage}:${acceptEncoding}`;
    
    // Hash it (simple hash for demo, use crypto in production)
    return Buffer.from(fingerprint).toString('base64').substring(0, 64);
  }

  private async triggerAssetProtection(userId: string): Promise<void> {
    // Set user status to LOCKED_ASSET_PROTECTION
    // Wipe api_key to NULL
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'LOCKED_ASSET_PROTECTION',
        apiKey: null,
        deviceFingerprintCount: this.MAX_DEVICES,
      },
    });
  }
}
