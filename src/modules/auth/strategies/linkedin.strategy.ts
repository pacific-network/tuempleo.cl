import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-linkedin-oauth2';

@Injectable()
export class LinkedinStrategy extends PassportStrategy(Strategy, 'linkedin') {
    constructor() {
        super({
            clientID: process.env.LINKEDIN_CLIENT_ID,
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
            callbackURL: process.env.LINKEDIN_CALLBACK_URL, // Ejemplo: http://localhost:3000/auth/linkedin/callback
            scope: ['r_liteprofile', 'r_emailaddress'],
            state: true,
        });
    }

    async validate(accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback): Promise<any> {
        const { id, name, emails, photos } = profile;
        const user = {
            id,
            email: emails[0].value,
            firstName: name.givenName,
            lastName: name.familyName,
            picture: photos[0].value,
            accessToken,
        };
        done(null, user);
    }
}
