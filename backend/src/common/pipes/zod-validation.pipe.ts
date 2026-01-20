import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * Zod验证管道
 * 用于替代class-validator，使用zod进行数据验证
 * 
 * 使用方式：
 * @Body(ZodValidationPipe(loginSchema)) body: LoginDto
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: any, metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        // 提取第一个错误消息，或组合所有错误消息
        const errorMessages = error.errors.map((err: any) => {
          const path = err.path.join('.');
          return path ? `${path}: ${err.message}` : err.message;
        });
        
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: errorMessages[0] || '验证失败',
          errors: errorMessages,
        });
      }
      throw new BadRequestException('验证失败');
    }
  }
}

/**
 * 辅助函数：创建Zod验证管道
 * 使用方式：@Body(createZodPipe(loginSchema))
 */
export function createZodPipe(schema: ZodSchema) {
  return new ZodValidationPipe(schema);
}
