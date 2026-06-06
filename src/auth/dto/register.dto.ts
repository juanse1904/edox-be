import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, Matches, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'Password12' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=(?:.*\d){2})(?=.*[A-Z]).+$/, {
    message: 'password must contain at least 2 numbers and 1 uppercase letter',
  })
  password: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role, { message: `role must be one of: ${Object.values(Role).join(', ')}` })
  role: Role;
}
