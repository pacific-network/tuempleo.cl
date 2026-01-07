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

type Audience = 'postulante' | 'empleador'

@Controller('v1/oauth')
export class OauthController {
  constructor(private readonly oauthService: OauthService) { }

  // =========================================================
  // Helpers
  // =========================================================

  private isAllowedOrigin(origin?: string): boolean {
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

    return allowList.has(origin) || regexes.some(r => r.test(origin))
  }

  private readState(state?: string): {
    origin: string
    audience: Audience
  } {
    if (!state) {
      throw new BadRequestException('Missing OAuth state')
    }

    let parsed: any
    try {
      parsed = JSON.parse(decodeURIComponent(state))
    } catch {
      throw new BadRequestException('Invalid OAuth state')
    }

    const { origin, audience } = parsed || {}

    if (!this.isAllowedOrigin(origin)) {
      throw new BadRequestException('Invalid OAuth origin')
    }

    const aud: Audience =
      audience === 'empleador' ? 'empleador' : 'postulante'

    return { origin, audience: aud }
  }

  // =========================================================
  // Google OAuth
  // =========================================================

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  googleAuth() { }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const oauthUser = (req as any).user
    if (!oauthUser) {
      throw new BadRequestException('OAuth user missing')
    }

    const { origin, audience } = this.readState(
      req.query.state as string | undefined,
    )

    const email = (oauthUser.email || '').trim().toLowerCase()
    if (!email) {
      throw new BadRequestException('OAuth email missing')
    }

    const rolId = audience === 'empleador' ? 2 : 1

    const { token } = await this.oauthService.validateOAuthUser({
      email,
      name: (oauthUser.name || '').trim(),
      picture: oauthUser.picture || null,
      provider: 'google',
      rolId,
    })

    // 🔐 Redirect MINIMAL: solo token
    return res.redirect(
      `${origin}/oauth/callback?token=${encodeURIComponent(token)}`,
    )
  }

  // =========================================================
  // LinkedIn OAuth
  // =========================================================

  @Get('linkedin')
  redirectToLinkedIn(@Req() req: Request, @Res() res: Response) {
    const state = req.query.state as string | undefined
    if (!state) {
      throw new BadRequestException('Missing OAuth state')
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      redirect_uri: process.env.LINKEDIN_CALLBACK_URL!,
      scope: 'openid profile email',
      state,
    })

    res.redirect(
      `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`,
    )
  }

  @Get('linkedin/callback')
  async linkedinCallback(@Req() req: Request, @Res() res: Response) {
    const { code, state } = req.query

    if (!code || !state) {
      throw new BadRequestException('Missing OAuth code/state')
    }

    // 1️⃣ Exchange code → access token
    const tokenResp = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: process.env.LINKEDIN_CALLBACK_URL!,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    )

    const { access_token } = tokenResp.data

    // 2️⃣ Get user info
    const userinfoResp = await axios.get(
      'https://api.linkedin.com/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${access_token}` },
      },
    )

    const profile = userinfoResp.data

    // 3️⃣ Parse & validate state
    const { origin, audience } = this.readState(state as string)

    const rolId = audience === 'empleador' ? 2 : 1

    const { token } = await this.oauthService.validateOAuthUser({
      email: (profile.email || '').trim().toLowerCase(),
      name: profile.name,
      picture: profile.picture,
      provider: 'linkedin',
      rolId,
    })

    // 4️⃣ Redirect frontend (MINIMAL)
    return res.redirect(
      `${origin}/oauth/callback?token=${encodeURIComponent(token)}`,
    )
  }

  // =========================================================
  // Utilidades protegidas
  // =========================================================

  @Get('user-by-email')
  @UseGuards(AuthGuard('jwt'))
  async getUserByEmail(@Req() req: Request) {
    const email = (req.query.email as string | undefined)?.trim()

    if (!email) throw new BadRequestException('Email requerido')

    const user = await this.oauthService.findUserByEmail(email)
    if (!user) throw new NotFoundException('Usuario no encontrado')

    return user
  }
}
