import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

const OTP_EXPIRY_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({ ...dto, password: hashed });

    const code = this.generateOtp();
    const expiresAt = this.otpExpiresAt();
    await this.usersService.saveVerificationCode(user.email, code, expiresAt);
    await this.mailService.sendVerificationCode(user.email, code);

    const { password: _, ...result } = user;
    return result;
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    if (!user.isVerified) {
      return {
        requiresVerification: true,
        message: 'Account not verified. Please check your email for the verification code.',
      };
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return { accessToken: this.jwtService.sign(payload) };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new BadRequestException('Invalid verification attempt');

    if (user.isVerified) throw new BadRequestException('Account is already verified');

    if (
      !user.verificationCode ||
      !user.verificationCodeExpiresAt ||
      user.verificationCode !== dto.code ||
      user.verificationCodeExpiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    await this.usersService.markAsVerified(user.email);
    return { message: 'Account verified successfully' };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new BadRequestException('Invalid request');

    if (user.isVerified) throw new BadRequestException('Account is already verified');

    const code = this.generateOtp();
    const expiresAt = this.otpExpiresAt();
    await this.usersService.saveVerificationCode(user.email, code, expiresAt);
    await this.mailService.sendVerificationCode(user.email, code);

    return { message: 'Verification code resent successfully' };
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private otpExpiresAt(): Date {
    return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  }
}
