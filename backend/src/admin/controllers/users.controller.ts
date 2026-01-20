import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from '../../common/services/user.service';
import { UuidParam } from '../../common/decorators/uuid-param.decorator';
import { ErrorCodes } from '../../common/constants/error-codes';

type UserStatus = 'ACTIVE' | 'BANNED' | 'LOCKED_ASSET_PROTECTION';

/**
 * 用户管理控制器
 * 负责用户列表查询、用户详情、状态管理
 */
@Controller('api/admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUsersController {
  private readonly logger = new Logger(AdminUsersController.name);

  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  /**
   * GET /api/admin/users
   * 获取用户列表（支持分页和筛选）
   */
  @Get()
  async getUsers(
    @Query('status') status?: string,
    @Query('membershipStatus') membershipStatus?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const pageNum = parseInt(page || '1', 10);
      const limitNum = parseInt(limit || '50', 10);

      const where: { status?: UserStatus; email?: { contains: string; mode: 'insensitive' } } = {};
      if (status && ['ACTIVE', 'BANNED', 'LOCKED_ASSET_PROTECTION'].includes(status)) {
        where.status = status as UserStatus;
      }
      if (search) {
        where.email = { contains: search, mode: 'insensitive' };
      }

      // 获取用户列表
      const allUsers = await this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          status: true,
          membershipExpireAt: true,
          isLegalSigned: true,
          deviceFingerprintCount: true,
          createdAt: true,
          updatedAt: true,
          registeredIp: true,
          lastLoginIp: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // 添加管理员标识
      let usersWithAdminFlag = allUsers.map((user) => ({
        ...user,
        isAdmin: user.email?.toLowerCase().includes('admin') || false,
      }));

      // 按会员状态筛选
      if (membershipStatus && ['member', 'non-member', 'expired'].includes(membershipStatus)) {
        const now = new Date();
        usersWithAdminFlag = usersWithAdminFlag.filter((user) => {
          const hasValidMembership = user.membershipExpireAt && new Date(user.membershipExpireAt) > now;
          const hasExpiredMembership = user.membershipExpireAt && new Date(user.membershipExpireAt) <= now;

          if (membershipStatus === 'member') return hasValidMembership;
          if (membershipStatus === 'non-member') return !user.membershipExpireAt;
          if (membershipStatus === 'expired') return hasExpiredMembership;
          return true;
        });
      }

      // 排序：管理员优先，然后按创建时间倒序
      usersWithAdminFlag.sort((a, b) => {
        if (a.isAdmin && !b.isAdmin) return -1;
        if (!a.isAdmin && b.isAdmin) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      // 分页
      const total = usersWithAdminFlag.length;
      const skip = (pageNum - 1) * limitNum;
      const users = usersWithAdminFlag.slice(skip, skip + limitNum);

      return {
        users: users || [],
        total: total || 0,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      };
    } catch (error) {
      this.logger.error(
        `获取用户列表失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        {
          code: 'GET_USERS_FAILED',
          message: '获取用户列表失败，请稍后重试',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/admin/users/:id
   * 获取用户详情
   */
  @Get(':id')
  async getUser(@UuidParam('id') id: string) {
    try {
      this.logger.log(`获取用户详情: ${id}`);

      // 获取基本用户信息
      let userBase;
      try {
        userBase = await this.userService.findByIdSelect(id, {
          id: true,
          email: true,
          status: true,
          membershipExpireAt: true,
          isLegalSigned: true,
          deviceFingerprintCount: true,
          createdAt: true,
          updatedAt: true,
        });
      } catch (error: unknown) {
        if (error instanceof BadRequestException) {
          throw new HttpException(
            { code: ErrorCodes.USER_NOT_FOUND, message: '用户不存在' },
            HttpStatus.NOT_FOUND,
          );
        }
        throw error;
      }

      // 获取IP信息
      let registeredIp: string | null = null;
      let lastLoginIp: string | null = null;
      try {
        const userWithIp = await this.userService.findByIdSelect(id, {
          registeredIp: true,
          lastLoginIp: true,
        });
        registeredIp = userWithIp.registeredIp || null;
        lastLoginIp = userWithIp.lastLoginIp || null;
      } catch {
        this.logger.warn('IP字段可能不存在');
      }

      // 获取法律日志
      const legalLogs = await this.prisma.legalLog.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }).catch(() => []);

      // 获取聊天历史
      const chatHistories = await this.prisma.chatHistory.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
          domain: { select: { id: true, title: true } },
        },
      }).catch(() => []);

      // 获取设备列表
      const devices = await this.prisma.device.findMany({
        where: { userId: id },
        orderBy: { lastUsedAt: 'desc' },
        select: {
          id: true,
          fingerprint: true,
          ip: true,
          userAgent: true,
          isActive: true,
          lastUsedAt: true,
          createdAt: true,
        },
      }).catch(() => []);

      // 获取激活码使用记录
      const activationCodes = await this.prisma.activationCode.findMany({
        where: { usedBy: id },
        orderBy: { usedAt: 'desc' },
        select: {
          code: true,
          days: true,
          batchTag: true,
          usedAt: true,
          createdAt: true,
        },
      }).catch(() => []);

      // 获取状态变更日志
      const statusLogs = await this.prisma.userStatusLog.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          previousStatus: true,
          newStatus: true,
          reason: true,
          operatorEmail: true,
          ip: true,
          createdAt: true,
        },
      }).catch(() => []);

      // 计算会员激活时间
      const sortedByUsedAt = [...activationCodes].sort((a, b) => {
        if (!a.usedAt) return 1;
        if (!b.usedAt) return -1;
        return new Date(a.usedAt).getTime() - new Date(b.usedAt).getTime();
      });
      const membershipActivatedAt = sortedByUsedAt.length > 0 && sortedByUsedAt[0].usedAt
        ? sortedByUsedAt[0].usedAt
        : null;

      this.logger.log(`成功获取用户详情: ${userBase.email}`);

      return {
        ...userBase,
        registeredIp,
        lastLoginIp,
        legalLogs,
        chatHistories,
        devices,
        activationCodes,
        statusLogs,
        membershipActivatedAt,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error(
        `获取用户详情失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        {
          code: ErrorCodes.INTERNAL_ERROR,
          message: `获取用户详情失败: ${error instanceof Error ? error.message : '未知错误'}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * PUT /api/admin/users/:id/status
   * 更新用户状态（需要填写原因）
   */
  @Put(':id/status')
  async updateUserStatus(
    @Param('id') id: string,
    @Body() body: { status: UserStatus; reason: string },
    @Request() req: { user: { email: string }; ip?: string; connection?: { remoteAddress?: string } },
  ) {
    if (!body.reason || body.reason.trim().length === 0) {
      throw new HttpException(
        { code: 'REASON_REQUIRED', message: '必须填写状态变更原因' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // 获取当前用户状态
    const currentUser = await this.userService.findByIdSelect(id, {
      status: true,
      email: true,
    });

    // 获取操作者信息
    const operatorEmail = req.user.email || 'unknown';
    const operatorIp = req.ip || req.connection?.remoteAddress || null;

    // 更新状态并创建日志
    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { status: body.status },
        select: { id: true, email: true, status: true },
      }),
      this.prisma.userStatusLog.create({
        data: {
          userId: id,
          previousStatus: currentUser.status,
          newStatus: body.status,
          reason: body.reason.trim(),
          operatorEmail,
          ip: operatorIp,
        },
      }),
    ]);

    this.logger.log(
      `用户状态已更新: ${currentUser.email} (${id}) 从 ${currentUser.status} 变更为 ${body.status}，操作者: ${operatorEmail}，原因: ${body.reason}`,
    );

    return user;
  }

  /**
   * PUT /api/admin/users/:id/membership
   * 会员只能通过激活码激活（此接口已禁用）
   */
  @Put(':id/membership')
  async updateUserMembership() {
    throw new HttpException(
      {
        code: 'MEMBERSHIP_UPDATE_DISABLED',
        message: '会员只能通过激活码激活，不支持直接设置会员时间',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
