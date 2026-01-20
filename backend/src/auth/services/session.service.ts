import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from '../../common/services/user.service';
import { Request } from 'express';
import { getClientIp } from '../../common/utils/ip.util';
import { getDeviceFingerprint } from '../../common/utils/device.util';
import * as crypto from 'crypto';

export interface SessionPayload {
  userId: string;
  email: string;
  sessionId: string;
}

/**
 * 【P1-2修复】SessionService
 * 
 * 职责：会话管理
 * - 创建会话
 * - 验证会话
 * - 恢复会话
 * - 清除会话
 * - 登出
 */
@Injectable()
export class SessionService {
  private readonly SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
  private readonly logger = new Logger(SessionService.name);
  private readonly isDevelopment =
    process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

  // 【P0-2修复】会话恢复安全配置
  private readonly MAX_RESTORE_ATTEMPTS = 3; // 最大恢复尝试次数
  private readonly RESTORE_ATTEMPT_WINDOW = 3600; // 恢复尝试窗口（1小时）

  constructor(
    private redis: RedisService,
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  /**
   * 创建会话
   */
  async createSession(
    userId: string,
    email: string,
  ): Promise<{ sessionId: string; payload: SessionPayload }> {
    const sessionId = this.generateSessionId();
    const payload: SessionPayload = {
      userId,
      email,
      sessionId,
    };

    // 保存会话到Redis
    if (this.redis.isRedisAvailable()) {
      try {
        const sessionKey = `session:${userId}:${sessionId}`;

        await this.redis.set(sessionKey, JSON.stringify(payload), this.SESSION_TTL);

        // 保存用户的会话列表（支持多设备登录）
        await this.redis.sadd(`user:${userId}:sessions`, sessionId);
        await this.redis.expire(`user:${userId}:sessions`, this.SESSION_TTL);

        // 验证会话是否真的保存成功
        const verifySession = await this.redis.get(sessionKey);
        if (!verifySession) {
          const errorMsg = `Session storage verification failed for user ${userId}`;
          this.logger.error(errorMsg);
          if (!this.isDevelopment) {
            throw new Error(errorMsg);
          }
        } else {
          this.logger.log(
            `Session stored successfully: userId=${userId}, sessionId=${sessionId.substring(0, 16)}...`,
          );
        }
      } catch (error) {
        const errorMsg = `Failed to store session in Redis for user ${userId}`;
        this.logger.error(errorMsg, error);

        if (!this.isDevelopment) {
          throw new Error(
            `${errorMsg}. Login cannot proceed without session storage.`,
          );
        }
        this.logger.warn(`Development mode: allowing login despite Redis failure`);
      }
    } else {
      this.logger.warn(`Redis not available, session not stored for user ${userId}`);
      if (!this.isDevelopment) {
        throw new Error(
          'Redis is not available. Session storage is required for production.',
        );
      }
      this.logger.warn(
        `Development mode: allowing login without Redis session storage`,
      );
    }

    return { sessionId, payload };
  }

  /**
   * 验证会话
   */
  async validateSession(
    userId: string,
    sessionId: string,
    req?: Request,
  ): Promise<SessionPayload | null> {
    // Redis不可用时的处理
    if (!this.redis.isRedisAvailable()) {
      this.logger.warn(
        `Redis not available, skipping session validation for user ${userId}`,
      );
      if (this.isDevelopment) {
        this.logger.warn(
          `Development mode: allowing session validation without Redis`,
        );
        try {
          const user = await this.userService.findByIdSelect(userId, {
            id: true,
            email: true,
            status: true,
          });
          if (user.status === 'ACTIVE') {
            return { userId: user.id, email: user.email, sessionId };
          } else {
            this.logger.warn(`Cannot validate session: user ${userId} not active`);
            return null;
          }
        } catch (error) {
          this.logger.error(`Failed to fetch user info in development mode`, error);
          return null;
        }
      }
      return null;
    }

    // Redis可用，执行正常验证流程
    const sessionKey = `session:${userId}:${sessionId}`;

    try {
      this.logger.debug(`Validating session: ${sessionKey.substring(0, 50)}...`);

      // 尝试获取会话数据
      const sessionData = await this.redis.get(sessionKey);

      // 会话存在，验证成功
      if (sessionData) {
        let session: SessionPayload;
        try {
          session = JSON.parse(sessionData) as SessionPayload;
        } catch (parseError) {
          this.logger.error(
            `Failed to parse session data for user ${userId}`,
            parseError,
          );
          return null;
        }

        // 滑动过期：每次验证成功后刷新会话的过期时间
        try {
          await this.redis.expire(sessionKey, this.SESSION_TTL);
          await this.redis.expire(`user:${userId}:sessions`, this.SESSION_TTL);
          this.logger.debug(
            `Session validated and refreshed: userId=${userId}, sessionId=${sessionId.substring(0, 16)}...`,
          );
        } catch (error) {
          this.logger.warn(`Failed to refresh session TTL for user ${userId}`, error);
        }

        return session;
      }

      // 会话不存在，尝试恢复会话
      return await this.restoreSession(userId, sessionId, req);
    } catch (error) {
      this.logger.error(`Error validating session for user ${userId}`, error);

      if (this.isDevelopment) {
        this.logger.warn(
          `Development mode: attempting fallback validation despite Redis error`,
        );
        try {
          const user = await this.userService.findByIdSelect(userId, {
            id: true,
            email: true,
            status: true,
          });
          if (user.status === 'ACTIVE') {
            return { userId: user.id, email: user.email, sessionId };
          }
        } catch (fallbackError) {
          this.logger.error(
            `Fallback validation failed for user ${userId}`,
            fallbackError,
          );
        }
      }

      return null;
    }
  }

  /**
   * 恢复会话（带安全检查）
   */
  private async restoreSession(
    userId: string,
    sessionId: string,
    req?: Request,
  ): Promise<SessionPayload | null> {
    this.logger.warn(`Session not found in Redis: session:${userId}:${sessionId}`, {
      userId,
      requestedSessionId: sessionId.substring(0, 16) + '...',
      possibleReasons: [
        'Redis was restarted and sessions were lost',
        'Session TTL expired',
        'Redis memory was cleared',
        'Session was manually deleted',
      ],
    });

    // 【P0-2修复】1. 检查恢复次数限制
    const restoreAttemptsKey = `session:restore:attempts:${userId}:${sessionId}`;
    const restoreAttempts = await this.redis.get(restoreAttemptsKey);
    const attemptCount = parseInt(restoreAttempts || '0', 10);

    if (attemptCount >= this.MAX_RESTORE_ATTEMPTS) {
      this.logger.warn(
        `Session restore blocked: too many attempts for user ${userId}, sessionId=${sessionId.substring(0, 16)}...`,
        {
          attemptCount,
          maxAttempts: this.MAX_RESTORE_ATTEMPTS,
        },
      );

      await this.recordSessionRestoreFailure(
        userId,
        sessionId,
        'TOO_MANY_ATTEMPTS',
        req,
      );

      return null;
    }

    // 【P0-2修复】2. 验证设备指纹（如果Request可用）
    if (req) {
      const deviceFingerprint = getDeviceFingerprint(req);

      // 检查设备是否在用户的允许列表中
      const device = await this.prisma.device.findFirst({
        where: {
          userId,
          fingerprint: deviceFingerprint,
          isActive: true,
        },
      });

      if (!device) {
        this.logger.warn(
          `Session restore blocked: unknown device for user ${userId}`,
          {
            deviceFingerprint: deviceFingerprint.substring(0, 16) + '...',
          },
        );

        await this.recordSessionRestoreFailure(
          userId,
          sessionId,
          'UNKNOWN_DEVICE',
          req,
        );

        return null;
      }
    }

    // 尝试恢复会话
    try {
      const user = await this.userService.findByIdSelect(userId, {
        id: true,
        email: true,
        status: true,
      });

      if (user.status !== 'ACTIVE') {
        this.logger.warn(`Cannot restore session: user ${userId} not active`);

        await this.recordSessionRestoreFailure(
          userId,
          sessionId,
          'USER_NOT_ACTIVE',
          req,
        );

        return null;
      }

      // 恢复会话
      const restoredPayload: SessionPayload = {
        userId: user.id,
        email: user.email,
        sessionId,
      };

      const sessionKey = `session:${userId}:${sessionId}`;
      await this.redis.set(sessionKey, JSON.stringify(restoredPayload), this.SESSION_TTL);
      await this.redis.sadd(`user:${userId}:sessions`, sessionId);
      await this.redis.expire(`user:${userId}:sessions`, this.SESSION_TTL);

      // 记录恢复成功，并增加恢复尝试次数
      await this.redis.incr(restoreAttemptsKey);
      await this.redis.expire(restoreAttemptsKey, this.RESTORE_ATTEMPT_WINDOW);

      // 记录恢复成功日志
      await this.recordSessionRestore(userId, sessionId, req);

      this.logger.log(
        `Session restored for user ${userId}: sessionId=${sessionId.substring(0, 16)}..., attemptCount=${attemptCount + 1}`,
      );

      return restoredPayload;
    } catch (restoreError) {
      this.logger.error(`Failed to restore session for user ${userId}`, restoreError);

      await this.recordSessionRestoreFailure(
        userId,
        sessionId,
        'RESTORE_ERROR',
        req,
      );

      return null;
    }
  }

  /**
   * 清除用户的所有会话
   */
  async invalidateUserSessions(userId: string, newSessionId?: string): Promise<void> {
    if (!this.redis.isRedisAvailable()) {
      this.logger.warn('Redis not available, cannot invalidate sessions');
      return;
    }

    try {
      const sessionIds = await this.redis.smembers(`user:${userId}:sessions`);

      if (sessionIds && sessionIds.length > 0) {
        const sessionsToDelete = newSessionId
          ? sessionIds.filter((id) => id !== newSessionId)
          : sessionIds;

        for (const sid of sessionsToDelete) {
          await this.redis.del(`session:${userId}:${sid}`);
        }

        if (newSessionId) {
          await this.redis.del(`user:${userId}:sessions`);
          await this.redis.sadd(`user:${userId}:sessions`, newSessionId);
          await this.redis.expire(`user:${userId}:sessions`, this.SESSION_TTL);
        } else {
          await this.redis.del(`user:${userId}:sessions`);
        }

        this.logger.log(
          `Invalidated ${sessionsToDelete.length} session(s) for user ${userId}`,
        );
      } else {
        this.logger.debug(`No active sessions to invalidate for user ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Error invalidating sessions for user ${userId}`, error);
    }
  }

  /**
   * 登出：移除指定会话
   */
  async logout(userId: string, sessionId: string): Promise<void> {
    if (!this.redis.isRedisAvailable()) {
      this.logger.warn(`Redis not available, cannot logout user ${userId}`);
      return;
    }

    try {
      await this.redis.del(`session:${userId}:${sessionId}`);
      await this.redis.srem(`user:${userId}:sessions`, sessionId);

      this.logger.log(
        `User ${userId} logged out, session ${sessionId.substring(0, 16)}... removed`,
      );
    } catch (error) {
      this.logger.error(`Error during logout for user ${userId}`, error);
    }
  }

  /**
   * 生成安全的会话ID
   */
  private generateSessionId(): string {
    const randomPart = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    return `${timestamp}-${randomPart}`;
  }

  /**
   * 记录会话恢复成功日志
   */
  private async recordSessionRestore(
    userId: string,
    sessionId: string,
    req?: Request,
  ): Promise<void> {
    try {
      const logData = {
        userId,
        sessionId: sessionId.substring(0, 16) + '...',
        timestamp: new Date().toISOString(),
        ip: req ? getClientIp(req) : 'unknown',
        userAgent: req?.headers['user-agent'] || 'unknown',
      };

      this.logger.log(`Session restore succeeded: ${JSON.stringify(logData)}`);
    } catch (error) {
      this.logger.warn(
        `Failed to record session restore log for user ${userId}`,
        error,
      );
    }
  }

  /**
   * 记录会话恢复失败日志
   */
  private async recordSessionRestoreFailure(
    userId: string,
    sessionId: string,
    reason: string,
    req?: Request,
  ): Promise<void> {
    try {
      const logData = {
        userId,
        sessionId: sessionId.substring(0, 16) + '...',
        reason,
        timestamp: new Date().toISOString(),
        ip: req ? getClientIp(req) : 'unknown',
        userAgent: req?.headers['user-agent'] || 'unknown',
      };

      this.logger.warn(`Session restore failed: ${JSON.stringify(logData)}`);
    } catch (error) {
      this.logger.warn(
        `Failed to record session restore failure log for user ${userId}`,
        error,
      );
    }
  }
}