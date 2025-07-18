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
import { AuthService } from './auth.service';
import { RegistrarUsuarioDto } from './dto/register';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { IniciarSesionDto } from './dto/login';
import { Usuario } from 'src/repository/user/user.entity';
import { JwtService } from '@nestjs/jwt';
import { UpdateMeDto } from './dto/update-me';

@Controller('v1/auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly jwtService: JwtService // Inyectar JwtService para decodificar el token
    ) { }

    @Post('register')
    async register(@Body() userData: RegistrarUsuarioDto) {
        return this.authService.register(userData);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('me')
    async getMe(@Req() req) {
        const userId = req.user.userId;
        return this.authService.findUserFullById(userId);
    }

    @Post('login-postulante')
    @HttpCode(HttpStatus.OK)
    async loginPostulante(@Body() loginData: IniciarSesionDto) {
        const rolPostulante = 1;
        return this.authService.login(loginData, rolPostulante);
    }

    @Post('login-empleador')
    @HttpCode(HttpStatus.OK)
    async loginEmpleador(@Body() loginData: IniciarSesionDto) {
        const rolEmpleador = 2;
        return this.authService.login(loginData, rolEmpleador);
    }

    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleAuth(@Req() req: Request) {
        // Passport redirige automáticamente a Google
    }

    // Callback que recibe Google después de la autenticación
    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
        console.log('Google User:', req.user);
        const user = req.user as Usuario;
        const token = await this.authService.createTokenFromOAuth(user);

        return res.redirect(`https://tuempleo.cl/empresas/login-employer.html?token=${token}`);
    }


    // LINKEDIN OAUTH
    @Get('linkedin')
    @UseGuards(AuthGuard('linkedin'))
    async linkedinAuth(@Req() req: Request) {
        // No hace falta lógica aquí, el guard redirige a LinkedIn
    }

    @Get('linkedin/callback')
    @UseGuards(AuthGuard('linkedin'))
    async linkedinAuthRedirect(@Req() req: Request, @Res() res: Response) {
        const user = req.user as Usuario;
        const token = await this.authService.createTokenFromOAuth(user);

        return res.json({
            access_token: token,
            user: {
                id: user.id,
                email: user.email,
                nombres: user.nombres,
                apellidos: user.apellidos,
                id_empresa: user.id_empresa,
            },
        });
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch('me')
    async updateMe(@Req() req, @Body() dto: UpdateMeDto) {
        const userId = req.user.userId;
        return this.authService.updateMe(userId, dto);
    }
}
