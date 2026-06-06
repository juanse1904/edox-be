import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import { Role } from '@prisma/client';

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

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw ConflictException when email is already in use', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.create({ ...mockUser })).rejects.toThrow(
        new ConflictException('Email already in use'),
      );
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should create and return the user when email is not taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await service.create({ ...mockUser });

      expect(mockPrisma.user.create).toHaveBeenCalledWith({ data: { ...mockUser } });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByEmail', () => {
    it('should return the user when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail(mockUser.email);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: mockUser.email } });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@test.com');

      expect(result).toBeNull();
    });
  });
});
