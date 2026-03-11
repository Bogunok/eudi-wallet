import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Res,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { Request, Response } from 'express';
import {
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @ApiOperation({ summary: 'Register in the wallet' })
  @ApiResponse({ description: 'Successfully registered, returns token' })
  @ApiResponse({ status: 409, description: 'Email is already in use' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.register(dto);
    this.setCookies(res, tokens.accessToken, tokens.refreshToken);
    return { message: 'Registered and logged in successfully' };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in to the wallet' })
  @ApiResponse({ description: 'Successfully logged in, returns token' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.loginWithPassword(dto);
    this.setCookies(res, tokens.accessToken, tokens.refreshToken);
    return { message: 'Logged in successfully' };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using HTTP-only cookie' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid or missing refresh token' })
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies['refreshToken'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found in cookies');
    }
    const tokens = await this.authService.refreshTokens(refreshToken);
    this.setCookies(res, tokens.accessToken, tokens.refreshToken);

    return { message: 'Tokens refreshed successfully' };
  }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and clear cookies' })
  @ApiResponse({ status: 200, description: 'Logged out successfully.' })
  @Post('logout')
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user.id);

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return { message: 'Logged out successfully' };
  }

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('accessToken', accessToken, {
      maxAge: 15 * 60 * 1000, // 15 хвилин
      httpOnly: true,
      sameSite: 'lax',
    });

    res.cookie('refreshToken', refreshToken, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 днів
      httpOnly: true,
      sameSite: 'lax',
    });
  }
}
