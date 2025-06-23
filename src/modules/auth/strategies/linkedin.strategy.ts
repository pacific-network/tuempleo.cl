import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy as LinkedInStrategyBase, StrategyOption } from 'passport-linkedin-oauth2';
import { Profile } from 'passport';

@Injectable()
export class LinkedInStrategy extends PassportStrategy(LinkedInStrategyBase, 'linkedin') {
  constructor() {
    const options: StrategyOption = {
      clientID: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      callbackURL: process.env.LINKEDIN_CALLBACK_URL || '',
      scope: ['r_emailaddress', 'r_liteprofile'],
      // NO passReqToCallback aquí
    };

    super(options);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: Function,
  ) {
    try {
      const email = profile.emails?.[0]?.value;
      const photo = profile.photos?.[0]?.value;
      const name = profile.name?.givenName || 'SinNombre';

      const user = {
        id: profile.id,
        email,
        name: `${profile.name?.givenName ?? ''} ${profile.name?.familyName ?? ''}`.trim(),
        photo,
        provider: 'linkedin',
      };

      done(null, user);
    } catch (error) {
      console.error('Error en LinkedIn validate:', error);
      done(error, false);
    }
  }


}
