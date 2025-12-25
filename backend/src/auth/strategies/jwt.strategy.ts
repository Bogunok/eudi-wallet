import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secret_key_for_diploma_wallet_2025', 
    });
  }

  // викликається, якщо токен валідний.
  // Те, що він поверне, запишеться в req.user
  async validate(payload: any) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}