import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  UseGuards,
  NotFoundException,
  ClassSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  ApiParam,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UserService } from './user.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Auth } from '../auth/decorators/auth.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangePinDto } from './dto/change-pin.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { RegisterDto } from '../auth/dto/register.dto';
import { FindAllUsersQueryDto } from './dto/user-query.dto';
import { USER_CONTROLLER_MESSAGES } from './user.constants';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateUserByAdminDto, UpdateUserByAdminDto } from './dto/admin-user.dto';
import { UserEntity } from './entities/user.entity';

export interface UserPayload {
  id: string;
  email: string;
  role: Role;
}

@ApiTags('User')
@ApiBearerAuth()
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Auth(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user manually (Admin only)' })
  @ApiCreatedResponse({ description: 'User created successfully.' })
  @ApiConflictResponse({ description: 'This email is already in use by another user.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @Post('admin/users')
  async createUser(@Body() dto: CreateUserByAdminDto) {
    const newUser = await this.userService.createUserByAdmin(dto);

    return {
      success: true,
      message: USER_CONTROLLER_MESSAGES.CREATE.SUCCESS.EN,
      data: new UserEntity(newUser),
    };
  }

  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Update user data, including roles (Admin only)' })
  @ApiOkResponse({ description: 'User updated successfully.' })
  @ApiNotFoundResponse({ description: 'The user with the requested ID was not found.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiParam({ name: 'id', description: 'The ID of the user to update' })
  @Patch('admin/users/:id')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserByAdminDto) {
    // Метод update у сервісі теж має перевіряти, чи є у DTO пароль/пін,
    // і якщо є - хешувати їх перед збереженням у базу
    const updatedUser = await this.userService.update(id, dto);

    return {
      success: true,
      message: USER_CONTROLLER_MESSAGES.UPDATE.SUCCESS.EN,
      data: new UserEntity(updatedUser),
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ description: 'User profile retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @Get('user')
  public async getProfile(@CurrentUser() user: any) {
    const userProfile = await this.userService.findOneById(user.id);

    if (!userProfile) {
      throw new NotFoundException(USER_CONTROLLER_MESSAGES.GET_PROFILE.NOT_FOUND.EN);
    }

    return {
      success: true,
      message: USER_CONTROLLER_MESSAGES.GET_PROFILE.SUCCESS.EN,
      data: new UserEntity(userProfile),
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete user account' })
  @ApiOkResponse({ description: 'User was successfully removed.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'The user with the requested id was not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error was occured.' })
  @ApiParam({
    name: 'id',
    description: 'The id of the user to be deleted',
    schema: { example: '23fbed56-1bb9-40a0-8977-2dd0f0c6c31f' },
  })
  @Delete('users/:id')
  public async remove(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    if (user.role !== Role.ADMIN && id !== user.id) {
      throw new ForbiddenException({
        success: false,
        data: null,
        message: USER_CONTROLLER_MESSAGES.REMOVE.USER_IS_FORBIDDEN_TO_REMOVE.EN,
        errors: {
          server: [USER_CONTROLLER_MESSAGES.REMOVE.USER_IS_FORBIDDEN_TO_REMOVE.EN],
        },
      });
    }
    await this.userService.remove(id);

    return {
      success: true,
      message: USER_CONTROLLER_MESSAGES.REMOVE.SUCCESS.EN,
      data: { id },
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Change user password' })
  @ApiOkResponse({ description: 'User password changed successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid current password.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @Patch('user/password')
  public async changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    await this.userService.changePassword(user.id, dto);

    return {
      success: true,
      message: USER_CONTROLLER_MESSAGES.CHANGE_PASSWORD.SUCCESS.EN,
      data: null,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Change 4-digit PIN code' })
  @ApiOkResponse({ description: 'User PIN code changed successfully.' })
  @ApiBadRequestResponse({ description: ' Invalid current PIN code.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @Patch('user/pin')
  public async changePin(@CurrentUser() user: any, @Body() dto: ChangePinDto) {
    await this.userService.changePin(user.id, dto);

    return {
      success: true,
      message: USER_CONTROLLER_MESSAGES.CHANGE_PIN.SUCCESS.EN,
      data: null,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Change account email address' })
  @ApiOkResponse({ description: 'User email changed successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid password.' })
  @ApiConflictResponse({ description: 'This email is already in use by another user.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @Patch('user/email')
  public async changeEmail(@CurrentUser() user: any, @Body() dto: ChangeEmailDto) {
    await this.userService.changeEmail(user.id, dto);

    return {
      success: true,
      message: USER_CONTROLLER_MESSAGES.CHANGE_EMAIL.SUCCESS.EN,
      data: { email: dto.newEmail }, // Можна повернути нову пошту для оновлення стейту на фронтенді
    };
  }

  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Get all users with pagination and filtering (Admin only)' })
  @ApiOkResponse({ description: ' Users retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @Get('admin/users')
  async findAllUsers(@Query() query: FindAllUsersQueryDto) {
    const result = await this.userService.findAll(query);

    return {
      success: result.success,
      meta: result.meta,
      data: result.data.map(user => new UserEntity(user)),
    };
  }

  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiOkResponse({ description: 'User retrieved successfully.' })
  @ApiNotFoundResponse({ description: 'The user with the requested ID was not found.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiParam({ name: 'id', description: 'The ID of the user' })
  @Get('admin/users/:id')
  async findUserById(@Param('id') id: string) {
    const user = await this.userService.findOneById(id);

    if (!user) {
      throw new NotFoundException({
        success: false,
        message: USER_CONTROLLER_MESSAGES.GET_ONE.NOT_FOUND.EN,
        data: null,
      });
    }

    return {
      success: true,
      message: USER_CONTROLLER_MESSAGES.GET_ONE.SUCCESS.EN,
      data: new UserEntity(user),
    };
  }
}
