import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import helmet from 'helmet';

// 全局错误处理器
// 开发环境：容错性更强，允许应用继续运行以便调试
// 生产环境：严格处理，记录错误并优雅关闭
const isDevelopment = process.env.NODE_ENV !== 'production';

process.on('uncaughtException', (error: Error) => {
  console.error('❌ [Uncaught Exception]', error);
  console.error('Stack:', error.stack);
  
  if (isDevelopment) {
    // 开发环境：记录错误但继续运行，方便调试
    console.warn('⚠️ Development mode: Application continues despite uncaught exception');
  } else {
    // 生产环境：记录错误并优雅关闭
    console.error('❌ Production mode: Shutting down due to uncaught exception');
    // 使用 setTimeout 确保 appInstance 已经初始化（如果正在初始化中）
    setTimeout(() => {
      if (appInstance) {
        appInstance.close().then(() => {
          process.exit(1);
        }).catch(() => {
          process.exit(1);
        });
      } else {
        process.exit(1);
      }
    }, 100);
  }
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('❌ [Unhandled Rejection]', reason);
  console.error('Promise:', promise);
  
  if (isDevelopment) {
    // 开发环境：记录错误但继续运行
    console.warn('⚠️ Development mode: Application continues despite unhandled rejection');
  } else {
    // 生产环境：记录错误（但不立即退出，因为可能是非关键的错误）
    // 但应该监控这些错误，如果频繁发生应该重启应用
    console.error('⚠️ Production mode: Unhandled rejection detected (monitoring)');
  }
});

// 优雅关闭处理
let appInstance: any = null;

async function bootstrap() {
  try {
    console.log('🚀 Starting NestJS application...');
    console.log(`📦 Environment: ${isDevelopment ? 'development' : 'production'}`);
    
    // 使用更宽松的选项，避免模块初始化错误导致启动失败
    const app = await NestFactory.create(AppModule, {
      logger: isDevelopment 
        ? ['error', 'warn', 'log', 'debug', 'verbose'] 
        : ['error', 'warn', 'log'],
      abortOnError: false, // 不因错误而中止，让错误处理器处理
    });
    appInstance = app;

    // Trust proxy to get real IP (for X-Forwarded-For header)
    // In NestJS, we need to use the underlying Express instance
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.set('trust proxy', true);

    // Global validation pipe
    // Note: 现在主要使用 zod 进行验证（通过 @Body(createZodPipe(schema))）
    // 这个 ValidationPipe 保留用于向后兼容和没有使用 zod 的地方
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        skipMissingProperties: true, // 允许跳过缺失的属性，让 zod 验证处理
      }),
    );

    // Global exception filter (Never show raw 500 errors to users)
    app.useGlobalFilters(new GlobalExceptionFilter());

    // Security: Helmet middleware for HTTP headers
    app.use(
      helmet({
        contentSecurityPolicy: false, // Disable CSP for React apps that use inline scripts
        crossOriginEmbedderPolicy: false, // Allow loading external resources
      }),
    );
    console.log('🛡️ Helmet security middleware enabled');

    // CORS configuration
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    // 开发环境允许所有来源，生产环境限制为指定域名
    const corsOrigin = isDevelopment ? true : frontendUrl;
    app.enableCors({
      origin: corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });
    console.log(`✅ CORS enabled for: ${isDevelopment ? 'all origins (dev mode)' : frontendUrl}`);

    // Swagger API Documentation
    const config = new DocumentBuilder()
      .setTitle('Yunzai AI API')
      .setDescription('Yunzai AI SaaS Platform API Documentation')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addServer('http://localhost:3000', 'Development server')
      .addServer('https://api.yunzai.ai', 'Production server')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    console.log(`📚 Swagger API docs available at: http://localhost:${process.env.PORT || 3000}/api/docs`);

    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`🚀 NestJS Server running on port ${port}`);
    console.log(`📡 API available at: http://localhost:${port}`);
    
    // 优雅关闭处理
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n📡 Received ${signal}, starting graceful shutdown...`);
      try {
        if (appInstance) {
          await appInstance.close();
          console.log('✅ Application closed gracefully');
        }
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    // 监听关闭信号
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // 防止进程因错误而退出
    process.on('exit', (code) => {
      if (code !== 0) {
        console.error(`⚠️ Process exiting with code ${code}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    if (isDevelopment) {
      // 开发环境：等待一段时间后退出，给开发者时间查看错误
      console.error('⚠️ Development mode: Server failed to start, exiting in 10 seconds...');
      setTimeout(() => {
        console.error('⚠️ Exiting...');
        process.exit(1);
      }, 10000);
    } else {
      // 生产环境：立即退出，让进程管理器（如PM2）重启
      console.error('❌ Production mode: Server failed to start, exiting immediately');
      process.exit(1);
    }
  }
}

bootstrap();
