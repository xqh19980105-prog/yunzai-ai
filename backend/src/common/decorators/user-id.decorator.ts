import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

/**
 * 自定义装饰器：从请求中提取并验证用户ID
 * 替换重复的 userId 验证逻辑
 * 
 * 使用示例：
 * ```typescript
 * async chat(@UserId() userId: string, @Body() dto: ChatRequestDto) {
 *   // userId 已经验证过，可以直接使用
 * }
 * ```
 */
export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const userId = request.user?.userId;

    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new BadRequestException('用户ID缺失');
    }

    return userId.trim();
  },
);
