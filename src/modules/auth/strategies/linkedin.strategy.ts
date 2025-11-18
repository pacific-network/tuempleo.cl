//src/modules/auth/strategies/linkedin.strategy.ts
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
      scope: ['openid', 'profile', 'email']// scopes correctos para linkedin
    };

    super(options);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void,
  ) {
    try {
      const email = profile.emails?.[0]?.value ?? null;
      const photo = profile.photos?.[0]?.value ?? null;
      const givenName = profile.name?.givenName ?? '';
      const familyName = profile.name?.familyName ?? '';
      const name = `${givenName} ${familyName}`.trim();

      const user = {
        id: profile.id,
        email,
        name,
        photo,
        provider: 'linkedin',
        accessToken, // opcional: puede ser útil para acceder a la API de LinkedIn después
      };

      done(null, user);
    } catch (error) {
      console.error('[LinkedInStrategy] Error en validate:', error);
      done(error, false);
    }
  }
}