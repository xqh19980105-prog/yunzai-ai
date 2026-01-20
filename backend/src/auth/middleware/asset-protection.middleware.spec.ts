import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response, NextFunction } from 'express';
import { AssetProtectionMiddleware } from './asset-protection.middleware';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AssetProtectionTriggeredException } from '../../common/exceptions/custom.exceptions';

describe('AssetProtectionMiddleware', () => {
  let middleware: AssetProtectionMiddleware;
  let prismaService: PrismaService;
  let redisService: RedisService;

  const mockPrismaService = {
    user: {
      update: jest.fn(),
    },
  };

  const mockRedisService = {
    isRedisAvailable: jest.fn(),
    getClient: jest.fn(),
    removeOldEntries: jest.fn(),
    addToSortedSet: jest.fn(),
    expire: jest.fn(),
    countInTimeWindow: jest.fn(),
  };

  const mockRedisClient = {
    zScore: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetProtectionMiddleware,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    middleware = module.get<AssetProtectionMiddleware>(AssetProtectionMiddleware);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);

    // Setup default mocks
    mockRedisService.isRedisAvailable.mockReturnValue(true);
    mockRedisService.getClient.mockReturnValue(mockRedisClient);
    mockRedisClient.zScore.mockResolvedValue(null);

    jest.clearAllMocks();
  });

  describe('use', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockRequest = {
        headers: {
          'user-agent': 'Mozilla/5.0',
          'accept-language': 'en-US',
          'accept-encoding': 'gzip',
        },
        ip: '127.0.0.1',
        socket: {
          remoteAddress: '127.0.0.1',
        },
      } as any;

      mockResponse = {
        setHeader: jest.fn(),
      } as any;

      mockNext = jest.fn();
    });

    it('should skip when no user is authenticated', async () => {
      // Arrange
      (mockRequest as any).user = null;

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRedisService.getClient).not.toHaveBeenCalled();
    });

    it('should skip when Redis is not available', async () => {
      // Arrange
      (mockRequest as any).user = { userId: 'user-123' };
      mockRedisService.isRedisAvailable.mockReturnValue(false);

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRedisService.getClient).not.toHaveBeenCalled();
    });

    it('should update existing device timestamp', async () => {
      // Arrange
      (mockRequest as any).user = { userId: 'user-123' };
      const existingTimestamp = Math.floor(Date.now() / 1000) - 1000;
      mockRedisClient.zScore.mockResolvedValue(existingTimestamp);
      mockRedisService.removeOldEntries.mockResolvedValue(undefined);
      mockRedisService.addToSortedSet.mockResolvedValue(undefined);

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRedisService.removeOldEntries).toHaveBeenCalled();
      expect(mockRedisService.addToSortedSet).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set yellow card warning when device count is 3', async () => {
      // Arrange
      (mockRequest as any).user = { userId: 'user-123' };
      mockRedisClient.zScore.mockResolvedValue(null); // New device
      mockRedisService.removeOldEntries.mockResolvedValue(undefined);
      mockRedisService.addToSortedSet.mockResolvedValue(undefined);
      mockRedisService.expire.mockResolvedValue(undefined);
      mockRedisService.countInTimeWindow.mockResolvedValue(3); // 3 devices

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Device-Warning', 'YELLOW:3');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set yellow card warning when device count is 4', async () => {
      // Arrange
      (mockRequest as any).user = { userId: 'user-123' };
      mockRedisClient.zScore.mockResolvedValue(null);
      mockRedisService.removeOldEntries.mockResolvedValue(undefined);
      mockRedisService.addToSortedSet.mockResolvedValue(undefined);
      mockRedisService.expire.mockResolvedValue(undefined);
      mockRedisService.countInTimeWindow.mockResolvedValue(4);

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Device-Warning', 'YELLOW:4');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should trigger asset protection when device count reaches 5', async () => {
      // Arrange
      (mockRequest as any).user = { userId: 'user-123' };
      mockRedisClient.zScore.mockResolvedValue(null);
      mockRedisService.removeOldEntries.mockResolvedValue(undefined);
      mockRedisService.addToSortedSet.mockResolvedValue(undefined);
      mockRedisService.expire.mockResolvedValue(undefined);
      mockRedisService.countInTimeWindow.mockResolvedValue(5);
      mockPrismaService.user.update.mockResolvedValue({});

      // Act & Assert
      await expect(
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext),
      ).rejects.toThrow(AssetProtectionTriggeredException);

      // Assert
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          status: 'LOCKED_ASSET_PROTECTION',
          apiKey: null,
          deviceFingerprintCount: 5,
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should trigger asset protection when device count exceeds 5', async () => {
      // Arrange
      (mockRequest as any).user = { userId: 'user-123' };
      mockRedisClient.zScore.mockResolvedValue(null);
      mockRedisService.removeOldEntries.mockResolvedValue(undefined);
      mockRedisService.addToSortedSet.mockResolvedValue(undefined);
      mockRedisService.expire.mockResolvedValue(undefined);
      mockRedisService.countInTimeWindow.mockResolvedValue(6);
      mockPrismaService.user.update.mockResolvedValue({});

      // Act & Assert
      await expect(
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext),
      ).rejects.toThrow(AssetProtectionTriggeredException);
      
      // Assert
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should not set warning when device count is less than 3', async () => {
      // Arrange
      (mockRequest as any).user = { userId: 'user-123' };
      mockRedisClient.zScore.mockResolvedValue(null);
      mockRedisService.removeOldEntries.mockResolvedValue(undefined);
      mockRedisService.addToSortedSet.mockResolvedValue(undefined);
      mockRedisService.expire.mockResolvedValue(undefined);
      mockRedisService.countInTimeWindow.mockResolvedValue(2);

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue on Redis error without blocking request', async () => {
      // Arrange
      (mockRequest as any).user = { userId: 'user-123' };
      mockRedisService.removeOldEntries.mockRejectedValue(new Error('Redis error'));

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled(); // Should continue despite error
    });

    it('should generate consistent device fingerprint', async () => {
      // Arrange
      (mockRequest as any).user = { userId: 'user-123' };
      mockRedisClient.zScore.mockResolvedValue(null);
      mockRedisService.removeOldEntries.mockResolvedValue(undefined);
      mockRedisService.addToSortedSet.mockResolvedValue(undefined);
      mockRedisService.expire.mockResolvedValue(undefined);
      mockRedisService.countInTimeWindow.mockResolvedValue(1);

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRedisService.addToSortedSet).toHaveBeenCalled();
      const callArgs = mockRedisService.addToSortedSet.mock.calls[0];
      expect(callArgs[0]).toBe('device_fingerprints:user-123');
      expect(callArgs[1]).toBeDefined(); // Fingerprint should be generated
    });
  });
});
