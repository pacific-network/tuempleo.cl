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
import { IniciarSesionDto } from '../oauth/dto/login';
import { Usuario } from 'src/repository/user/user.entity';
import { JwtService } from '@nestjs/jwt';
import { UpdateMeDto } from './dto/update-me';
import { RegistrarUsuarioOAuthDto } from '../oauth/dto/register-oauth';

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

    @UseGuards(AuthGuard('jwt'))
    @Patch('me')
    async updateMe(@Req() req, @Body() dto: UpdateMeDto) {
        const userId = req.user.userId;
        return this.authService.updateMe(userId, dto);
    }


}
