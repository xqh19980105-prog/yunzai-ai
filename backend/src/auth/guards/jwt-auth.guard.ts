import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { SessionPayload } from '../services/session.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest<TUser = SessionPayload>(err: Error | null, user: TUser | false, info: Error | null, context: ExecutionContext, status?: number): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('未授权访问');
    }
    return user as TUser;
  }
}
