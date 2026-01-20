import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCodes } from '../constants/error-codes';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    let code: string = ErrorCodes.INTERNAL_ERROR; // ✅ 使用错误码常量

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as { code?: string; message?: string };
        code = responseObj.code || ErrorCodes.HTTP_ERROR; // ✅ 使用错误码常量
        message = responseObj.message || exception.message;
      } else {
        message = exception.message;
      }
    } else {
      // Log raw errors for debugging, but never expose them to users
      this.logger.error(
        `Unhandled exception: ${exception instanceof Error ? exception.stack : String(exception)}`,
        'GlobalExceptionFilter',
      );
    }

    // Never show raw 500 errors to users
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      message = '服务器内部错误，请稍后重试';
      code = ErrorCodes.INTERNAL_ERROR; // ✅ 使用错误码常量
    }

    response.status(status).json({
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
