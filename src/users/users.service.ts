import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('Email already in use');
    return this.prisma.user.create({ data });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async saveVerificationCode(email: string, code: string, expiresAt: Date) {
    return this.prisma.user.update({
      where: { email },
      data: { verificationCode: code, verificationCodeExpiresAt: expiresAt },
    });
  }

  async markAsVerified(email: string) {
    return this.prisma.user.update({
      where: { email },
      data: { isVerified: true, verificationCode: null, verificationCodeExpiresAt: null },
    });
  }
}
