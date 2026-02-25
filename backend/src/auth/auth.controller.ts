import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiInternalServerErrorResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PinLoginDto } from './dto/pin-login.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @ApiResponse({ description: 'Successfully registered, returns token' })
  @ApiResponse({ status: 409, description: 'Email is already in use' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ description: 'Successfully logged in, returns token' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Post('login/password')
  async login(@Body() dto: LoginDto) {
    return this.authService.loginWithPassword(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ description: 'Successfully logged in with PIN, returns token' })
  @ApiResponse({ status: 401, description: 'Invalid email or PIN' })
  @ApiResponse({ description: 'Account is blocked because of 3 failed attempts' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Post('login/pin')
  async loginWithPin(@Body() dto: PinLoginDto) {
    return this.authService.loginWithPin(dto);
  }
}
