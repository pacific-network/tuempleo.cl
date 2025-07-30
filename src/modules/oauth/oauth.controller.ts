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
    Query,
    NotFoundException,
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



    @Get('linkedin')
    @UseGuards(AuthGuard('linkedin'))
    async linkedinLogin() {
        // Este endpoint solo redirige a LinkedIn mediante el guard de passport
        // No necesitas hacer nada más aquí
    }

    // @Get('linkedin/callback')
    // @UseGuards(AuthGuard('linkedin'))
    // async linkedinCallback(@Req() req: Request, @Res() res: Response) {
    //     const user = req.user as any;

    //     // Asumiendo que oauthService.loginWithOAuth devuelve un objeto con token
    //     const { token } = await this.oauthService.loginWithOAuth({
    //         email: user.email,
    //         name: user.name,
    //         picture: user.picture,
    //     });

    //     // Redirige a tu frontend con el token como query param o fragmento hash
    //     return res.redirect(`http://127.0.0.1:5500/jobox/empresas/login-employer.html#token=${token}`);
    // }

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

    @Get('user-by-email')
    @UseGuards(AuthGuard('jwt')) // Asegúrate de que el usuario esté autenticado
    async getUserByEmail(@Query('email') email: string) {
        const user = await this.oauthService.findUserByEmail(email);
        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }
        return user;
    }

}