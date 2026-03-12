import {
  Controller, Post, Get, Req, Body, HttpCode, HttpStatus,
  Patch, UnauthorizedException, UseGuards
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { RegistrarUsuarioDto } from './dto/register'
import { Request } from 'express'
import { IniciarSesionDto } from '../oauth/dto/login'
import { UpdateMeDto } from './dto/update-me'
import { ChangePasswordDto } from './dto/change-password.dto'
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Postulante } from 'src/repository/postulant/postulant.entity'
import { Empleador } from 'src/repository/employer/employer.entity'
import { AuthGuard } from './guards/auth.guards'
import { User } from 'src/shared/decorators/user.decorator'

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

    const hasCompletedProfile = Boolean(user.rut)

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
      isAdmin: user.isAdmin ?? false,

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

  // -------------------------
  // Forgot / Reset password
  // -------------------------
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email)
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword)
  }

  // -------------------------
  // Change password
  // -------------------------
  @UseGuards(AuthGuard)
  @Patch('change-password')
  async changePassword(
    @User() user: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.sub, dto.currentPassword, dto.newPassword)
  }
}
