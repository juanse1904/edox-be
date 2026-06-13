import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Role } from '@prisma/client';
import { Response } from 'express';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  verifyEmail: jest.fn(),
  resendVerification: jest.fn(),
};

const mockRes = { status: jest.fn().mockReturnThis() };

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  describe('register', () => {
    const dto = {
      email: 'juan@test.com',
      firstName: 'Juan',
      lastName: 'Gomez',
      password: 'Password12',
      role: Role.STUDENT,
    };

    const createdUser = {
      id: 'uuid-1',
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should call authService.register with the dto', async () => {
      mockAuthService.register.mockResolvedValue(createdUser);

      await controller.register(dto);

      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    });

    it('should return the result from authService', async () => {
      mockAuthService.register.mockResolvedValue(createdUser);

      const result = await controller.register(dto);

      expect(result).toEqual(createdUser);
    });
  });

  describe('login', () => {
    const dto = { email: 'juan@test.com', password: 'Password12' };
    const tokenResponse = { accessToken: 'signed_token' };

    it('should call authService.login with the dto', async () => {
      mockAuthService.login.mockResolvedValue(tokenResponse);

      await controller.login(dto, mockRes as unknown as Response);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    });

    it('should return the accessToken from authService', async () => {
      mockAuthService.login.mockResolvedValue(tokenResponse);

      const result = await controller.login(dto, mockRes as unknown as Response);

      expect(result).toEqual(tokenResponse);
    });

    it('should set status 202 when account requires verification', async () => {
      const unverifiedResponse = {
        requiresVerification: true,
        message: 'Account not verified. Please check your email for the verification code.',
      };
      mockAuthService.login.mockResolvedValue(unverifiedResponse);

      await controller.login(dto, mockRes as unknown as Response);

      expect(mockRes.status).toHaveBeenCalledWith(202);
    });
  });

  describe('verifyEmail', () => {
    const dto = { email: 'juan@test.com', code: '123456' };

    it('should call authService.verifyEmail with the dto', async () => {
      mockAuthService.verifyEmail.mockResolvedValue({ message: 'Account verified successfully' });

      await controller.verifyEmail(dto);

      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith(dto);
    });
  });

  describe('resendVerification', () => {
    const dto = { email: 'juan@test.com' };

    it('should call authService.resendVerification with the dto', async () => {
      mockAuthService.resendVerification.mockResolvedValue({ message: 'Verification code resent successfully' });

      await controller.resendVerification(dto);

      expect(mockAuthService.resendVerification).toHaveBeenCalledWith(dto);
    });
  });
});
