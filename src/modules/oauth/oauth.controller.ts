import {
    Controller,
    Post,
    Get,
    Req,
    Res,
    Body,
    HttpCode,
    HttpStatus,
    UseGuards,
    UnauthorizedException,
    Patch,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { Usuario } from 'src/repository/user/user.entity';
import { JwtService } from '@nestjs/jwt';
import { RegistrarUsuarioOAuthDto } from './dto/register-oauth';
import { OauthService } from './oauth.service';

@Controller('v1/oauth')
export class OauthController {
    constructor(
        private readonly oauthService: OauthService,
        private readonly jwtService: JwtService // Inyectar JwtService para decodificar el token
    ) { }

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

        const htmlResponse = `
        <html>
        <body>
            <script>
                window.opener.postMessage(
                    { token: "${token}", user: ${JSON.stringify(usuarioRegistrado)} },
                    "*"
                );
                window.close();
            </script>
        </body>
        </html>
    `;

        res.send(htmlResponse);
    }




    // LINKEDIN OAUTH
    // @Get('linkedin')
    // @UseGuards(AuthGuard('linkedin'))
    // async linkedinAuth(@Req() req: Request) {
    //     // No hace falta lógica aquí, el guard redirige a LinkedIn
    // }

    @Get('linkedin/login')
    @UseGuards(AuthGuard('linkedin'))
    async linkedinLogin() {
        // Este endpoint solo redirige a LinkedIn
    }



    // 

    @Get('linkedin/callback')
    @UseGuards(AuthGuard('linkedin'))
    async linkedinCallback(@Req() req: Request, @Res() res: Response) {
        const user = req.user as any;

        const { token } = await this.oauthService.loginWithOAuth({
            email: user.email,
            name: user.name,
            picture: user.photo,
        });

        // Redirige a tu frontend con el token como query param (ajusta según tu frontend)
        // return res.redirect(`https://tuempleo.cl/oauth/callback?token=${token}`);
        return res.redirect(`http://127.0.0.1:5500/jobox/empresas/login-employer.html#?token=${token}`);
    }
}