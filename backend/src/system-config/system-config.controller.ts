import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Public System Config Controller
 * Provides public access to system configuration (read-only)
 * Admin endpoints are in AdminController
 */
@Controller('api/system-config')
export class SystemConfigController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getSystemConfig() {
    try {
      const configs = await this.prisma.systemConfig.findMany();
      
      // Return as key-value array
      return (configs || []).map((config: { key: string; value: string }) => ({
        key: config.key,
        value: config.value,
      }));
    } catch (error) {
      // Log error but return empty array to prevent frontend crashes
      console.error('Failed to get system config:', error);
      return [];
    }
  }
}
