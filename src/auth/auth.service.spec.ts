import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockUser = {
  id: 'uuid-1',
  email: 'juan@test.com',
  firstName: 'Juan',
  lastName: 'Gomez',
  password: 'hashed_password',
  role: Role.STUDENT,
  isVerified: false,
  verificationCode: '123456',
  verificationCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUsersService = {
  create: jest.fn(),
  findByEmail: jest.fn(),
  saveVerificationCode: jest.fn(),
  markAsVerified: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed_token'),
};

const mockMailService = {
  sendVerificationCode: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    const dto = {
      email: mockUser.email,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
      password: 'Password12',
      role: Role.STUDENT,
    };

    it('should hash the password before creating the user', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUsersService.create.mockResolvedValue(mockUser);
      mockUsersService.saveVerificationCode.mockResolvedValue(mockUser);
      mockMailService.sendVerificationCode.mockResolvedValue(undefined);

      await service.register(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('Password12', 10);
      expect(mockUsersService.create).toHaveBeenCalledWith({
        ...dto,
        password: 'hashed_password',
      });
    });

    it('should generate and send a verification code after registration', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUsersService.create.mockResolvedValue(mockUser);
      mockUsersService.saveVerificationCode.mockResolvedValue(mockUser);
      mockMailService.sendVerificationCode.mockResolvedValue(undefined);

      await service.register(dto);

      expect(mockUsersService.saveVerificationCode).toHaveBeenCalledWith(
        mockUser.email,
        expect.stringMatching(/^\d{6}$/),
        expect.any(Date),
      );
      expect(mockMailService.sendVerificationCode).toHaveBeenCalledWith(
        mockUser.email,
        expect.stringMatching(/^\d{6}$/),
      );
    });

    it('should return the user without the password field', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUsersService.create.mockResolvedValue(mockUser);
      mockUsersService.saveVerificationCode.mockResolvedValue(mockUser);
      mockMailService.sendVerificationCode.mockResolvedValue(undefined);

      const result = await service.register(dto);

      expect(result).not.toHaveProperty('password');
      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
        isVerified: mockUser.isVerified,
      });
    });

    it('should propagate ConflictException when email is already in use', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUsersService.create.mockRejectedValue(new ConflictException('Email already in use'));

      await expect(service.register(dto)).rejects.toThrow(
        new ConflictException('Email already in use'),
      );
    });
  });

  describe('login', () => {
    const dto = { email: mockUser.email, password: 'Password12' };

    it('should throw UnauthorizedException when user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('should throw UnauthorizedException when password does not match', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('should return requiresVerification when user is not verified', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, isVerified: false });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(dto);

      expect(result).toEqual({
        requiresVerification: true,
        message: 'Account not verified. Please check your email for the verification code.',
      });
    });

    it('should return an accessToken when credentials are valid and user is verified', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, isVerified: true });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('signed_token');

      const result = await service.login(dto);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result).toEqual({ accessToken: 'signed_token' });
    });
  });

  describe('verifyEmail', () => {
    const dto = { email: mockUser.email, code: '123456' };

    it('should throw BadRequestException when user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.verifyEmail(dto)).rejects.toThrow(
        new BadRequestException('Invalid verification attempt'),
      );
    });

    it('should throw BadRequestException when user is already verified', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, isVerified: true });

      await expect(service.verifyEmail(dto)).rejects.toThrow(
        new BadRequestException('Account is already verified'),
      );
    });

    it('should throw BadRequestException when code does not match', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, verificationCode: '999999' });

      await expect(service.verifyEmail(dto)).rejects.toThrow(
        new BadRequestException('Invalid or expired verification code'),
      );
    });

    it('should throw BadRequestException when code is expired', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        verificationCodeExpiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.verifyEmail(dto)).rejects.toThrow(
        new BadRequestException('Invalid or expired verification code'),
      );
    });

    it('should mark user as verified when code is valid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUsersService.markAsVerified.mockResolvedValue({ ...mockUser, isVerified: true });

      const result = await service.verifyEmail(dto);

      expect(mockUsersService.markAsVerified).toHaveBeenCalledWith(mockUser.email);
      expect(result).toEqual({ message: 'Account verified successfully' });
    });
  });

  describe('resendVerification', () => {
    const dto = { email: mockUser.email };

    it('should throw BadRequestException when user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.resendVerification(dto)).rejects.toThrow(
        new BadRequestException('Invalid request'),
      );
    });

    it('should throw BadRequestException when user is already verified', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, isVerified: true });

      await expect(service.resendVerification(dto)).rejects.toThrow(
        new BadRequestException('Account is already verified'),
      );
    });

    it('should generate a new code and resend the email', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUsersService.saveVerificationCode.mockResolvedValue(mockUser);
      mockMailService.sendVerificationCode.mockResolvedValue(undefined);

      const result = await service.resendVerification(dto);

      expect(mockUsersService.saveVerificationCode).toHaveBeenCalledWith(
        mockUser.email,
        expect.stringMatching(/^\d{6}$/),
        expect.any(Date),
      );
      expect(mockMailService.sendVerificationCode).toHaveBeenCalledWith(
        mockUser.email,
        expect.stringMatching(/^\d{6}$/),
      );
      expect(result).toEqual({ message: 'Verification code resent successfully' });
    });
  });
});
