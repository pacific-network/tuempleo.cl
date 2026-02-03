import {
  Controller, Post, Get, Req, Body, HttpCode, HttpStatus,
  Patch, UnauthorizedException
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { RegistrarUsuarioDto } from './dto/register'
import { Request } from 'express'
import { IniciarSesionDto } from '../oauth/dto/login'
import { UpdateMeDto } from './dto/update-me'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Postulante } from 'src/repository/postulant/postulant.entity'
import { Empleador } from 'src/repository/employer/employer.entity'

@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,

    @InjectRepository(Postulante)
    private readonly postulanteRepo: Repository<Postulante>,

    @InjectRepository(Empleador)
    private readonly empleadorRepo: Repository<Empleador>,
  ) { }

  // -------------------------
  // Register
  // -------------------------
  @Post('register')
  async register(@Body() dto: RegistrarUsuarioDto) {
    return this.authService.register(dto)
  }

  // -------------------------
  // Login (UX contexts)
  // -------------------------
  @Post('login-postulante')
  loginPostulante(@Body() dto: IniciarSesionDto) {
    return this.authService.login(dto, 'postulante')
  }

  @Post('login-empleador')
  loginEmpleador(@Body() dto: IniciarSesionDto) {
    return this.authService.login(dto, 'empleador')
  }

  // -------------------------
  // Me (FUENTE DE VERDAD)
  // -------------------------
  @Get('me')
  async getMe(@Req() req: Request) {
    const header = req.headers['authorization']
    const token =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice(7)
        : null

    if (!token) {
      throw new UnauthorizedException('Token requerido')
    }

    let payload: any
    try {
      payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'pacificNetwork2024',
      })
    } catch {
      throw new UnauthorizedException('Token inválido o expirado')
    }

    const userId = Number(payload?.sub)
    if (!Number.isFinite(userId)) {
      throw new UnauthorizedException('Token sin sub')
    }

    // 👇 CONTEXTO UX (NO SEGURIDAD)
    let context: 'postulante' | 'empleador' =
      payload?.context === 'empleador'
        ? 'empleador'
        : 'postulante'

    // asegurar usuario
    let user = await this.authService.findUserFullById(userId)

    if (!user && payload?.email) {
      user = await this.authService.ensureUserFromJwt(payload)
    }

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado')
    }

    // -------------------------
    // Estado REAL en DB
    // -------------------------
    const isPostulante = await this.postulanteRepo.exist({
      where: { usuario: { id: user.id } },
    })

    const isEmpleador = await this.empleadorRepo.exist({
      where: { usuario: { id: user.id } },
    })

    // -------------------------
    // Blindaje de coherencia
    // -------------------------
    if (context === 'empleador' && !isEmpleador) {
      // onboarding no completo → mantener contexto, pero marcar incompleto
    }

    if (context === 'postulante' && !isPostulante) {
      // onboarding no completo
    }

    const hasCompletedProfile =
      context === 'empleador'
        ? Boolean(isEmpleador && user.rut)
        : Boolean(isPostulante)

    return {
      id: user.id,
      email: user.email,
      nombres: user.nombres,
      apellidos: user.apellidos,
      rut: user.rut ?? null,

      // UX
      activeRole: context,

      // Estado real
      isPostulante,
      isEmpleador,

      // onboarding
      hasCompletedProfile,
    }
  }

  // -------------------------
  // Update me
  // -------------------------
  @Patch('me')
  async updateMe(@Req() req: Request, @Body() dto: UpdateMeDto) {
    const header = req.headers['authorization']
    const token =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice(7)
        : null

    if (!token) {
      throw new UnauthorizedException('Token requerido')
    }

    let payload: any
    try {
      payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'pacificNetwork2024',
      })
    } catch {
      throw new UnauthorizedException('Token inválido o expirado')
    }

    const userId = Number(payload?.sub)
    if (!Number.isFinite(userId)) {
      throw new UnauthorizedException('Token sin sub')
    }

    return this.authService.updateMe(userId, dto)
  }
}
