// src/modules/auth/strategies/google.strategy.ts
import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, VerifyCallback } from 'passport-google-oauth20'
import { Request } from 'express'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor() {
        super({
            clientID: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            callbackURL: process.env.GOOGLE_CALLBACK_URL || '',
            scope: ['email', 'profile'],
            passReqToCallback: true, // ✅ runtime OK
        })
    }

    async validate(
        req: Request,
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: VerifyCallback,
    ): Promise<void> {
        const { name, emails, photos } = profile

        const user = {
            email: emails?.[0]?.value || null,
            name: `${name?.givenName || ''} ${name?.familyName || ''}`.trim(),
            picture: photos?.[0]?.value || null,
            provider: 'google',
            accessToken,
            oauthState: req.query.state, // ✅ lo que necesitamos
        }

        done(null, user)
    }
}
