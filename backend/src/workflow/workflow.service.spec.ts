import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  WorkflowExecutionException,
  SensitiveWordBlockedException,
  UpstreamUnauthorizedException,
  UpstreamRateLimitException,
} from '../common/exceptions/custom.exceptions';

describe('WorkflowService', () => {
  let service: WorkflowService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    aIDomain: {
      findUnique: jest.fn(),
    },
    relayConfig: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    systemConfig: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('executeWorkflow', () => {
    const mockUserId = 'user-123';
    const mockDomainId = 'domain-123';
    const mockUserInput = 'Hello, world!';

    const mockDomain = {
      id: mockDomainId,
      isVisible: true,
      isMaintenance: false,
      targetModel: 'gpt-4',
      workflowConfig: {
        steps: [
          {
            type: 'prompt',
            config: {
              template: 'You are a helpful assistant. User says: {{user_input}}',
            },
          },
          {
            type: 'api_call',
            config: {
              endpoint: '/v1/chat/completions',
            },
          },
        ],
      },
    };

    const mockRelayConfig = {
      id: 'relay-123',
      name: 'Test Relay',
      baseUrl: 'https://api.openai.com',
      isActive: true,
      availableModels: ['gpt-4', 'gpt-3.5-turbo'] as any, // Json type in Prisma
    };

    const mockUser = {
      id: mockUserId,
      apiKey: 'sk-test-key',
      status: 'ACTIVE',
    };

    beforeEach(() => {
      // Setup default mocks
      mockPrismaService.systemConfig.findUnique.mockResolvedValue(null);
      mockPrismaService.aIDomain.findUnique.mockResolvedValue(mockDomain);
      mockPrismaService.relayConfig.findFirst.mockResolvedValue(mockRelayConfig);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
    });

    it('should throw SensitiveWordBlockedException when input contains sensitive words', async () => {
      // Arrange
      const sensitiveWordsConfig = {
        key: 'sensitive_words',
        value: JSON.stringify(['洗稿', '抄袭']),
      };
      mockPrismaService.systemConfig.findUnique.mockResolvedValue(sensitiveWordsConfig);

      // Act & Assert
      await expect(
        service.executeWorkflow(mockUserId, mockDomainId, '我想洗稿这篇文章'),
      ).rejects.toThrow(SensitiveWordBlockedException);
    });

    it('should not block when no sensitive words are configured', async () => {
      // Arrange
      mockPrismaService.systemConfig.findUnique.mockResolvedValue(null);

      // Mock fetch for API call
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response from API' } }],
        }),
      });

      // Act
      const result = await service.executeWorkflow(mockUserId, mockDomainId, mockUserInput);

      // Assert
      expect(result).toBeDefined();
      expect(mockPrismaService.systemConfig.findUnique).toHaveBeenCalledWith({
        where: { key: 'sensitive_words' },
      });
    });

    it('should throw NotFoundException when domain does not exist', async () => {
      // Arrange
      mockPrismaService.aIDomain.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.executeWorkflow(mockUserId, mockDomainId, mockUserInput),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when domain is not visible', async () => {
      // Arrange
      mockPrismaService.aIDomain.findUnique.mockResolvedValue({
        ...mockDomain,
        isVisible: false,
      });

      // Act & Assert
      await expect(
        service.executeWorkflow(mockUserId, mockDomainId, mockUserInput),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when domain is in maintenance', async () => {
      // Arrange
      mockPrismaService.aIDomain.findUnique.mockResolvedValue({
        ...mockDomain,
        isMaintenance: true,
      });

      // Act & Assert
      await expect(
        service.executeWorkflow(mockUserId, mockDomainId, mockUserInput),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw WorkflowExecutionException when workflow config is missing', async () => {
      // Arrange
      mockPrismaService.aIDomain.findUnique.mockResolvedValue({
        ...mockDomain,
        workflowConfig: null,
      });

      // Act & Assert
      await expect(
        service.executeWorkflow(mockUserId, mockDomainId, mockUserInput),
      ).rejects.toThrow(WorkflowExecutionException);
    });

    it('should throw WorkflowExecutionException when no active relay config found', async () => {
      // Arrange
      mockPrismaService.relayConfig.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.executeWorkflow(mockUserId, mockDomainId, mockUserInput),
      ).rejects.toThrow(WorkflowExecutionException);
    });

    it('should throw WorkflowExecutionException when model is not in available models', async () => {
      // Arrange
      mockPrismaService.relayConfig.findFirst.mockResolvedValue({
        ...mockRelayConfig,
        availableModels: ['gpt-3.5-turbo'] as any, // gpt-4 not in list
      });

      // Act & Assert
      await expect(
        service.executeWorkflow(mockUserId, mockDomainId, mockUserInput),
      ).rejects.toThrow(WorkflowExecutionException);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.executeWorkflow(mockUserId, mockDomainId, mockUserInput),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user is not active', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: 'LOCKED',
      });

      // Act & Assert
      await expect(
        service.executeWorkflow(mockUserId, mockDomainId, mockUserInput),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw WorkflowExecutionException when user API key is missing', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        apiKey: null,
      });

      // Act & Assert
      await expect(
        service.executeWorkflow(mockUserId, mockDomainId, mockUserInput),
      ).rejects.toThrow(WorkflowExecutionException);
    });

    it('should throw UpstreamUnauthorizedException when API returns 401', async () => {
      // Arrange
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      // Act & Assert
      await expect(
        service.executeWorkflow(mockUserId, mockDomainId, mockUserInput),
      ).rejects.toThrow(UpstreamUnauthorizedException);
    });

    it('should throw UpstreamRateLimitException when API returns 429', async () => {
      // Arrange
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
      });

      // Act & Assert
      await expect(
        service.executeWorkflow(mockUserId, mockDomainId, mockUserInput),
      ).rejects.toThrow(UpstreamRateLimitException);
    });

    it('should execute workflow successfully and return final result', async () => {
      // Arrange
      const mockApiResponse = {
        choices: [{ message: { content: 'Final response from AI' } }],
      };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      // Act
      const result = await service.executeWorkflow(mockUserId, mockDomainId, mockUserInput);

      // Assert
      expect(result).toBe('Final response from AI');
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle case-insensitive sensitive word detection', async () => {
      // Arrange
      const sensitiveWordsConfig = {
        key: 'sensitive_words',
        value: JSON.stringify(['洗稿']),
      };
      mockPrismaService.systemConfig.findUnique.mockResolvedValue(sensitiveWordsConfig);

      // Act & Assert - Test uppercase
      await expect(
        service.executeWorkflow(mockUserId, mockDomainId, '我想洗稿这篇文章'),
      ).rejects.toThrow(SensitiveWordBlockedException);

      // Act & Assert - Test mixed case
      await expect(
        service.executeWorkflow(mockUserId, mockDomainId, '我想洗稿这篇文章'),
      ).rejects.toThrow(SensitiveWordBlockedException);
    });

    it('should skip sensitive word check when config has invalid JSON', async () => {
      // Arrange
      const invalidConfig = {
        key: 'sensitive_words',
        value: 'invalid json',
      };
      mockPrismaService.systemConfig.findUnique.mockResolvedValue(invalidConfig);

      // Mock fetch for API call
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      // Act - Should not throw
      await expect(
        service.executeWorkflow(mockUserId, mockDomainId, mockUserInput),
      ).resolves.toBeDefined();
    });
  });
});
