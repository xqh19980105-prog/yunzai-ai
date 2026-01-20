import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from '../../common/services/user.service';
import { LegalGateBlockedException, MembershipRequiredException } from '../../common/exceptions/custom.exceptions';

@Injectable()
export class LegalGateGuard implements CanActivate {
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

      // Check if user is a member (has active membership)
      const isMember = dbUser.membershipExpireAt && dbUser.membershipExpireAt > new Date();

      // Membership Gate: Block access if user is not a member
      if (!isMember) {
        throw new MembershipRequiredException();
      }

      // Legal Gate: Block access if is_member is true but is_legal_signed is false
      if (isMember && !dbUser.isLegalSigned) {
        throw new LegalGateBlockedException();
      }

      return true;
    } catch (error) {
      // UserService已处理用户不存在的情况，这里返回false
      // 如果是业务异常（MembershipRequiredException等），重新抛出
      if (error instanceof MembershipRequiredException || error instanceof LegalGateBlockedException) {
        throw error;
      }
      return false;
    }
  }
}
