import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { SessionPayload } from '../services/session.service';
import { ErrorCodes } from '../../common/constants/error-codes';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
      passReqToCallback: true, // 【P0-2修复】传递Request对象到validate方法
    } as StrategyOptions);
  }

  async validate(
    req: Request,
    payload: SessionPayload,
  ): Promise<SessionPayload> {
    // Validate session exists in Redis (SSO check)
    // 【P0-2修复】传递Request对象以支持设备指纹验证
    // 如果Redis会话丢失，validateSession会尝试恢复会话，并验证设备指纹
    const session = await this.authService.validateSession(
      payload.userId,
      payload.sessionId,
      req, // 【P0-2修复】传递Request对象
    );

    if (!session) {
      // 添加详细日志以便调试
      console.warn(`[JWT] Session validation failed for user ${payload.userId}`, {
        sessionId: payload.sessionId.substring(0, 16) + '...',
        userId: payload.userId,
        email: payload.email,
        possibleReasons: [
          'Redis session expired or was cleared',
          'User account was deactivated',
          'Session was invalidated',
          'Redis connection failed',
          'Session restore blocked (too many attempts or unknown device)', // 【P0-2修复】添加新原因
        ],
      });

      // 抛出明确的错误消息，帮助前端区分不同的 401 场景
      // 使用对象格式确保错误消息能正确传递到前端
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_SESSION_EXPIRED,
        message: 'SESSION_EXPIRED',
      });
    }

    return session;
  }
}
