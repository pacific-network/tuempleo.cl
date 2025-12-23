// src/modules/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'pacificNetwork2024',
      ignoreExpiration: false,
    })
  }

  async validate(payload: any) {
    // 🔐 JWT minimal: solo identidad
    return {
      userId: Number(payload?.sub),
      email: payload?.email ?? null,
    }
  }
}
