import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from '../../common/services/user.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // ✅ 使用UserService统一查询
    try {
      const dbUser = await this.userService.findByIdOrThrow(user.userId);

      // Check if user is an admin (email ends with @admin.com)
      // This matches the login logic where usernames without @ are appended with @admin.com
      const isAdmin = dbUser.email.endsWith('@admin.com');

      if (!isAdmin) {
        throw new ForbiddenException('需要管理员权限');
      }

      return true;
    } catch (error) {
      // UserService已处理用户不存在的情况，这里返回false
      return false;
    }
  }
}
