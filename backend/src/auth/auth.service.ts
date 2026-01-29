import { Injectable, UnauthorizedException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // 1. Реєстрація
  async register(dto: RegisterDto) {
    // Перевірка чи існує користувач
    const existingUser = await this.usersService.findOneByEmail(dto.email);
    if (existingUser) throw new ConflictException('User with this email already exists');

    const salt = await bcrypt.genSalt();
    // Хешуємо пароль і PIN 
    const hashedPassword = await bcrypt.hash(dto.password, salt);
    const hashedPin = await bcrypt.hash(dto.pin, salt);

    // Зберігаємо створеного користувача в константу
    const newUser = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        pin: hashedPin,
      },
    });
     // Одразу повертаємо токен, щоб не треба було логінитись
    return this.generateToken(newUser.id, newUser.email, 'USER');
  }

  // 2. Логін за допомогою pin
  async loginWithPin(dto: {email: string, pin: string}) {
    // Витягуємо дані безпосередньо з DTO
    const user = await this.usersService.findOneByEmail(dto.email);
    
    if (!user) {
      throw new UnauthorizedException('Користувача не знайдено');
    }

    // Перевірка чи не перевищено ліміт спроб
    if (user.pinAttempts >= 3) {
      throw new ForbiddenException(
        'Доступ заблоковано: перевищено 3 спроби. Скиньте гаманець або спробуйте пізніше.'
      );
    }

    if (!user.pin) {
        throw new BadRequestException('PIN-код для цього користувача не встановлено');
      }

    // Порівнюємо введений PIN із хешем у базі даних
    const isPinValid = await bcrypt.compare(dto.pin, user.pin);
    
    if (!isPinValid) {
      //Збільшуємо лічильник спроб при помилці
      await this.prisma.user.update({
        where: { id: user.id },
        data: { pinAttempts: { increment: 1 } },
      });

      const attemptsLeft = 2 - user.pinAttempts; // Розрахунок спроб, що залишилися
      throw new UnauthorizedException(
        `Невірний PIN-код. Залишилося спроб: ${attemptsLeft > 0 ? attemptsLeft : 0}`
      );
    }

    //Якщо вхід успішний — обнуляємо лічильник
    await this.prisma.user.update({
      where: { id: user.id },
      data: { pinAttempts: 0 },
    });

    return this.generateToken(user.id, user.email, 'USER');
  }

  // 3. Генерація JWT
  private generateToken(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: userId, email, role }
    };
  }
}