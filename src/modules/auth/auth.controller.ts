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

@Controller('v1/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    async register(@Body() userData: RegistrarUsuarioDto) {
        return this.authService.register(userData);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginData: any) {
        return this.authService.login(loginData);
    }

    // GOOGLE OAUTH
    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleAuth(@Req() req: Request) {
        // Redirige automáticamente a Google
    }

    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
        const user = req.user;
        // Aquí puedes crear un JWT o redirigir
        const token = await this.authService.createTokenFromOAuth(user);
        res.redirect(`https://tu-frontend.com/auth?token=${token}`);
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

        return res.redirect(`http://localhost:3000/auth/linkedin/callback?token=${token}`);
    }
}
