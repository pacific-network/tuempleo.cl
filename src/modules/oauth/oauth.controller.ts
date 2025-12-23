import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Request, Response } from 'express'
import { OauthService } from './oauth.service'
import { GoogleOAuthGuard } from './guards/google-oauth.guard'
import axios from 'axios'

type Audience = 'candidate' | 'employer'

@Controller('v1/oauth')
export class OauthController {
  constructor(private readonly oauthService: OauthService) { }

  // =========================================================
  // Helpers
  // =========================================================

  private isAllowedOrigin(origin?: string): boolean {
    console.log('[OAuth] isAllowedOrigin →', origin)

    if (!origin) return false

    const allowList = new Set<string>([
      'https://tuempleo.cl',
      'https://www.tuempleo.cl',
    ])

    const envList = (process.env.OAUTH_ALLOWED_ORIGINS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    envList.forEach(o => allowList.add(o))

    const regexes = [
      /^https?:\/\/([a-z0-9-]+\.)*tuempleo\.cl(?::\d+)?$/i,
      /^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i,
      /^https:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i,
    ]

    const allowed = allowList.has(origin) || regexes.some(r => r.test(origin))
    console.log('[OAuth] origin allowed?', allowed)

    return allowed
  }

  private readStateFromQuery(req: Request): { origin: string; audience: Audience } {
    console.log('[OAuth] readStateFromQuery → query:', req.query)

    const state = req.query.state as string | undefined
    if (!state) {
      console.error('[OAuth] ❌ Missing state')
      throw new BadRequestException('Missing OAuth state')
    }

    let parsed: any
    try {
      parsed = JSON.parse(decodeURIComponent(state))
    } catch (e) {
      console.error('[OAuth] ❌ Invalid state JSON', e)
      throw new BadRequestException('Invalid OAuth state')
    }

    console.log('[OAuth] parsed state:', parsed)

    const { origin, audience } = parsed || {}

    if (!this.isAllowedOrigin(origin)) {
      console.error('[OAuth] ❌ Invalid origin:', origin)
      throw new BadRequestException('Invalid OAuth origin')
    }

    const aud: Audience = audience === 'employer' ? 'employer' : 'candidate'
    console.log('[OAuth] audience resolved:', aud)

    return { origin, audience: aud }
  }

  private sendPopupHtml(res: Response, payload: any, origin: string) {
    const safeJson = JSON.stringify(payload).replace(/</g, '\\u003c')

    res.type('html').send(`
      <html>
        <body>
          <script>
            (function () {
              const data = JSON.parse('${safeJson}');
  
              try {
                // 🔑 CANAL PRINCIPAL (localStorage)
                localStorage.setItem('oauth_result', JSON.stringify(data));
              } catch (e) {
                console.error('localStorage error', e);
              }
  
              try {
                // 🔁 Fallback: postMessage si opener existe
                if (window.opener) {
                  window.opener.postMessage(data, '${origin}');
                }
              } catch (e) {}
  
              window.close();
            })();
          </script>
        </body>
      </html>
    `)
  }


  // =========================================================
  // Google OAuth
  // =========================================================

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  googleAuth() {
    console.log('[OAuth] /google hit')
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    console.log('[OAuth] /google/callback HIT')

    const oauthUser = (req as any).user
    console.log('[OAuth] req.user:', oauthUser)

    if (!oauthUser) {
      throw new BadRequestException('OAuth user missing')
    }

    const { origin, audience } = this.readStateFromQuery(req)

    const email = (oauthUser.email || '').trim().toLowerCase()
    if (!email) {
      throw new BadRequestException('OAuth email missing')
    }

    const fullName = (oauthUser.name || '').trim()
    const rolId = audience === 'employer' ? 2 : 1

    const { usuario, token, requiereEmpresa, requierePostulante } =
      await this.oauthService.validateOAuthUser({
        email,
        name: fullName,
        picture: oauthUser.picture || null,
        provider: 'google',
        rolId,
      })

    // 🔑 CIERRE CORRECTO DEL FLUJO
    const redirectUrl =
      `${origin}/oauth/callback` +
      `?token=${encodeURIComponent(token)}` +
      `&rolId=${rolId}` +
      `&requiereEmpresa=${requiereEmpresa ?? ''}` +
      `&requierePostulante=${requierePostulante ?? ''}`

    console.log('[OAuth] redirect →', redirectUrl)

    return res.redirect(redirectUrl)
  }


  // =========================================================
  // LinkedIn OAuth
  // =========================================================

  @Get('linkedin')
  redirectToLinkedIn(@Req() req: Request, @Res() res: Response) {
    const state = req.query.state as string

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      redirect_uri: process.env.LINKEDIN_CALLBACK_URL!,
      scope: 'openid profile email',
      state,
    })

    res.redirect(
      `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
    )
  }


  @Get('linkedin/callback')
  async linkedinCallback(@Req() req: Request, @Res() res: Response) {
    const { code, state } = req.query

    if (!code || !state) {
      throw new BadRequestException('Missing OAuth code/state')
    }

    // 1️⃣ exchange code → token
    const tokenResp = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: process.env.LINKEDIN_CALLBACK_URL!,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    )

    const { access_token } = tokenResp.data

    // 2️⃣ get userinfo
    const userinfoResp = await axios.get(
      'https://api.linkedin.com/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    )

    const profile = userinfoResp.data

    // 3️⃣ parse state
    const { origin, audience } = JSON.parse(
      decodeURIComponent(state as string)
    )

    const rolId = audience === 'employer' ? 2 : 1

    const { token } = await this.oauthService.validateOAuthUser({
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      provider: 'linkedin',
      rolId,
    })

    // 4️⃣ redirect frontend
    res.redirect(
      `${origin}/oauth/callback?token=${encodeURIComponent(token)}`
    )
  }



  // =========================================================
  // Utilidades protegidas
  // =========================================================

  @Get('user-by-email')
  @UseGuards(AuthGuard('jwt'))
  async getUserByEmail(@Req() req: Request) {
    const email = (req.query.email as string | undefined)?.trim()
    console.log('[OAuth] user-by-email:', email)

    if (!email) throw new BadRequestException('Email requerido')

    const user = await this.oauthService.findUserByEmail(email)
    if (!user) throw new NotFoundException('Usuario no encontrado')

    return user
  }
}
