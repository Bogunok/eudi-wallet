import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // 1. Реєстрація
  async register(dto: RegisterDto) {
    // Перевірка чи існує
    const existingUser = await this.usersService.findOneByEmail(dto.email);
    if (existingUser) throw new ConflictException('User with this email already exists');

    // Хешування пароля
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Створення юзера
    const newUser = await this.usersService.create({
      ...dto,
      password: hashedPassword,
    });

    // TODO: Тут пізніше можна додати автоматичну генерацію DID для юзера
    
    // Одразу повертаємо токен, щоб не треба було логінитись
    return this.generateToken(newUser.id, newUser.email, newUser.role);
  }

  // 2. Логін
  async login(dto: LoginDto) {
    const user = await this.usersService.findOneByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid email or password');

    return this.generateToken(user.id, user.email, user.role);
  }

  // 3. Генерація JWT
  private generateToken(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role }; // sub - стандартна назва для ID в JWT
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: userId,
        email: email,
        role: role
      }
    };
  }
}