import { Controller, Post, Body, BadRequestException, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { ActivationService } from './services/activation.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../common/services/user.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserId } from '../common/decorators/user-id.decorator';
import { Request } from 'express';
import * as bcrypt from 'bcryptjs';
import { getClientIp } from '../common/utils/ip.util';
import { getDeviceFingerprint } from '../common/utils/device.util';
import { createZodPipe } from '../common/pipes/zod-validation.pipe';

// Zod schemas for validation
const loginSchema = z.object({
  email: z.string({ message: '邮箱必须是字符串' }).min(1, '邮箱不能为空').email('邮箱格式无效'),
  password: z.string({ message: '密码必须是字符串' }).min(1, '密码不能为空'),
  turnstileToken: z.string({ message: 'Turnstile token必须是字符串' }).optional(),
  browserFingerprint: z.string({ message: '浏览器指纹必须是字符串' }).optional(),
});

const registerSchema = z.object({
  email: z.string({ message: '邮箱必须是字符串' }).min(1, '邮箱不能为空').email('邮箱格式无效'),
  password: z.string({ message: '密码必须是字符串' }).min(1, '密码不能为空').min(8, '密码长度至少为8位'),
  turnstileToken: z.string({ message: 'Turnstile token必须是字符串' }).optional(),
});

type LoginDto = z.infer<typeof loginSchema>;
type RegisterDto = z.infer<typeof registerSchema>;

@ApiTags('认证 (Auth)')
@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private activationService: ActivationService,
    private userService: UserService,
    private prisma: PrismaService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: '用户登录', description: '使用邮箱和密码登录，返回JWT token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', example: 'user@example.com' },
        password: { type: 'string', example: 'password123' },
        turnstileToken: { type: 'string' },
        browserFingerprint: { type: 'string' },
      },
      required: ['email', 'password'],
    },
  })
  @ApiResponse({ status: 200, description: '登录成功，返回accessToken和用户信息' })
  @ApiResponse({ status: 401, description: '邮箱或密码错误' })
  async login(@Body(createZodPipe(loginSchema)) dto: LoginDto, @Req() req: Request) {
    // Turnstile token validation can be added here if needed
    // For now, we'll just ignore it for admin convenience
    
    const result = await this.authService.login(
      dto.email, 
      dto.password,
      req, // Pass request for device tracking
      dto.browserFingerprint, // Pass enhanced browser fingerprint
    );
    
    return result;
  }

  @Post('register')
  @ApiOperation({ summary: '用户注册', description: '注册新用户并自动登录' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', example: 'user@example.com' },
        password: { type: 'string', minLength: 8, example: 'password123' },
        turnstileToken: { type: 'string' },
      },
      required: ['email', 'password'],
    },
  })
  @ApiResponse({ status: 200, description: '注册成功，返回accessToken和用户信息' })
  @ApiResponse({ status: 400, description: '该邮箱已被注册' })
  async register(@Body(createZodPipe(registerSchema)) dto: RegisterDto, @Req() req: Request) {
    // Check if user already exists
    const existingUser = await this.userService.findByEmail(dto.email);

    if (existingUser) {
      throw new BadRequestException('该邮箱已被注册');
    }

    // Get client IP for registration
    const clientIp = getClientIp(req);
    const registrationIp = clientIp && clientIp !== 'unknown' ? clientIp : null;

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user with registration IP
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        status: 'ACTIVE',
        registeredIp: registrationIp,
        lastLoginIp: registrationIp, // Also set as first login IP
      },
    });

    // Auto-login after registration (with device tracking)
    const result = await this.authService.login(dto.email, dto.password, req);

    return result;
  }

  /**
   * GET /api/auth/me
   * Get current user info
   */
  @Post('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取当前用户信息', description: '需要JWT认证' })
  @ApiResponse({ status: 200, description: '返回当前用户信息' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getMe(@UserId() userId: string) {
    return this.userService.findByIdSelect(userId, {
      id: true,
      email: true,
      membershipExpireAt: true,
      isLegalSigned: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    });
  }

  @Post('activate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '激活激活码', description: '使用激活码延长会员时长' })
  @ApiResponse({ status: 200, description: '激活成功' })
  @ApiResponse({ status: 400, description: '激活码无效或已使用' })
  async activateCode(
    @UserId() userId: string,
    @Body(createZodPipe(z.object({ code: z.string().min(1, '激活码不能为空') }))) body: { code: string },
  ) {
    const membershipExpireAt = await this.activationService.useActivationCode(
      userId,
      body.code,
    );

    return {
      success: true,
      membershipExpireAt,
    };
  }
}
