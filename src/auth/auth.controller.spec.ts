import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Role } from '@prisma/client';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
};

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

      await controller.login(dto);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    });

    it('should return the accessToken from authService', async () => {
      mockAuthService.login.mockResolvedValue(tokenResponse);

      const result = await controller.login(dto);

      expect(result).toEqual(tokenResponse);
    });
  });
});
