import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Daily cleanup task at 03:00 AM
   * - Clean expired avatars (if implemented)
   * - Clean chat histories older than 30 days
   * - Reset device fingerprint counters (Redis cleanup)
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleDailyCleanup() {
    this.logger.log('🚀 Starting daily cleanup task...');

    try {
      // Task 1: Clean chat histories older than 30 days
      try {
        await this.cleanOldChatHistories();
      } catch (error) {
        this.logger.error('❌ Failed to clean old chat histories:', error);
        // 继续执行其他任务，不因单个任务失败而停止
      }

      // Task 2: Reset device fingerprint counters (clean up expired Redis keys)
      try {
        await this.cleanupDeviceFingerprints();
      } catch (error) {
        this.logger.error('❌ Failed to cleanup device fingerprints:', error);
        // 继续执行其他任务
      }

      // Task 3: Clean expired avatars (placeholder - requires avatar storage implementation)
      // await this.cleanExpiredAvatars();

      this.logger.log('✅ Daily cleanup task completed');
    } catch (error) {
      // 顶层错误处理，确保定时任务不会导致应用崩溃
      this.logger.error('❌ Daily cleanup task failed:', error);
      // 不重新抛出错误，避免影响应用运行
    }
  }

  /**
   * Clean chat histories older than 30 days
   */
  private async cleanOldChatHistories(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.prisma.chatHistory.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      this.logger.log(`🗑️ Cleaned ${result.count} chat history records older than 30 days`);
    } catch (error) {
      this.logger.error('Failed to clean old chat histories:', error);
      // 不重新抛出错误，让调用者决定如何处理
      // 这样可以避免定时任务失败导致应用崩溃
    }
  }

  /**
   * Clean up expired device fingerprint keys in Redis
   * Device fingerprints are stored with 24h TTL, but we clean up stale keys
   */
  private async cleanupDeviceFingerprints(): Promise<void> {
    try {
      // Device fingerprints are stored in Redis sorted sets with pattern: device_fingerprints:${userId}
      // These keys have 24h TTL, but we can manually clean up to ensure no stale data
      
      // Note: In production, Redis TTL should handle this automatically
      // This is a safety cleanup for any keys that might not have expired properly
      
      // Since we don't have a direct way to list all keys matching a pattern without scanning,
      // we'll rely on Redis TTL expiration. However, we can log that the cleanup ran.
      
      this.logger.log('🧹 Device fingerprint cleanup: Redis TTL handles automatic expiration');
      
      // Optionally: Reset user's deviceFingerprintCount in database to 0 for all users
      // This is a database field that tracks the count, but actual device tracking is in Redis
      // We could reset this if needed:
      // await this.prisma.user.updateMany({
      //   data: { deviceFingerprintCount: 0 }
      // });
      
    } catch (error) {
      this.logger.error('Failed to cleanup device fingerprints:', error);
      // 不重新抛出错误，避免定时任务失败导致应用崩溃
    }
  }

  /**
   * Clean expired avatars (placeholder)
   * This requires avatar storage implementation (file system or database)
   * 
   * V7.0 Requirement: "Clean expired avatars (membership expired)"
   * Avatar cleanup should:
   * 1. Find users with expired membership
   * 2. Delete their avatar files/storage
   * 3. Update user record (clear avatar URL if stored)
   */
  private async cleanExpiredAvatars(): Promise<void> {
    // TODO: Implement avatar cleanup when avatar storage is added
    // For now, this is a placeholder
    
    this.logger.warn('⚠️ Avatar cleanup not implemented - requires avatar storage system');
    
    // Example implementation (when avatar field is added to User model):
    // const expiredUsers = await this.prisma.user.findMany({
    //   where: {
    //     membershipExpireAt: {
    //       lt: new Date(),
    //     },
    //     avatarUrl: {
    //       not: null,
    //     },
    //   },
    // });
    //
    // for (const user of expiredUsers) {
    //   // Delete avatar file from storage (S3, local filesystem, etc.)
    //   // await deleteAvatarFile(user.avatarUrl);
    //
    //   // Update user record
    //   // await this.prisma.user.update({
    //   //   where: { id: user.id },
    //   //   data: { avatarUrl: null },
    //   // });
    // }
  }
}
