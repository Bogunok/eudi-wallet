import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role, User } from '@prisma/client';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { ChangePinDto } from './dto/change-pin.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { FindAllUsersQueryDto } from './dto/user-query.dto';
import { CreateUserByAdminDto, UpdateUserByAdminDto } from './dto/admin-user.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findOneById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findAll(query: FindAllUsersQueryDto) {
    const { page, limit, search, role } = query;
    const skip = (page - 1) * limit;

    const whereCondition: Prisma.UserWhereInput = {
      ...(search && { email: { contains: search, mode: 'insensitive' } }),
      ...(role && { role }),
    };

    const [users, totalCount] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, role: true, createdAt: true },
      }),
      this.prisma.user.count({ where: whereCondition }),
    ]);

    return {
      success: true,
      data: users,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  // Створити нового користувача (для реєстрації)
  async create(dto: CreateUserDto): Promise<User> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const hashedPin = dto.pin ? await bcrypt.hash(dto.pin, 10) : '';

    return this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        pin: hashedPin,
        role: dto.role || Role.HOLDER,
        pinAttempts: 0,
      },
    });
  }

  async createUserByAdmin(dto: CreateUserByAdminDto): Promise<User> {
    const existingUser = await this.findOneByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const hashedPin = await bcrypt.hash(dto.pin, 10);

    return this.create({
      email: dto.email,
      password: hashedPassword,
      pin: hashedPin,
      role: dto.role || Role.HOLDER,
    });
  }

  async update(id: string, dto: UpdateUserByAdminDto) {
    const user = await this.findOneById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.findOneByEmail(dto.email);
      if (existingUser) {
        throw new ConflictException('Email is already in use by another user');
      }
    }

    const updateData: Prisma.UserUpdateInput = {
      ...dto,
    };

    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    if (dto.pin) {
      updateData.pin = await bcrypt.hash(dto.pin, 10);
      updateData.pinAttempts = 0;
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.prisma.user.delete({
      where: { id },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.findOneById(userId);
    if (!user) throw new NotFoundException('User not found');

    const isOldPasswordValid = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new BadRequestException('Invalid old password');
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return { message: 'Password successfully changed' };
  }

  async changePin(userId: string, dto: ChangePinDto) {
    const user = await this.findOneById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (!dto.oldPin) {
      throw new BadRequestException('For changing PIN code, you must specify the old PIN');
    }

    const isOldPinValid = await bcrypt.compare(dto.oldPin, user.pin);
    if (!isOldPinValid) {
      throw new BadRequestException('Invalid current PIN code');
    }

    const hashedNewPin = await bcrypt.hash(dto.newPin, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        pin: hashedNewPin,
        pinAttempts: 0,
      },
    });

    return { message: 'PIN code successfully changed' };
  }

  async changeEmail(userId: string, dto: ChangeEmailDto) {
    const user = await this.findOneById(userId);
    if (!user) throw new NotFoundException('User not found');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid password for confirmation');
    }

    if (dto.newEmail === user.email) {
      throw new BadRequestException('This email is already in use by you');
    }

    const emailTaken = await this.findOneByEmail(dto.newEmail);
    if (emailTaken) {
      throw new ConflictException('This email is already taken by another user');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { email: dto.newEmail },
    });

    return { message: 'Email successfully changed' };
  }
}
