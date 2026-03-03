import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async getTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async updateRefreshTokenHash(userId: string, refreshToken: string) {
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(refreshToken, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hash },
    });
  }

  async refreshTokens(refreshToken: string) {
    // Тут ми розкодовуємо токен, щоб знайти userId
    let payload;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch (e) {
      throw new ForbiddenException('Invalid Refresh Token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Access Denied');
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!refreshTokenMatches) {
      throw new ForbiddenException('Access Denied');
    }

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return tokens;
  }

  async register(dto: RegisterDto) {
    const newUser = await this.userService.create({
      ...dto,
      role: dto.role || Role.HOLDER,
    });

    const tokens = await this.getTokens(newUser.id, newUser.email, newUser.role);
    await this.updateRefreshTokenHash(newUser.id, tokens.refreshToken);

    return tokens; //{ accessToken, refreshToken }
  }

  async loginWithPassword(dto: LoginDto) {
    const user = await this.userService.findOneByEmail(dto.email);

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password as string, user.password as string);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Якщо користувач успішно зайшов за паролем, ми розблоковуємо його ПІН-код
    if (user.pinAttempts > 0) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { pinAttempts: 0 },
      });
    }

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.updateMany({
      where: { id: userId, refreshToken: { not: null } },
      data: { refreshToken: null },
    });
  }
}
