// // src/modules/auth/strategies/linkedin.strategy.ts
// import { PassportStrategy } from '@nestjs/passport';
// import { Injectable } from '@nestjs/common';
// import { Strategy } from 'passport-openidconnect';
// import axios from 'axios';

// @Injectable()
// export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
//   constructor() {
//     super({
//       issuer: 'https://www.linkedin.com',
//       authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
//       tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
//       userInfoURL: 'https://api.linkedin.com/v2/userinfo',
//       clientID: process.env.LINKEDIN_CLIENT_ID,
//       clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
//       callbackURL: process.env.LINKEDIN_CALLBACK_URL,
//       scope: ['openid', 'profile', 'email'],
//     });
//   }

//   async validate(
//     issuer: string,
//     profile: any,
//     done: Function,
//   ) {
//     try {
//       const user = {
//         id: profile.sub,
//         name: profile.name,
//         email: profile.email,
//         picture: profile.picture, // o profile.picture?.url
//         provider: 'linkedin',
//       };
//       done(null, user);
//     } catch (error) {
//       console.error('[LinkedInStrategy] Error en validate:', error);
//       done(error, false);
//     }
//   }
// }
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
      // Llamada al endpoint OIDC userinfo
      const userInfoRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const user = {
        id: userInfoRes.data.sub, // id OIDC
        name: userInfoRes.data.name,
        email: userInfoRes.data.email,
        picture: userInfoRes.data.picture,
        provider: 'linkedin',
        accessToken,
      };

      done(null, user);
    } catch (err) {
      done(err, false);
    }
  }
}
