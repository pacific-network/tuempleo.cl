// src/modules/auth/strategies/linkedin.strategy.ts
import { PassportStrategy } from '@nestjs/passport'
import { Injectable } from '@nestjs/common'
import {
  Strategy as LinkedInStrategyBase,
  StrategyOptionWithRequest,
} from 'passport-linkedin-oauth2'
import { Profile } from 'passport'
import { Request } from 'express'

@Injectable()
export class LinkedInStrategy extends PassportStrategy(
  LinkedInStrategyBase,
  'linkedin',
) {
  constructor() {
    const options: StrategyOptionWithRequest = {
      clientID: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      callbackURL: process.env.LINKEDIN_CALLBACK_URL || '',
      scope: ['openid', 'profile', 'email'],
      passReqToCallback: true, // ✅ ÚNICO FLAG NECESARIO
    }

    super(options)
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void,
  ) {
    try {
      const email = profile.emails?.[0]?.value ?? null
      const photo = profile.photos?.[0]?.value ?? null
      const givenName = profile.name?.givenName ?? ''
      const familyName = profile.name?.familyName ?? ''
      const name = `${givenName} ${familyName}`.trim()

      const user = {
        id: profile.id,
        email,
        name,
        photo,
        provider: 'linkedin',
        accessToken,
        oauthState: req.query.state, // ✅ STATE LLEGA IGUAL
      }

      done(null, user)
    } catch (error) {
      console.error('[LinkedInStrategy] Error en validate:', error)
      done(error, false)
    }
  }
}
