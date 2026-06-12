import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
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
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUsersService = {
  create: jest.fn(),
  findByEmail: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed_token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
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

      await service.register(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('Password12', 10);
      expect(mockUsersService.create).toHaveBeenCalledWith({
        ...dto,
        password: 'hashed_password',
      });
    });

    it('should return the user without the password field', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUsersService.create.mockResolvedValue(mockUser);

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

    it('should return an accessToken when credentials are valid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
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
});
