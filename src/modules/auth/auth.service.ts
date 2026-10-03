import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { Role } from './enums/role.enum';
import { UserEntity } from '../users/user.entity';

interface StoredOtp {
  code: string;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  private readonly otpStore = new Map<string, StoredOtp>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async sendOtp(phone: string) {
    const code = randomInt(100000, 1000000).toString();
    this.otpStore.set(phone, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    console.log(`[SMS Gateway] OTP for ${phone}: ${code}`);
    return { success: true, message: `OTP sent successfully to ${phone}` };
  }

  async verifyOtp(phone: string, otp: string) {
    const storedOtp = this.otpStore.get(phone);
    if (
      !storedOtp ||
      storedOtp.expiresAt <= Date.now() ||
      storedOtp.code !== otp
    ) {
      this.otpStore.delete(phone);
      throw new BadRequestException('Invalid or expired OTP');
    }
    this.otpStore.delete(phone);

    let user = await this.userRepo.findOne({ where: { phone } });
    if (!user) {
      user = await this.userRepo.save(
        this.userRepo.create({
          name: phone,
          phone,
          role: Role.CUSTOMER,
        }),
      );
    }

    return this.generateTokens(user);
  }

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new BadRequestException('User already exists');
    }
    if (dto.role === Role.ADMIN) {
      throw new BadRequestException('Cannot register an admin account');
    }

    const user = this.userRepo.create({
      name: dto.name,
      phone: dto.phone,
      role: dto.role ?? Role.CUSTOMER,
      password_hash: await bcrypt.hash(dto.password, 10),
    });
    await this.userRepo.save(user);

    return { success: true, message: 'User registered successfully' };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (
      !user?.password_hash ||
      !(await bcrypt.compare(dto.password, user.password_hash))
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status === 'BLOCKED' || user.status === 'REJECTED') {
      throw new UnauthorizedException('Account is not active');
    }
    return this.generateTokens(user);
  }

  private async generateTokens(user: UserEntity) {
    const payload = { sub: user.id, phone: user.phone, role: user.role };
    const refreshSecret = this.configService.getOrThrow<string>(
      'JWT_REFRESH_SECRET',
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '15m' }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: '7d',
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}
