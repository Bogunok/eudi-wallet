import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { PinLoginDto } from './dto/pin-login.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiResponse({
    status: 201,
    description: 'Successfully registered, returns token',
  })
  @ApiResponse({ status: 409, description: 'Email is already in use' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login/password')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Successfully logged in, returns token',
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(@Body() dto: LoginDto) {
    return this.authService.loginWithPassword(dto);
  }

  @Public()
  @Post('login/pin')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Successfully logged in with PIN, returns token',
  })
  @ApiResponse({ status: 401, description: 'Invalid email or PIN' })
  @ApiResponse({
    status: 403,
    description: 'Account is blocked because of 3 failed attempts',
  })
  async loginWithPin(@Body() dto: PinLoginDto) {
    return this.authService.loginWithPin(dto);
  }
}
