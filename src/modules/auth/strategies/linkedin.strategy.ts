import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';

const clientID = process.env.LINKEDIN_CLIENT_ID!;
const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;
const callbackURL = process.env.LINKEDIN_CALLBACK_URL!;

@Injectable()
export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
  constructor() {
    if (!clientID || !clientSecret || !callbackURL) {
      throw new Error('Faltan variables de entorno para LinkedIn OAuth');
    }

    super({
      authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
      clientID,
      clientSecret,
      callbackURL,
      scope: ['openid', 'profile', 'email'],
      state: true,
    });
  }

  async validate(accessToken: string, _refreshToken: string, _profile: any, done: Function) {
    try {
      console.log('[LinkedInStrategy] Access Token:', accessToken);

      const userInfoRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log('[LinkedInStrategy] Response completa de /userinfo:');
      console.dir(userInfoRes.data, { depth: null });

      const user = {
        id: userInfoRes.data.sub,
        name: userInfoRes.data.name,
        email: userInfoRes.data.email,
        picture: userInfoRes.data.picture,
        provider: 'linkedin',
        accessToken,
      };

      console.log('[LinkedInStrategy] Usuario final mapeado:', user);

      done(null, user);
    } catch (err) {
      console.error('[LinkedInStrategy] Error al obtener datos del userinfo:', err?.response?.data || err.message || err);
      done(err, false);
    }
  }
}
