import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { UserId } from '../common/decorators/user-id.decorator';
import { z } from 'zod';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LegalGateGuard } from '../auth/guards/legal-gate.guard';
import { WorkflowService } from './workflow.service';
import { createZodPipe } from '../common/pipes/zod-validation.pipe';

const workflowTestSchema = z.object({
  domainId: z.string().uuid('域ID必须是有效的UUID格式'),
  userInput: z.string({ message: '用户输入必须是字符串' }).min(1, '用户输入不能为空'),
});

type WorkflowTestDto = z.infer<typeof workflowTestSchema>;

/**
 * Admin Workflow Controller
 * Provides admin-only endpoints for workflow testing
 */
@ApiTags('管理员 - 工作流 (Admin - Workflow)')
@ApiBearerAuth('JWT-auth')
@Controller('api/admin/workflow')
@UseGuards(JwtAuthGuard, LegalGateGuard) // Legal Gate: Block access if not signed (even for admins)
export class WorkflowAdminController {
  constructor(private workflowService: WorkflowService) {}

  /**
   * Test workflow execution
   * POST /api/admin/workflow/test
   * 
   * This endpoint allows admins to test workflow configurations
   * without saving chat history or affecting user data.
   * 
   * @param req - Request object containing authenticated user
   * @param dto - Test parameters (domainId, userInput)
   * @returns Workflow execution result (final output only, no intermediate steps)
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '测试工作流', description: '管理员测试工作流配置，不保存聊天历史' })
  @ApiResponse({ status: 200, description: '工作流测试成功，返回最终结果' })
  @ApiResponse({ status: 400, description: '工作流测试失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '未完成法律声明确认' })
  async testWorkflow(
    @UserId() userId: string,
    @Body(createZodPipe(workflowTestSchema)) dto: WorkflowTestDto,
  ) {
    // ✅ 验证已由ValidationPipe自动完成，无需手动验证

    try {
      // Execute workflow using the same service method as production
      // This ensures test behavior matches production behavior
      const result = await this.workflowService.executeWorkflow(
        userId,
        dto.domainId.trim(),
        dto.userInput.trim(),
      );

      if (typeof result !== 'string') {
        throw new BadRequestException('工作流返回结果格式无效');
      }

      return {
        success: true,
        data: {
          result, // Final output only (black box behavior)
          message: '工作流测试完成',
        },
      };
    } catch (error: unknown) {
      // Re-throw validation/not found errors as-is
      if (error instanceof BadRequestException || 
          (error && typeof error === 'object' && 'status' in error && 
           typeof error.status === 'number' && error.status !== 500)) {
        throw error;
      }

      // Wrap other errors with a user-friendly message
      const errorMessage = error instanceof Error ? error.message : '工作流测试失败';
      throw new BadRequestException(errorMessage);
    }
  }
}
