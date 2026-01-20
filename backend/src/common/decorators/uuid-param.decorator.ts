import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';
import { IsUUID } from 'class-validator';

/**
 * 自定义装饰器：验证路径参数是否为有效的UUID
 * 用于替代手动验证逻辑
 * 
 * 使用示例：
 * ```typescript
 * async getUser(@UuidParam('id') id: string) {
 *   // id 已经是有效的UUID，可以直接使用
 * }
 * ```
 */
export const UuidParam = createParamDecorator(
  (paramName: string, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const paramValue = request.params[paramName];

    if (!paramValue || typeof paramValue !== 'string') {
      throw new BadRequestException(`${paramName}参数缺失`);
    }

    // 使用class-validator的IsUUID验证逻辑
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(paramValue)) {
      throw new BadRequestException(`${paramName}必须是有效的UUID格式`);
    }

    return paramValue;
  },
);
