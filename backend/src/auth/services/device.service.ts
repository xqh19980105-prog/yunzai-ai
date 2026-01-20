import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';
import { getClientIp } from '../../common/utils/ip.util';
import { getDeviceFingerprint } from '../../common/utils/device.util';

/**
 * 【P1-2修复】DeviceService
 * 
 * 职责：设备管理
 * - 记录设备信息
 * - 更新设备信息
 * - 获取设备数量
 * - 验证设备是否允许
 */
@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 记录或更新设备信息
   */
  async recordDevice(
    userId: string,
    req: Request,
    browserFingerprint?: string,
  ): Promise<void> {
    const deviceFingerprint = getDeviceFingerprint(req, browserFingerprint);
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || null;

    if (!deviceFingerprint || !clientIp || clientIp === 'unknown') {
      this.logger.debug(
        `Skipping device recording: deviceFingerprint=${!!deviceFingerprint}, clientIp=${clientIp}`,
      );
      return;
    }

    try {
      const existingDevice = await this.prisma.device.findFirst({
        where: {
          userId,
          fingerprint: deviceFingerprint,
        },
      });

      let isNewDevice = false;
      if (existingDevice) {
        // 更新现有设备信息
        await this.prisma.device.update({
          where: { id: existingDevice.id },
          data: {
            ip: clientIp,
            userAgent: userAgent,
            lastUsedAt: new Date(),
            isActive: true,
          },
        });
      } else {
        // 创建新设备记录
        await this.prisma.device.create({
          data: {
            userId,
            fingerprint: deviceFingerprint,
            ip: clientIp,
            userAgent: userAgent,
            isActive: true,
          },
        });
        isNewDevice = true;
      }

      // 更新用户的设备数量统计
      const deviceCount = await this.prisma.device.count({
        where: { userId },
      });

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lastLoginIp: clientIp,
          deviceFingerprintCount: deviceCount,
        },
      });

      this.logger.log(
        `Device info recorded: userId=${userId}, isNewDevice=${isNewDevice}, deviceCount=${deviceCount}`,
      );
    } catch (error) {
      this.logger.warn(`Failed to record device info for user ${userId}`, error);
    }
  }

  /**
   * 获取设备数量
   */
  async getDeviceCount(userId: string): Promise<number> {
    return await this.prisma.device.count({
      where: { userId },
    });
  }

  /**
   * 验证设备是否允许（用于会话恢复）
   */
  async isDeviceAllowed(
    userId: string,
    fingerprint: string,
  ): Promise<boolean> {
    const device = await this.prisma.device.findFirst({
      where: {
        userId,
        fingerprint,
        isActive: true,
      },
    });

    return !!device;
  }

  /**
   * 获取用户的所有设备
   */
  async getUserDevices(userId: string) {
    return await this.prisma.device.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' },
    });
  }
}