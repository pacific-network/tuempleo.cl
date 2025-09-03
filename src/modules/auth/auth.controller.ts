import {
  Controller, Post, Get, Req, Body, HttpCode, HttpStatus,
  Patch, UnauthorizedException
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegistrarUsuarioDto } from './dto/register';
import { Request } from 'express';
import { IniciarSesionDto } from '../oauth/dto/login';
import { UpdateMeDto } from './dto/update-me';
import { JwtService } from '@nestjs/jwt';

// Nota: NO usamos AuthGuard en /auth/me para poder crear el usuario on-the-fly con el token OAuth.
@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegistrarUsuarioDto) {
    return this.authService.register(dto);
  }

  @Get('me')
  async getMe(@Req() req: Request) {
    const header = req.headers['authorization'];
    const token =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice(7)
        : null;

    if (!token) throw new UnauthorizedException('Token requerido');

    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'pacificNetwork2024',
      });
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    // --- 1) Intentar por sub ---
    const subNum = Number(payload?.sub);
    if (Number.isFinite(subNum)) {
      const bySub = await this.authService.findUserFullByIdSafe(subNum);
      if (bySub) {
        return {
          id: bySub.id,
          email: bySub.email,
          nombres: bySub.nombres,
          apellidos: bySub.apellidos,
          rol: bySub.rol ? { id: bySub.rol.id, nombre: bySub.rol.nombre } : null,
        };
      }
    }

    // --- 2) Intentar por email ---
    const email = (payload?.email || '').trim().toLowerCase();
    if (email) {
      const byEmail = await this.authService.findUserByEmailSafe(email);
      if (byEmail) {
        return {
          id: byEmail.id,
          email: byEmail.email,
          nombres: byEmail.nombres,
          apellidos: byEmail.apellidos,
          rol: byEmail.rol ? { id: byEmail.rol.id, nombre: byEmail.rol.nombre } : null,
        };
      }
    }

    // --- 3) Crear si no existe (OAuth) ---
    const created = await this.authService.ensureUserFromJwt(payload);
    return {
      id: created.id,
      email: created.email,
      nombres: created.nombres,
      apellidos: created.apellidos,
      rol: created.rol ? { id: created.rol.id, nombre: created.rol.nombre } : null,
    };
  }

  @Post('login-postulante')
  @HttpCode(HttpStatus.OK)
  async loginPostulante(@Body() loginData: IniciarSesionDto) {
    return this.authService.login(loginData, 1);
  }

  @Post('login-empleador')
  @HttpCode(HttpStatus.OK)
  async loginEmpleador(@Body() loginData: IniciarSesionDto) {
    return this.authService.login(loginData, 2);
  }

  @Patch('me')
  async updateMe(@Req() req: any, @Body() dto: UpdateMeDto) {
    const header = req.headers['authorization'];
    const token =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice(7)
        : null;
    if (!token) throw new UnauthorizedException('Token requerido');

    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'pacificNetwork2024',
      });
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    const subNum = Number(payload?.sub);
    if (!Number.isFinite(subNum)) {
      throw new UnauthorizedException('Token sin sub');
    }

    return this.authService.updateMe(subNum, dto);
  }
}
