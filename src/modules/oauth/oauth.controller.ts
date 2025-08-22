// src/modules/oauth/oauth.controller.ts
import {
  Controller,
  Get,
  Req,
  Res,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { OauthService } from './oauth.service';

type Audience = 'candidate' | 'employer';

@Controller('v1/oauth')
export class OauthController {
  constructor(private readonly oauthService: OauthService) {}

  // ==================== Helpers ====================

  /** Orígenes permitidos (prod + dev). Puedes extender con env: OAUTH_ALLOWED_ORIGINS="https://foo.com,https://bar.com" */
  private isAllowedOrigin(origin?: string): boolean {
    if (!origin) return false;

    const allowList = new Set<string>([
      'https://tuempleo.cl',
      'https://www.tuempleo.cl',
    ]);

    const envList = (process.env.OAUTH_ALLOWED_ORIGINS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    envList.forEach(o => allowList.add(o));

    const regexes = [
      /^https?:\/\/([a-z0-9-]+\.)*tuempleo\.cl(?::\d+)?$/i,
      /^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i,
      /^https:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i,
    ];

    if (allowList.has(origin)) return true;
    return regexes.some(r => r.test(origin));
  }

  /** Devuelve HTML que hace postMessage al opener/parent y cierra la ventana */
  private sendPopupHtml(
    res: Response,
    payload: Record<string, any>,
    origin: string,
  ) {
    const safeJson = JSON.stringify(payload).replace(/</g, '\\u003c');
    res.type('html').send(`
<!doctype html>
<html><head><meta charset="utf-8"></head>
<body>
<script>
(function () {
  var response = JSON.parse('${safeJson}');
  try {
    // Intento 1: comunicar al opener (ventana que abrió el popup)
    if (window.opener && window.opener !== window) {
      window.opener.postMessage(response, '${origin}');
      window.close();
      return;
    }
    // Intento 2: comunicar al parent (por si se usa dentro de iframe)
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(response, '${origin}');
      window.close();
      return;
    }
    document.body.innerText = 'No se pudo comunicar con la ventana principal.';
  } catch (e) {
    document.body.innerText = 'Listo. Puedes cerrar esta ventana.';
  }
})();
</script>
</body></html>`);
  }

  // ==================== Google ====================

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(_req: Request) {
    // Passport redirige a Google automáticamente
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('audience') audience: Audience = 'candidate', // candidate por defecto
    @Query('origin') origin?: string,
  ) {
    const user = (req as any).user || {}; // { email, name, picture, accessToken, provider }
    const email = (user.email || '').trim().toLowerCase();
    const fullName = (user.name || '').trim();

    const rolId = audience === 'candidate' ? 1 : 2;

    const { usuario, token, requiereEmpresa, requierePostulante } =
      await this.oauthService.validateOAuthUser({
        email,
        name: fullName,
        picture: user.picture,
        provider: 'google',
        oauthId: user.accessToken,
        rolId,
      });

    const targetOrigin =
      (origin && this.isAllowedOrigin(origin) ? origin : '*');

    // 👉 devolvemos el token bajo varias claves para que el front lo capture sí o sí
    return this.sendPopupHtml(
      res,
      {
        usuario,
        token,
        id_token: token,
        access_token: token,
        email: usuario?.email,
        name: `${usuario?.nombres ?? ''} ${usuario?.apellidos ?? ''}`.trim(),
        requiereEmpresa:
          audience === 'employer' ? Boolean(requiereEmpresa) : undefined,
        requierePostulante:
          audience === 'candidate' ? Boolean(requierePostulante) : undefined,
      },
      targetOrigin,
    );
  }

  // ==================== LinkedIn ====================

  @Get('linkedin')
  @UseGuards(AuthGuard('linkedin'))
  async linkedinAuth() {
    // Passport redirige a LinkedIn automáticamente
  }

  @Get('linkedin/callback')
  @UseGuards(AuthGuard('linkedin'))
  async linkedinCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('audience') audience: Audience = 'candidate',
    @Query('origin') origin?: string,
  ) {
    const user = (req as any).user || {};
    const email = (user.email || '').trim().toLowerCase();
    const fullName = (user.name || '').trim();

    const rolId = audience === 'candidate' ? 1 : 2;

    const { usuario, token, requiereEmpresa, requierePostulante } =
      await this.oauthService.validateOAuthUser({
        email,
        name: fullName,
        picture: user.picture,
        provider: 'linkedin',
        oauthId: user.accessToken,
        rolId,
      });

    const targetOrigin =
      (origin && this.isAllowedOrigin(origin) ? origin : '*');

    return this.sendPopupHtml(
      res,
      {
        usuario,
        token,
        id_token: token,
        access_token: token,
        email: usuario?.email,
        name: `${usuario?.nombres ?? ''} ${usuario?.apellidos ?? ''}`.trim(),
        requiereEmpresa:
          audience === 'employer' ? Boolean(requiereEmpresa) : undefined,
        requierePostulante:
          audience === 'candidate' ? Boolean(requierePostulante) : undefined,
      },
      targetOrigin,
    );
  }

  // ==================== Utilidades protegidas ====================

  @Get('user-by-email')
  @UseGuards(AuthGuard('jwt'))
  async getUserByEmail(@Query('email') email: string) {
    const user = await this.oauthService.findUserByEmail(email);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }
}
