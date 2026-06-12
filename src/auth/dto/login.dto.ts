import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'juan@test.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password12' })
  @IsString()
  password: string;
}
