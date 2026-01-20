import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let redisService: RedisService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockRedisService = {
    isRedisAvailable: jest.fn(),
    getClient: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockRedisClient = {
    keys: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
    jwtService = module.get<JwtService>(JwtService);

    // Setup default mocks
    mockRedisService.isRedisAvailable.mockReturnValue(true);
    mockRedisService.getClient.mockReturnValue(mockRedisClient);
    mockRedisClient.keys.mockResolvedValue([]);
    mockRedisClient.del.mockResolvedValue(0);

    jest.clearAllMocks();
  });

  describe('login', () => {
    const mockEmail = 'test@example.com';
    const mockPassword = 'password123';
    const mockHashedPassword = 'hashed_password';

    const mockUser = {
      id: 'user-123',
      email: mockEmail,
      passwordHash: mockHashedPassword,
      status: 'ACTIVE',
    };

    beforeEach(() => {
      // Mock bcrypt
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(mockEmail, mockPassword)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      // Act & Assert
      await expect(service.login(mockEmail, mockPassword)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is not active', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: 'LOCKED',
      });

      // Act & Assert
      await expect(service.login(mockEmail, mockPassword)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should invalidate old sessions on login (SSO)', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockRedisService.get.mockResolvedValue('old-session-id');
      mockRedisService.del.mockResolvedValue(undefined);

      // Act
      await service.login(mockEmail, mockPassword);

      // Assert
      expect(mockRedisService.get).toHaveBeenCalledWith('user:user-123:active_session');
      expect(mockRedisService.del).toHaveBeenCalledWith('session:user-123:old-session-id');
      expect(mockRedisService.del).toHaveBeenCalledWith('user:user-123:active_session');
    });

    it('should return access token and user on successful login', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.login(mockEmail, mockPassword);

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should skip session invalidation when Redis is not available', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockRedisService.isRedisAvailable.mockReturnValue(false);

      // Act
      await service.login(mockEmail, mockPassword);

      // Assert
      expect(mockRedisClient.keys).not.toHaveBeenCalled();
    });
  });

  describe('validateSession', () => {
    const mockUserId = 'user-123';
    const mockSessionId = 'session-123';

    it('should return session payload when session is valid', async () => {
      // Arrange
      const mockPayload = {
        userId: mockUserId,
        email: 'test@example.com',
        sessionId: mockSessionId,
      };
      mockRedisService.get.mockResolvedValue(JSON.stringify(mockPayload));

      // Act
      const result = await service.validateSession(mockUserId, mockSessionId);

      // Assert
      expect(result).toEqual(mockPayload);
      expect(mockRedisService.get).toHaveBeenCalledWith(`session:${mockUserId}:${mockSessionId}`);
    });

    it('should return null when session does not exist', async () => {
      // Arrange
      mockRedisService.get.mockResolvedValue(null); // Session not found

      // Act
      const result = await service.validateSession(mockUserId, mockSessionId);

      // Assert
      expect(result).toBeNull();
      expect(mockRedisService.get).toHaveBeenCalledWith(`session:${mockUserId}:${mockSessionId}`);
    });

    it('should return basic payload when Redis is not available', async () => {
      // Arrange
      mockRedisService.isRedisAvailable.mockReturnValue(false);

      // Act
      const result = await service.validateSession(mockUserId, mockSessionId);

      // Assert
      expect(result).toEqual({
        userId: mockUserId,
        email: '',
        sessionId: mockSessionId,
      });
    });
  });
});
