import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Public AI Domains Controller
 * Provides public access to visible AI domains (read-only)
 * Used for homepage display
 */
@Controller('api/ai-domains')
export class AIDomainsController {
  constructor(private prisma: PrismaService) {}

  /**
   * GET /api/ai-domains
   * Get all visible AI domains (public endpoint)
   */
  @Get()
  async getAIDomains() {
    try {
      const domains = await this.prisma.aIDomain.findMany({
        where: {
          isVisible: true,
          isMaintenance: false,
        },
        select: {
          id: true,
          title: true,
          description: true,
          icon: true,
          isVisible: true,
          isMaintenance: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: 'asc' },
      });

      return domains || [];
    } catch (error) {
      // Log error but return empty array to prevent frontend crashes
      console.error('Failed to get AI domains:', error);
      return [];
    }
  }

  /**
   * GET /api/ai-domains/active-relay
   * Get currently active relay information (public endpoint)
   * Used by frontend to show API key link and base URL for testing
   */
  @Get('active-relay')
  async getActiveRelay() {
    const relay = await this.prisma.relayConfig.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        baseUrl: true,
        apiKeyLink: true,
        buyLink: true,
      },
    });

    if (!relay) {
      return { 
        name: null, 
        baseUrl: null,
        apiKeyLink: null, 
        buyLink: null 
      };
    }

    return {
      name: relay.name,
      baseUrl: relay.baseUrl,
      apiKeyLink: relay.apiKeyLink,
      buyLink: relay.buyLink,
    };
  }

  /**
   * GET /api/ai-domains/:id
   * Get single AI domain by ID (public endpoint)
   */
  @Get(':id')
  async getAIDomainById(@Param('id') id: string) {
    const domain = await this.prisma.aIDomain.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        icon: true,
        isVisible: true,
        isMaintenance: true,
        targetModel: true,
      },
    });

    if (!domain) {
      throw new NotFoundException('AI Domain not found');
    }

    return domain;
  }
}
