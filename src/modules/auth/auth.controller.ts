import { Request, Body, Controller, Post, HttpCode, HttpStatus, UseGuards, Get, } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegistrarUsuarioDto } from './dto/register';

@Controller('v1/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    async register(@Body() userData: RegistrarUsuarioDto) {
        return this.authService.register(userData);
    }

    @Post('login')
    async login(@Body() loginData: any) {
        return this.authService.login(loginData);
    }
}