import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy, StrategyOption } from 'passport-linkedin-oauth2';

@Injectable()
export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
    constructor() {
        super({
            clientID: process.env.LINKEDIN_CLIENT_ID,
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
            callbackURL: 'https://localhost:3000/auth/linkedin/callback',
            scope: ['r_emailaddress', 'r_liteprofile'],
        } as StrategyOption); // 👈 Asegura que uses el tipo correcto
    }

    async validate(accessToken: string, refreshToken: string, profile: any, done: Function) {
        const { id, emails, name, photos } = profile;
        const user = {
            id,
            email: emails?.[0]?.value,
            name: `${name.givenName} ${name.familyName}`,
            photo: photos?.[0]?.value,
            provider: 'linkedin',
        };

        done(null, user);
    }
}
