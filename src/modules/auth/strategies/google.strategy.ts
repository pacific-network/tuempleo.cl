import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptions, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor() {
        const options: StrategyOptions = {
            clientID: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            callbackURL: process.env.GOOGLE_CALLBACK_URL || '',
            scope: ['email', 'profile'],
        };

        super(options);
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: VerifyCallback,
    ): Promise<any> {
        const { name, emails, photos } = profile;

        const user = {
            email: emails?.[0]?.value || null,
            name: `${name?.givenName || ''} ${name?.familyName || ''}`.trim(),
            picture: photos?.[0]?.value || null,
            provider: 'google',
            accessToken,
        };

        done(null, user);
    }
}
