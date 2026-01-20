import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

/**
 * 【P1-5修复】Redis服务优化
 * 
 * 改进：
 * 1. 添加健康检查机制
 * 2. 完善降级策略
 * 3. 添加监控和统计
 * 4. 区分关键操作和非关键操作
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isDestroyed = false; // 标记服务是否已销毁
  
  // 【P1-5修复】健康检查相关
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30秒检查一次
  private lastHealthCheckTime = 0;
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  
  // 【P1-5修复】操作统计
  private operationStats = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    lastOperationTime: 0,
  };

  async onModuleInit() {
    // 使用setImmediate包装，避免阻塞模块初始化
    setImmediate(() => {
      this.connect().catch((error) => {
        // 连接失败已经在connect中处理，这里只是捕获可能的未处理错误
        this.logger.error('RedisService initialization error', error);
      });
    });
    
    // 【P1-5修复】启动健康检查
    this.startHealthCheck();
  }

  private async connect(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.client = createClient({ url: redisUrl });
      
      // 监听错误事件，自动重连
      this.client.on('error', (err) => {
        console.error('Redis Client Error', err);
        this.isConnected = false;
        this.scheduleReconnect();
      });

      // 监听连接断开事件
      this.client.on('disconnect', () => {
        console.warn('Redis disconnected');
        this.isConnected = false;
        this.scheduleReconnect();
      });

      // 监听重连事件
      this.client.on('reconnecting', () => {
        console.log('Redis reconnecting...');
      });

      await this.client.connect();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.consecutiveFailures = 0;
      this.logger.log('✅ Redis connected successfully');
      
      // 【P1-5修复】验证连接健康
      await this.performHealthCheck();
    } catch (error) {
      const isDevelopment = process.env.NODE_ENV !== 'production';
      this.logger.error('❌ Redis connection failed', error);
      this.logger.error(
        `Please ensure Redis is running on ${process.env.REDIS_URL || 'redis://localhost:6379'}`,
      );
      this.client = null;
      this.isConnected = false;
      this.consecutiveFailures++;
      
      if (isDevelopment) {
        // 开发环境：允许应用继续运行，尝试重连
        this.logger.warn('⚠️ Development mode: Allowing app to start without Redis');
        this.logger.warn(
          '⚠️ Redis-dependent features will not work until connection is established',
        );
        this.scheduleReconnect();
      } else {
        // 生产环境：Redis失败不应该阻止应用启动（因为Redis主要用于会话管理）
        // 但应该记录警告并尝试重连
        this.logger.warn('⚠️ Production mode: Redis connection failed, but application continues');
        this.logger.warn(
          '⚠️ Session management and caching features may be affected',
        );
        this.scheduleReconnect();
      }
      // 注意：Redis不是关键服务，所以不抛出错误
    }
  }

  private scheduleReconnect(): void {
    // 如果服务已销毁，不再重连
    if (this.isDestroyed) {
      return;
    }
    
    if (this.reconnectTimer) {
      return; // 已经安排了重连
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Redis reconnection failed after ${this.maxReconnectAttempts} attempts`);
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // 指数退避，最多30秒
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      
      // 检查服务是否已销毁
      if (this.isDestroyed) {
        return;
      }
      
      this.logger.log(
        `[Redis] Attempting to reconnect (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
      );
      await this.connect();
    }, delay);
  }

  async onModuleDestroy() {
    this.isDestroyed = true; // 标记为已销毁
    
    // 【P1-5修复】停止健康检查
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // 清除重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // 断开Redis连接
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        this.logger.log('✅ RedisService disconnected');
      } catch (error) {
        this.logger.error('❌ Error disconnecting Redis', error);
        // 如果quit失败，尝试强制断开
        try {
          if (this.client) {
            await this.client.disconnect();
          }
        } catch (disconnectError) {
          this.logger.error('❌ Error force disconnecting Redis', disconnectError);
        }
      }
    }
    
    this.client = null;
    this.isConnected = false;
  }

  private ensureConnected(): void {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis is not connected. Please ensure Redis is running.');
    }
  }

  getClient(): RedisClientType {
    this.ensureConnected();
    return this.client!;
  }

  /**
   * 【P1-5修复】检查Redis是否可用（包含健康检查）
   */
  isRedisAvailable(): boolean {
    if (!this.isConnected || this.client === null) {
      return false;
    }
    
    // 【P1-5修复】如果连续失败次数过多，认为不可用
    if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      return false;
    }
    
    // 【P1-5修复】如果最后一次健康检查失败，认为不可用
    const timeSinceLastHealthCheck = Date.now() - this.lastHealthCheckTime;
    if (timeSinceLastHealthCheck > this.HEALTH_CHECK_INTERVAL * 2) {
      // 如果超过2个检查周期没有健康检查，认为可能有问题
      return false;
    }
    
    return true;
  }

  /**
   * 【P1-5修复】执行健康检查
   */
  private async performHealthCheck(): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      this.consecutiveFailures++;
      return false;
    }

    try {
      // 执行简单的PING命令
      const result = await this.client.ping();
      if (result === 'PONG') {
        this.lastHealthCheckTime = Date.now();
        this.consecutiveFailures = 0;
        return true;
      }
    } catch (error) {
      this.logger.warn('Redis health check failed', error);
      this.consecutiveFailures++;
      
      // 如果连续失败，尝试重连
      if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        this.isConnected = false;
        this.scheduleReconnect();
      }
    }

    return false;
  }

  /**
   * 【P1-5修复】启动定期健康检查
   */
  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      return; // 已经在运行
    }

    this.healthCheckInterval = setInterval(async () => {
      if (this.isDestroyed) {
        return;
      }

      if (this.isConnected) {
        await this.performHealthCheck();
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * 【P1-5修复】获取Redis健康状态
   */
  getHealthStatus(): {
    isConnected: boolean;
    isAvailable: boolean;
    consecutiveFailures: number;
    reconnectAttempts: number;
    lastHealthCheckTime: number;
    stats: {
      totalOperations: number;
      successfulOperations: number;
      failedOperations: number;
      lastOperationTime: number;
    };
  } {
    return {
      isConnected: this.isConnected,
      isAvailable: this.isRedisAvailable(),
      consecutiveFailures: this.consecutiveFailures,
      reconnectAttempts: this.reconnectAttempts,
      lastHealthCheckTime: this.lastHealthCheckTime,
      stats: { ...this.operationStats },
    };
  }

  /**
   * 【P1-5修复】优化get方法，添加操作统计和错误处理
   */
  async get(key: string, isCritical: boolean = false): Promise<string | null> {
    this.operationStats.totalOperations++;
    this.operationStats.lastOperationTime = Date.now();

    if (!this.isRedisAvailable()) {
      this.operationStats.failedOperations++;
      if (isCritical) {
        this.logger.error(`[Redis] Critical operation failed: get key ${key}`);
        throw new Error(`Redis unavailable: cannot get critical key ${key}`);
      }
      this.logger.warn(`[Redis] Not available, cannot get key: ${key}`);
      return null;
    }

    try {
      const result = await this.client!.get(key);
      this.operationStats.successfulOperations++;
      return result;
    } catch (error) {
      this.operationStats.failedOperations++;
      this.consecutiveFailures++;
      this.logger.error(`[Redis] Error getting key ${key}`, error);
      
      // 如果连续失败，标记为不可用
      if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        this.isConnected = false;
        this.scheduleReconnect();
      }
      
      if (isCritical) {
        throw new Error(`Redis operation failed: get key ${key}`);
      }
      
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isRedisAvailable()) {
      console.warn(`[Redis] Not available, cannot set key: ${key}`);
      return;
    }
    try {
      if (ttlSeconds) {
        await this.client!.setEx(key, ttlSeconds, value);
      } else {
        await this.client!.set(key, value);
      }
    } catch (error) {
      console.error(`[Redis] Error setting key ${key}:`, error);
      throw error; // 重新抛出，让调用者知道操作失败
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isRedisAvailable()) {
      console.warn(`[Redis] Not available, cannot delete key: ${key}`);
      return;
    }
    try {
      await this.client!.del(key);
    } catch (error) {
      console.error(`[Redis] Error deleting key ${key}:`, error);
      // 不抛出错误，允许应用继续运行
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isRedisAvailable()) {
      console.warn(`[Redis] Not available, cannot check existence of key: ${key}`);
      return false;
    }
    try {
      const result = await this.client!.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`[Redis] Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.isRedisAvailable()) {
      console.warn(`[Redis] Not available, cannot increment key: ${key}`);
      return 0;
    }
    try {
      return await this.client!.incr(key);
    } catch (error) {
      console.error(`[Redis] Error incrementing key ${key}:`, error);
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.isRedisAvailable()) {
      console.warn(`[Redis] Not available, cannot expire key: ${key}`);
      return;
    }
    try {
      await this.client!.expire(key, seconds);
    } catch (error) {
      console.error(`[Redis] Error expiring key ${key}:`, error);
      // 不抛出错误，因为这只是刷新过期时间
    }
  }

  // For sliding window: add to sorted set with timestamp as score
  async addToSortedSet(key: string, member: string, score: number): Promise<void> {
    if (!this.isRedisAvailable()) {
      console.warn(`[Redis] Not available, cannot add to sorted set: ${key}`);
      return;
    }
    try {
      await this.client!.zAdd(key, { score, value: member });
    } catch (error) {
      console.error(`[Redis] Error adding to sorted set ${key}:`, error);
      // 不抛出错误，允许应用继续运行
    }
  }

  // Get count of members in sorted set within time window
  async countInTimeWindow(key: string, windowStart: number): Promise<number> {
    if (!this.isRedisAvailable()) {
      console.warn(`[Redis] Not available, cannot count in time window: ${key}`);
      return 0;
    }
    try {
      return await this.client!.zCount(key, windowStart, '+inf');
    } catch (error) {
      console.error(`[Redis] Error counting in time window ${key}:`, error);
      return 0;
    }
  }

  // Remove old entries from sorted set
  async removeOldEntries(key: string, beforeScore: number): Promise<void> {
    if (!this.isRedisAvailable()) {
      this.logger.warn(`[Redis] Not available, cannot remove old entries: ${key}`);
      return;
    }
    try {
      await this.client!.zRemRangeByScore(key, 0, beforeScore);
    } catch (error) {
      this.logger.error(`[Redis] Error removing old entries from ${key}:`, error);
      // 不抛出错误，允许应用继续运行
    }
  }

  /**
   * 【P1-2修复】集合操作：添加成员到集合
   */
  async sadd(key: string, member: string): Promise<void> {
    this.operationStats.totalOperations++;
    this.operationStats.lastOperationTime = Date.now();

    if (!this.isRedisAvailable()) {
      this.operationStats.failedOperations++;
      this.logger.warn(`[Redis] Not available, cannot add to set: ${key}`);
      return;
    }

    try {
      await this.client!.sAdd(key, member);
      this.operationStats.successfulOperations++;
    } catch (error) {
      this.operationStats.failedOperations++;
      this.consecutiveFailures++;
      this.logger.error(`[Redis] Error adding to set ${key}`, error);
      
      if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        this.isConnected = false;
        this.scheduleReconnect();
      }
    }
  }

  /**
   * 【P1-2修复】集合操作：从集合中移除成员
   */
  async srem(key: string, member: string): Promise<void> {
    this.operationStats.totalOperations++;
    this.operationStats.lastOperationTime = Date.now();

    if (!this.isRedisAvailable()) {
      this.operationStats.failedOperations++;
      this.logger.warn(`[Redis] Not available, cannot remove from set: ${key}`);
      return;
    }

    try {
      await this.client!.sRem(key, member);
      this.operationStats.successfulOperations++;
    } catch (error) {
      this.operationStats.failedOperations++;
      this.consecutiveFailures++;
      this.logger.error(`[Redis] Error removing from set ${key}`, error);
      
      if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        this.isConnected = false;
        this.scheduleReconnect();
      }
    }
  }

  /**
   * 【P1-2修复】集合操作：获取集合的所有成员
   */
  async smembers(key: string): Promise<string[]> {
    this.operationStats.totalOperations++;
    this.operationStats.lastOperationTime = Date.now();

    if (!this.isRedisAvailable()) {
      this.operationStats.failedOperations++;
      this.logger.warn(`[Redis] Not available, cannot get set members: ${key}`);
      return [];
    }

    try {
      const result = await this.client!.sMembers(key);
      this.operationStats.successfulOperations++;
      return result || [];
    } catch (error) {
      this.operationStats.failedOperations++;
      this.consecutiveFailures++;
      this.logger.error(`[Redis] Error getting set members ${key}`, error);
      
      if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        this.isConnected = false;
        this.scheduleReconnect();
      }
      
      return [];
    }
  }
}
