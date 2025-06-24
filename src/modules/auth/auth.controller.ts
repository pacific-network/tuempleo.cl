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
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegistrarUsuarioDto } from './dto/register';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { IniciarSesionDto } from './dto/login';

@Controller('v1/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    async register(@Body() userData: RegistrarUsuarioDto) {
        return this.authService.register(userData);
    }

    // @Post('login')
    // @HttpCode(HttpStatus.OK)
    // async login(@Body() loginData: any) {
    //     return this.authService.login(loginData);
    // }

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
      const user = req.user;
  
      const token = await this.authService.createTokenFromOAuth(user);
  
      // Redirige al frontend con el token (ajusta si usas otro path)
      return res.redirect(`https://tuempleo.cl/auth?token=${token}`);
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
        const user = req.user;
        const token = await this.authService.createTokenFromOAuth(user);

        return res.redirect(`https://tuempleo.cl/auth?token=${token}`);

    }
}
