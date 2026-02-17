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
    private usersService: UserService,
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  // 1. Реєстрація
  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findOneByEmail(dto.email);
    if (existingUser)
      throw new ConflictException('User with this email already exists');

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(dto.password, salt);
    const hashedPin = await bcrypt.hash(dto.pin, salt);

    const newUser = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        pin: hashedPin,
      },
    });
    // Одразу повертаємо токен, щоб не треба було логінитись
    return this.generateToken(newUser.id, newUser.email, Role.HOLDER);
  }

  async loginWithPin(dto: { email: string; pin: string }) {
    const user = await this.usersService.findOneByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('user not found');
    }

    if (user.pinAttempts >= 3) {
      throw new ForbiddenException(
        'Access denied. Too many failed PIN attempts. Please try again later.'
      );
    }

    if (!user.pin) {
      throw new BadRequestException('PIN-code not set for this user.');
    }

    const isPinValid = await bcrypt.compare(dto.pin, user.pin);

    if (!isPinValid) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { pinAttempts: { increment: 1 } },
      });

      const attemptsLeft = 2 - user.pinAttempts;
      throw new UnauthorizedException(
        `Invalid PIN code. Attempts left: ${attemptsLeft > 0 ? attemptsLeft : 0}`
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { pinAttempts: 0 },
    });

    return this.generateToken(user.id, user.email, user.role);
  }

  async loginWithPassword(dto: LoginDto) {
    const user = await this.usersService.findOneByEmail(dto.email);

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password as string,
      user.password as string
    );

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

    return this.generateToken(user.id, user.email, user.role);
  }

  // Генерація JWT
  private generateToken(userId: string, email: string, role: Role) {
    const payload = { sub: userId, email, role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: userId, email, role },
    };
  }
}
