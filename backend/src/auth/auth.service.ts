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
import { RegisterIssuerDto } from './dto/register-issuer.dto';
import { PinLoginDto } from './dto/pin-login.dto';

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
      role: Role.HOLDER,
    });

    const tokens = await this.getTokens(newUser.id, newUser.email, newUser.role);
    await this.updateRefreshTokenHash(newUser.id, tokens.refreshToken);

    return tokens; //{ accessToken, refreshToken }
  }

  async registerIssuerByAdmin(dto: RegisterIssuerDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    const newIssuer = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        pin: '', //емітент створить пін при першому вході для генерації DID
        role: Role.ISSUER,
        organizations: {
          create: {
            name: dto.organizationName,
            country: dto.country,
            lei: dto.lei,
          },
        },
      },
      include: {
        organizations: true,
      },
    });

    return {
      message: 'Issuer successfully registered',
      issuerId: newIssuer.id,
      organizationName: newIssuer.organizations[0].name,
    };
  }

  async registerVerifierByAdmin(dto: RegisterIssuerDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    const newIssuer = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        pin: '',
        role: Role.VERIFIER,
        organizations: {
          create: {
            name: dto.organizationName,
            country: dto.country,
            lei: dto.lei,
          },
        },
      },
      include: {
        organizations: true,
      },
    });

    return {
      message: 'Verifier successfully registered',
      issuerId: newIssuer.id,
      organizationName: newIssuer.organizations[0].name,
    };
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

  async pinLogin(dto: PinLoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Wrong email or pin');
    }

    const isPinValid = await bcrypt.compare(dto.pin, user.pin);

    if (!isPinValid) {
      throw new UnauthorizedException('Invalid pin');
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
