import { Controller, Post, Get, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../common/services/user.service';
import { RelayService } from '../common/services/relay.service';
import { UserId } from '../common/decorators/user-id.decorator';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { createZodPipe } from '../common/pipes/zod-validation.pipe';

const setApiKeySchema = z.object({
  apiKey: z
    .string({ message: 'API密钥必须是字符串' })
    .min(10, 'API密钥长度过短，请检查密钥是否正确')
    .max(500, 'API密钥长度过长，请检查密钥是否正确'),
  apiBaseUrl: z
    .string({ message: 'API地址必须是字符串' })
    .url('API地址格式错误：必须以 http:// 或 https:// 开头')
    .refine(
      (url: string) => url.startsWith('http://') || url.startsWith('https://'),
      'API地址格式错误：必须以 http:// 或 https:// 开头'
    )
    .optional(),
});

type SetApiKeyDto = z.infer<typeof setApiKeySchema>;

@ApiTags('API密钥 (API Key)')
@Controller('api/api-key')
@UseGuards(JwtAuthGuard)
export class ApiKeyController {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private relayService: RelayService,
    private httpService: HttpService,
  ) {}

  /**
   * Clean API key by removing control characters (newlines, carriage returns, etc.)
   * This prevents "Invalid character in header content" errors
   */
  private cleanApiKey(apiKey: string): string {
    return apiKey
      .trim() // Remove leading/trailing whitespace
      .replace(/[\r\n\t]/g, '') // Remove newlines, carriage returns, tabs
      .replace(/[^\x20-\x7E]/g, ''); // Remove any non-printable ASCII characters
  }

  /**
   * GET /api/api-key/status
   * Get API key status (without exposing the key)
   */
  @Get('status')
  @ApiOperation({ summary: '获取密钥状态', description: '返回密钥是否已设置，不暴露密钥内容' })
  @ApiResponse({ status: 200, description: '返回密钥状态' })
  async getStatus(@UserId() userId: string) {
    // ✅ 使用UserService统一查询
    const user = await this.userService.findByIdSelect(userId, {
      apiKey: true,
      apiBaseUrl: true,
    });

    return {
      hasApiKey: !!user.apiKey,
      isConfigured: !!user.apiKey,
      apiBaseUrl: user.apiBaseUrl || null, // Return custom API base URL if set
    };
  }

  /**
   * POST /api/api-key/set
   * Set or update API key
   */
  @Post('set')
  @ApiOperation({ summary: '设置API密钥', description: '设置或更新用户的API密钥' })
  @ApiResponse({ status: 200, description: '设置成功' })
  @ApiResponse({ status: 400, description: '密钥格式错误' })
  async setApiKey(@UserId() userId: string, @Body(createZodPipe(setApiKeySchema)) dto: SetApiKeyDto) {
    // ✅ 基本验证已由ValidationPipe自动完成（@IsString, @MinLength, @MaxLength）
    
    // Clean API key: remove control characters
    const cleanedApiKey = this.cleanApiKey(dto.apiKey);
    if (!cleanedApiKey) {
      throw new BadRequestException('API密钥格式无效，请检查是否包含无效字符（如换行符等）');
    }

    // Update user's API key and base URL
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        apiKey: cleanedApiKey,
        apiBaseUrl: dto.apiBaseUrl?.trim() || null, // Save as null if empty
      },
    });

    return {
      success: true,
      message: 'API密钥已保存',
    };
  }

  /**
   * DELETE /api/api-key
   * Delete API key
   */
  @Post('delete')
  @ApiOperation({ summary: '删除API密钥', description: '删除用户的API密钥' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteApiKey(@UserId() userId: string) {

    try {
      console.log(`[API Key Delete] User ${userId} attempting to delete API key`);

      // Check if user exists
      const user = await this.userService.findByIdSelect(userId, {
        id: true,
        email: true,
        apiKey: true,
      });

      console.log(`[API Key Delete] User found: ${user.email}, has API key: ${!!user.apiKey}`);

      // Delete user's API key and base URL
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          apiKey: null,
          apiBaseUrl: null,
        },
      });

      console.log(`[API Key Delete] Successfully deleted API key for user: ${user.email}`);

      return {
        success: true,
        message: 'API密钥已删除',
      };
    } catch (error: any) {
      console.error(`[API Key Delete] Error for user ${userId}:`, error);
      throw new BadRequestException(
        error.message || '删除API密钥失败，请稍后重试'
      );
    }
  }

  /**
   * POST /api/api-key/test
   * Test API key connection
   * If apiKey is not provided or is a placeholder (dots), use stored key
   */
  @Post('test')
  @ApiOperation({ summary: '测试API密钥', description: '测试API密钥是否有效' })
  @ApiResponse({ status: 200, description: '测试成功' })
  @ApiResponse({ status: 400, description: '测试失败' })
  async testApiKey(@UserId() userId: string, @Body(createZodPipe(setApiKeySchema)) dto: SetApiKeyDto) {
    // ✅ 基本验证已由ValidationPipe自动完成
    
    let apiKey: string;

    // Check if apiKey is provided and not a placeholder (dots/bullets)
    // Common placeholder patterns: •••, ···, ●●●, or any repeated bullet characters
    const trimmedInput = dto.apiKey?.trim() || '';
    const isPlaceholder = trimmedInput && /^[•·●\u2022\u25CF\u00B7\s]+$/.test(trimmedInput) && trimmedInput.length <= 50;
    
    if (isPlaceholder) {
      // If it's a placeholder (security mask), use stored key from database
      const user = await this.userService.findByIdSelect(userId, {
        apiKey: true,
      });

      if (!user.apiKey) {
        throw new BadRequestException('请先输入或保存API密钥');
      }

      apiKey = user.apiKey;
    } else if (!trimmedInput) {
      // If input is empty (user cleared the field), require them to enter a key
      // Don't automatically use stored key - user must explicitly provide it
      throw new BadRequestException('请先输入API密钥');
    } else {
      // Use provided API key (user entered a new key)
      apiKey = this.cleanApiKey(dto.apiKey);
      if (!apiKey) {
        throw new BadRequestException('API密钥格式无效，请检查是否包含无效字符（如换行符等）');
      }
    }

    // Use custom API base URL if provided, otherwise try to get from active relay
    let baseUrl = dto.apiBaseUrl?.trim();
    let relayName = '';
    
    if (!baseUrl) {
      // Try to get baseUrl from active relay
      const activeRelay = await this.relayService.findActiveRelay();
      
      if (activeRelay?.baseUrl) {
        baseUrl = activeRelay.baseUrl;
        relayName = activeRelay.name || '';
      } else {
        baseUrl = 'https://api.openai.com'; // Fallback to default
      }
    }
    
    // ✅ URL格式验证已由@IsUrl装饰器完成（如果提供了apiBaseUrl）
    
    // Ensure baseUrl doesn't end with a slash
    if (!baseUrl) {
      throw new BadRequestException('API base URL is required');
    }
    const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
    const testUrl = `${normalizedBaseUrl}/v1/models`;
    
    // Log for debugging (in production, use proper logger)
    console.log(`[API Key Test] Using baseUrl: ${baseUrl}, testUrl: ${testUrl}${relayName ? `, relay: ${relayName}` : ''}`);

    try {
      // Test the API key by making a simple request to the API
      // Using models endpoint as it's lightweight
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(testUrl, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 10000, // 10 seconds timeout
        }),
      );

      // Strict validation: Check status code AND response data structure
      if (response.status === 200) {
        // Verify the response contains valid model data
        // A valid API response should have a 'data' array with model objects
        const responseData = response.data;
        
        // Check if response has the expected structure (OpenAI-compatible format)
        if (responseData && typeof responseData === 'object') {
          // Valid responses should have either:
          // 1. A 'data' array (OpenAI format: { data: [...] })
          // 2. Or at least not be an HTML page (check for common HTML tags)
          const responseStr = JSON.stringify(responseData).toLowerCase();
          
          // Reject if it looks like HTML (common HTML tags)
          if (responseStr.includes('<html') || 
              responseStr.includes('<!doctype') || 
              responseStr.includes('<body') ||
              responseStr.includes('<!DOCTYPE')) {
            throw new BadRequestException('API地址无效：返回的不是API响应，可能是网页地址');
          }
          
          // If response has 'data' array, verify it's not empty (at least one model)
          if (Array.isArray(responseData.data)) {
            if (responseData.data.length === 0) {
              throw new BadRequestException('API密钥验证失败：未返回任何模型');
            }
            // Success: valid response with models
            return {
              success: true,
              message: 'API密钥验证成功',
            };
          }
          
          // If response doesn't have 'data' array but is valid JSON, still accept it
          // (some APIs might use different formats)
          return {
            success: true,
            message: 'API密钥验证成功',
          };
        } else {
          throw new BadRequestException('API密钥验证失败：响应格式无效');
        }
      } else {
        throw new BadRequestException('API密钥验证失败');
      }
    } catch (error: any) {
      // Handle DNS resolution errors
      if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
        throw new BadRequestException(
          `无法解析域名：${baseUrl}。请检查：\n` +
          `1. 域名是否正确（当前：${baseUrl}）\n` +
          `2. 网络连接是否正常\n` +
          `3. 管理员配置的中转站地址是否正确\n` +
          `4. 如果使用本地环境，可能需要配置DNS或使用代理`
        );
      }
      
      if (error.response?.status === 401) {
        throw new BadRequestException('API密钥无效或已过期');
      } else if (error.response?.status === 429) {
        throw new BadRequestException('API请求频率过高，请稍后再试');
      } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new BadRequestException('连接超时，请检查网络');
      } else if (error.code === 'ECONNREFUSED') {
        throw new BadRequestException(`连接被拒绝：${baseUrl}。请检查地址是否正确或服务是否可用`);
      } else if (error.message?.includes('Invalid character in header')) {
        throw new BadRequestException('API密钥格式无效，可能包含换行符或其他无效字符。请重新输入密钥');
      } else {
        throw new BadRequestException('API密钥验证失败：' + (error.message || '未知错误'));
      }
    }
  }
}
