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
import { LinkedinOAuthGuard } from './guards/linkedin-oauth.guard'

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

  private sendPopupHtml(
    res: Response,
    payload: Record<string, any>,
    origin: string,
  ) {
    console.log('[OAuth] sendPopupHtml → payload:', payload)
    console.log('[OAuth] sendPopupHtml → origin:', origin)

    const safeJson = JSON.stringify(payload).replace(/</g, '\\u003c')

    return res
      .status(200)
      .set({
        'Content-Type': 'text/html; charset=utf-8',
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
      })
      .send(`
<!doctype html>
<html>
<head><meta charset="utf-8" /></head>
<body>
<script>
console.log('[OAuth popup] HTML loaded');
(function () {
  var response = ${safeJson};
  console.log('[OAuth popup] payload:', response);

  try {
    if (window.opener && !window.opener.closed) {
      console.log('[OAuth popup] postMessage → opener');
      window.opener.postMessage(response, '${origin}');
    }

    if ('BroadcastChannel' in window) {
      console.log('[OAuth popup] BroadcastChannel send');
      const bc = new BroadcastChannel('oauth_channel');
      bc.postMessage(response);
      bc.close();
    }
  } catch (e) {
    console.error('[OAuth popup] error', e);
  }

  setTimeout(function () {
    console.log('[OAuth popup] closing');
    window.close();
  }, 300);
})();
</script>
OAuth OK
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
      console.error('[OAuth] ❌ req.user missing')
      throw new BadRequestException('OAuth user missing')
    }

    const { origin, audience } = this.readStateFromQuery(req)

    const email = (oauthUser.email || '').trim().toLowerCase()
    console.log('[OAuth] email:', email)

    if (!email) throw new BadRequestException('OAuth email missing')

    const fullName = (oauthUser.name || '').trim()
    const rolId = audience === 'employer' ? 2 : 1

    console.log('[OAuth] rolId:', rolId)

    const { usuario, token, requiereEmpresa, requierePostulante } =
      await this.oauthService.validateOAuthUser({
        email,
        name: fullName,
        picture: oauthUser.picture || null,
        provider: 'google',
        rolId,
      })

    console.log('[OAuth] token generado:', token)

    return this.sendPopupHtml(
      res,
      {
        token,
        userId: usuario.id,
        rolId,
        requiereEmpresa,
        requierePostulante,
      },
      origin,
    )
  }

  // =========================================================
  // LinkedIn OAuth
  // =========================================================

  @Get('linkedin')
  @UseGuards(LinkedinOAuthGuard)
  linkedinAuth() {
    console.log('[OAuth] /linkedin hit')
  }

  @Get('linkedin/callback')
  @UseGuards(AuthGuard('linkedin'))
  async linkedinCallback(@Req() req: Request, @Res() res: Response) {
    console.log('[OAuth] /linkedin/callback HIT')

    const oauthUser = (req as any).user
    console.log('[OAuth] req.user:', oauthUser)

    if (!oauthUser) {
      console.error('[OAuth] ❌ req.user missing')
      throw new BadRequestException('OAuth user missing')
    }

    const { origin, audience } = this.readStateFromQuery(req)

    const email = (oauthUser.email || '').trim().toLowerCase()
    console.log('[OAuth] email:', email)

    if (!email) throw new BadRequestException('OAuth email missing')

    const fullName = (oauthUser.name || '').trim()
    const rolId = audience === 'employer' ? 2 : 1

    console.log('[OAuth] rolId:', rolId)

    const { usuario, token, requiereEmpresa, requierePostulante } =
      await this.oauthService.validateOAuthUser({
        email,
        name: fullName,
        picture: oauthUser.picture || null,
        provider: 'linkedin',
        rolId,
      })

    console.log('[OAuth] token generado:', token)

    return this.sendPopupHtml(
      res,
      {
        token,
        userId: usuario.id,
        rolId,
        requiereEmpresa,
        requierePostulante,
      },
      origin,
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
