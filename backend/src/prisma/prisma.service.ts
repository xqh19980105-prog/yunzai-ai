import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly maxRetries = 5;
  private readonly retryDelay = 2000; // 2 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isDestroyed = false; // 标记服务是否已销毁

  async onModuleInit() {
    // 使用setTimeout包装，避免阻塞模块初始化
    // 这样即使连接失败，也不会阻止其他模块初始化
    setImmediate(() => {
      this.connectWithRetry().catch((error) => {
        // 连接失败已经在connectWithRetry中处理，这里只是捕获可能的未处理错误
        console.error('PrismaService initialization error:', error);
      });
    });
  }

  private async connectWithRetry(attempt = 1): Promise<void> {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    try {
      await this.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error(`❌ Database connection failed (attempt ${attempt}/${this.maxRetries}):`, error);
      
      if (attempt < this.maxRetries) {
        console.log(`⏳ Retrying database connection in ${this.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.connectWithRetry(attempt + 1);
      }
      
      console.error('❌ Database connection failed after all retries');
      console.error('Please ensure PostgreSQL is running and DATABASE_URL is correct');
      
      if (isDevelopment) {
        // 开发环境：允许应用继续运行，尝试定期重连
        // 这样开发者可以先启动应用，再启动数据库
        console.warn('⚠️ Development mode: Allowing app to start without database connection');
        console.warn('⚠️ Database operations will fail until connection is established');
        console.warn('⚠️ Attempting to reconnect every 10 seconds...');
        this.scheduleReconnect();
      } else {
        // 生产环境：数据库是必需的，必须抛出错误让应用启动失败
        // 这样进程管理器（如PM2）可以检测到失败并重启
        console.error('❌ Production mode: Database is required, application cannot start');
        throw new Error('Database connection failed after all retries. Application cannot start without database.');
      }
    }
  }

  private scheduleReconnect(): void {
    // 只在开发环境中使用自动重连
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (!isDevelopment || this.isDestroyed) {
      return; // 生产环境不应该自动重连，或者服务已销毁
    }
    
    // 清除之前的定时器（如果存在）
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      
      // 检查服务是否已销毁
      if (this.isDestroyed) {
        return;
      }
      
      try {
        await this.$connect();
        console.log('✅ Database reconnected successfully');
      } catch (error) {
        console.warn('⚠️ Database reconnection failed, will retry in 10 seconds...');
        // 只有在未销毁时才继续重连
        if (!this.isDestroyed) {
          this.scheduleReconnect();
        }
      }
    }, 10000); // 每10秒重试一次
  }

  async onModuleDestroy() {
    this.isDestroyed = true; // 标记为已销毁
    
    // 清除重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // 断开数据库连接
    try {
      await this.$disconnect();
      console.log('✅ PrismaService disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting PrismaService:', error);
    }
  }
}
