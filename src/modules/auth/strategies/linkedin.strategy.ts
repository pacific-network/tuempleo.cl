import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-openidconnect'
import { Request } from 'express'

@Injectable()
export class LinkedInOidcStrategy extends PassportStrategy(
  Strategy,
  'linkedin-oidc',
) {
  constructor() {
    super({
      issuer: 'https://www.linkedin.com',
      authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
      userInfoURL: 'https://api.linkedin.com/v2/userinfo',

      clientID: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      callbackURL: process.env.LINKEDIN_CALLBACK_URL!,

      scope: 'openid profile email',
      passReqToCallback: true,
    })
  }

  async validate(
    req: Request,
    issuer: string,
    profile: any,
    context: any,
    idToken: string,
    accessToken: string,
    refreshToken: string,
    done: Function,
  ) {
    try {
      /**
       * profile viene desde /v2/userinfo
       * https://api.linkedin.com/v2/userinfo
       */
      const user = {
        sub: profile.sub,
        email: profile.email ?? null,
        name: profile.name ?? '',
        picture: profile.picture ?? null,

        provider: 'linkedin',
        accessToken,
        idToken,
        oauthState: req.query.state,
      }

      done(null, user)
    } catch (err) {
      done(err, false)
    }
  }
}
