/**
 * 【代码功能诊断】
 * 
 * 本文件实现的功能：
 * 1. 用户登录验证：验证邮箱密码，创建JWT token和Redis会话
 * 2. 会话验证和管理：验证JWT token对应的Redis会话是否存在，支持会话恢复
 * 3. 设备信息记录：记录用户登录时的设备指纹、IP等信息（仅用于统计）
 * 4. 会话清除和登出：清除指定会话或用户的所有会话
 * 
 * 设计特点：
 * - 支持多设备同时登录（无SSO限制）
 * - 使用Redis存储会话，支持滑动过期（每次验证刷新过期时间）
 * - 支持开发环境下Redis不可用时的降级处理
 */

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../common/services/user.service';
import { SessionService, SessionPayload } from './services/session.service'; // 【P1-2修复】会话管理服务

// 重新导出 SessionPayload 以供其他模块使用
export type { SessionPayload };
import { DeviceService } from './services/device.service'; // 【P1-2修复】设备管理服务
import { Request } from 'express';
import * as bcrypt from 'bcryptjs';

/**
 * 【P1-2修复】AuthService重构
 * 
 * 职责：用户认证
 * - 验证用户凭据（邮箱、密码）
 * - 生成JWT token
 * - 协调SessionService和DeviceService
 * - 不直接处理会话管理和设备管理
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private userService: UserService,
    private sessionService: SessionService, // 【P1-2修复】会话管理服务
    private deviceService: DeviceService, // 【P1-2修复】设备管理服务
  ) {}

  /**
   * 【P1-2修复】Login: Simple login without SSO restrictions
   * 
   * 重构后的职责：
   * 1. 验证用户凭据（邮箱、密码）
   * 2. 生成JWT token
   * 3. 协调SessionService创建会话
   * 4. 协调DeviceService记录设备
   */
  async login(
    email: string,
    password: string,
    req?: Request,
    browserFingerprint?: string,
  ): Promise<{ accessToken: string; user: any }> {
    // 支持仅用户名登录：如果输入不包含@，自动追加@admin.com
    let loginEmail = email.trim();
    if (!loginEmail.includes('@')) {
      loginEmail = `${loginEmail}@admin.com`;
    }

    // 1. 查找用户
    const user = await this.userService.findByEmail(loginEmail);

    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 2. 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 3. 检查用户状态
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('账户已被锁定或禁用');
    }

    // 4. 【P1-2修复】创建会话（使用SessionService）
    const { sessionId, payload } = await this.sessionService.createSession(
      user.id,
      user.email,
    );

    // 5. 生成JWT token
    const accessToken = this.jwtService.sign(payload);

    // 6. 【P1-2修复】记录设备信息（使用DeviceService）
    if (req) {
      await this.deviceService.recordDevice(user.id, req, browserFingerprint);
    }

    // 7. 移除敏感数据
    const { passwordHash, apiKey, ...userWithoutSensitive } = user;

    return {
      accessToken,
      user: userWithoutSensitive,
    };
  }

  /**
   * 【P1-2修复】Validate session from Redis
   * 
   * 重构后的职责：
   * - 委托给SessionService处理会话验证
   */
  async validateSession(
    userId: string,
    sessionId: string,
    req?: Request,
  ): Promise<SessionPayload | null> {
    return await this.sessionService.validateSession(userId, sessionId, req);
  }

  /**
   * 【P1-2修复】Logout: Remove session from Redis
   * 
   * 重构后的职责：
   * - 委托给SessionService处理登出
   */
  async logout(userId: string, sessionId: string): Promise<void> {
    return await this.sessionService.logout(userId, sessionId);
  }

  /**
   * 【P1-2修复】Invalidate user sessions
   * 
   * 重构后的职责：
   * - 委托给SessionService处理会话清除
   */
  async invalidateUserSessions(userId: string, newSessionId?: string): Promise<void> {
    return await this.sessionService.invalidateUserSessions(userId, newSessionId);
  }

}
