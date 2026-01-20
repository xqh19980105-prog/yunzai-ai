import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ActivationService } from './services/activation.service';
import { UserId } from '../common/decorators/user-id.decorator';
import { createZodPipe } from '../common/pipes/zod-validation.pipe';

const useActivationCodeSchema = z.object({
  code: z
    .string({ message: '激活码必须是字符串' })
    .min(1, '激活码不能为空')
    .regex(/^[A-Z0-9]+$/, '激活码格式无效，只能包含大写字母和数字'),
});

type UseActivationCodeDto = z.infer<typeof useActivationCodeSchema>;

/**
 * Activation Controller
 * Handles activation code usage for users
 * 
 * 重构说明：使用 ActivationService 统一管理激活码业务逻辑
 */
@Controller('api/activation')
export class ActivationController {
  constructor(private activationService: ActivationService) {}

  /**
   * POST /api/activation/use
   * Use an activation code to activate membership
   */
  @Post('use')
  @UseGuards(JwtAuthGuard)
  async useActivationCode(
    @UserId() userId: string,
    @Body(createZodPipe(useActivationCodeSchema)) dto: UseActivationCodeDto,
  ) {
    const membershipExpireAt = await this.activationService.useActivationCode(
      userId,
      dto.code,
    );

    return {
      success: true,
      membershipExpireAt,
    };
  }
}
