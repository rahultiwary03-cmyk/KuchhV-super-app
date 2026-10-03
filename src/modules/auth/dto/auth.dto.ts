import { IsEnum, IsOptional, Matches, MinLength } from 'class-validator';
import { Role } from '../enums/role.enum';

export class PhoneDto {
  @Matches(/^\+?[0-9]{10,15}$/)
  phone!: string;
}

export class VerifyOtpDto extends PhoneDto {
  @Matches(/^[0-9]{6}$/)
  otp!: string;
}

export class RegisterDto extends PhoneDto {
  @MinLength(1)
  name!: string;

  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

export class LoginDto extends PhoneDto {
  @MinLength(1)
  password!: string;
}
