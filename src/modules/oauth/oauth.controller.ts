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
  import { JwtService } from '@nestjs/jwt';
  import { OauthService } from './oauth.service';
  
  @Controller('v1/oauth')
  export class OauthController {
    constructor(
      private readonly oauthService: OauthService,
      private readonly jwtService: JwtService,
    ) {}
  
    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleAuth(@Req() req: Request) {
      // Passport redirige automáticamente a Google
    }
  
    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
      const user = req.user as any;
  
      const usuarioRegistrado = await this.oauthService.validateOAuthUser({
        email: user.email,
        name: user.name,
        picture: user.picture,
        provider: 'google',
        oauthId: user.accessToken,
      });
  
      const token = await this.oauthService.createTokenFromOAuth(usuarioRegistrado);
  
      const safeUser = JSON.stringify(usuarioRegistrado).replace(/</g, '\\u003c');
  
      const htmlResponse = `
        <html>
          <body>
            <script>
              (function() {
                const token = "${token}";
                const user = JSON.parse(\`${safeUser}\`);
                if (window.opener) {
                  window.opener.postMessage({ token, user }, "*");
                  window.close();
                } else {
                  document.body.innerText = "No se pudo comunicar con la ventana principal.";
                }
              })();
            </script>
          </body>
        </html>
      `;
  
      res.send(htmlResponse);
    }
  
    @Get('linkedin')
    @UseGuards(AuthGuard('linkedin'))
    async linkedinLogin() {
      // Redirige automáticamente a LinkedIn
    }
  
    @Get('linkedin/callback')
    @UseGuards(AuthGuard('linkedin'))
    async linkedinCallback(@Req() req: Request, @Res() res: Response) {
      const user = req.user as any;
  
      const usuarioRegistrado = await this.oauthService.validateOAuthUser({
        email: user.email,
        name: user.name,
        picture: user.picture,
        provider: 'linkedin',
        oauthId: user.accessToken,
      });
  
      const token = await this.oauthService.createTokenFromOAuth(usuarioRegistrado);
  
      const safeUser = JSON.stringify(usuarioRegistrado).replace(/</g, '\\u003c');
  
      const htmlResponse = `
        <html>
          <body>
            <script>
              (function() {
                const token = "${token}";
                const user = JSON.parse(\`${safeUser}\`);
                if (window.opener) {
                  window.opener.postMessage({ token, user }, "*");
                  window.close();
                } else {
                  document.body.innerText = "No se pudo comunicar con la ventana principal.";
                }
              })();
            </script>
          </body>
        </html>
      `;
  
      res.send(htmlResponse);
    }
  
    @Get('user-by-email')
    @UseGuards(AuthGuard('jwt'))
    async getUserByEmail(@Query('email') email: string) {
      const user = await this.oauthService.findUserByEmail(email);
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }
      return user;
    }
  }
  