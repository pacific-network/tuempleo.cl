import {
  Injectable, UnauthorizedException, BadRequestException,
  InternalServerErrorException, NotFoundException
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Registro } from '../../repository/register/register.entity'
import { Usuario } from '../../repository/user/user.entity'
import { RegistrarUsuarioDto } from './dto/register'
import { IniciarSesionDto } from '../oauth/dto/login'
import { EncryptService } from 'src/shared/encrypt/encrypt.service'
import { MailerService } from '../mailer/mailer.service'
import { UpdateMeDto } from './dto/update-me'
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Registro)
    private readonly registroRepo: Repository<Registro>,

    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,

    private readonly jwt: JwtService,
    private readonly encrypt: EncryptService,
    private readonly mailerService: MailerService,
  ) { }

  // -------------------
  // Helpers
  // -------------------
  private norm(email?: string) {
    const e = (email || '').trim().toLowerCase()
    if (!e) throw new BadRequestException('Email vacío')
    return e
  }

  // -------------------
  // OAuth
  // -------------------
  async ensureUserFromJwt(payload: any): Promise<Usuario> {
    const email = (payload?.email || '').trim().toLowerCase()
    if (!email) throw new UnauthorizedException('Token sin email')

    let user = await this.usuarioRepo.findOne({ where: { email } })

    const nombres = (payload?.given_name || payload?.name || '').trim()
    const apellidos = (payload?.family_name || '').trim()

    const dummyPassword = await this.encrypt.encrypt(
      `oauth:${email}:${Date.now()}`
    )

    if (!user) {
      user = this.usuarioRepo.create({
        email,
        nombres: nombres || '',
        apellidos: apellidos || '',
        password: dummyPassword,
        is_activo: true,
      })
      await this.usuarioRepo.save(user)
    } else {
      let changed = false

      if (!user.nombres && nombres) {
        user.nombres = nombres
        changed = true
      }

      if (!user.apellidos && apellidos) {
        user.apellidos = apellidos
        changed = true
      }

      if (!user.password) {
        user.password = dummyPassword
        changed = true
      }

      if (!user.is_activo) {
        user.is_activo = true
        changed = true
      }

      if (changed) {
        await this.usuarioRepo.save(user)
      }
    }

    return user
  }

  // -------------------
  // Registro
  // -------------------
  async register(dto: RegistrarUsuarioDto) {
    try {
      const email = this.norm(dto.email)

      const exists = await this.registroRepo.findOne({ where: { email } })
      if (exists) {
        throw new UnauthorizedException('Email ya registrado')
      }

      const pass = await this.encrypt.encrypt(dto.password)

      const reg = this.registroRepo.create({
        email,
        password: pass,
        nombre_completo: dto.nombre_completo,
        es_activo: false,
      })

      await this.registroRepo.save(reg)

      return {
        message: 'Registro exitoso. Espera la activación.',
      }
    } catch (e) {
      if (
        e instanceof UnauthorizedException ||
        e instanceof BadRequestException
      ) {
        throw e
      }
      throw new InternalServerErrorException(
        'Error al registrar el usuario'
      )
    }
  }

  // -------------------
  // Login (CORREGIDO)
  // -------------------
  async login(
    data: IniciarSesionDto,
    context: 'postulante' | 'empleador'
  ) {
    const email = this.norm(data.email)

    const registro = await this.registroRepo.findOne({ where: { email } })
    if (!registro) {
      throw new UnauthorizedException('Usuario no encontrado')
    }

    const ok = await this.encrypt.compare(
      data.password,
      registro.password
    )

    if (!ok) {
      throw new UnauthorizedException('Contraseña incorrecta')
    }

    if (!registro.es_activo) {
      registro.es_activo = true
      await this.registroRepo.save(registro)
    }

    let user = await this.usuarioRepo.findOne({ where: { email } })

    if (!user) {
      const parts = (registro.nombre_completo || '')
        .trim()
        .split(/\s+/)

      user = this.usuarioRepo.create({
        email,
        nombres: parts[0] || '',
        apellidos: parts.slice(1).join(' '),
        password: registro.password,
        is_activo: true,
      })

      await this.usuarioRepo.save(user)
    }

    // ⚠️ LOGIN NO MODIFICA USUARIO ⚠️

    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      context,
      isAdmin: user.isAdmin ?? false,
    })

    return {
      message: 'Login exitoso',
      token,
    }
  }

  // -------------------
  // Me / Update
  // -------------------
  async findUserFullById(id: number) {
    const user = await this.usuarioRepo.findOne({ where: { id } })

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado')
    }

    return user
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.usuarioRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const ok = this.encrypt.compare(currentPassword, user.password);
    if (!ok) throw new BadRequestException('La contrasena actual es incorrecta');

    user.password = this.encrypt.encrypt(newPassword);
    await this.usuarioRepo.save(user);

    return { message: 'Contrasena actualizada correctamente' };
  }

  // -------------------
  // Forgot / Reset password
  // -------------------
  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalizedEmail = this.norm(email)
    const user = await this.usuarioRepo.findOne({ where: { email: normalizedEmail } })

    if (!user) {
      // No revelar si el email existe o no
      return { message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña' }
    }

    // Token JWT de 1 hora, con purpose para evitar reutilización
    const resetToken = this.jwt.sign(
      { sub: user.id, purpose: 'reset-password' },
      { expiresIn: '1h' },
    )

    const frontendUrl = process.env.FRONTEND_URL || 'https://tuempleo.cl'
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`

    try {
      await this.mailerService.sendTemplateMail({
        dest_email: user.email,
        message_id: process.env.PACIFIC_TEMPLATE_RECOVERY || '96275',
        Nombre: user.nombres,
        LinkRecuperacion: resetLink,
      })
    } catch {
      // Si el email falla, no bloquear el flujo
    }

    return {
      message: 'Te hemos enviado un enlace para restablecer tu contraseña. Si no lo recibes en unos minutos, revisa tu carpeta de spam o contacta a soporte@tuempleo.cl',
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    let payload: any
    try {
      payload = this.jwt.verify(token)
    } catch {
      throw new BadRequestException('Token inválido o expirado')
    }

    if (payload?.purpose !== 'reset-password') {
      throw new BadRequestException('Token inválido')
    }

    const user = await this.usuarioRepo.findOne({ where: { id: payload.sub } })
    if (!user) throw new NotFoundException('Usuario no encontrado')

    user.password = await this.encrypt.encrypt(newPassword)
    await this.usuarioRepo.save(user)

    // Sincronizar con tabla registro
    const registro = await this.registroRepo.findOne({ where: { email: user.email } })
    if (registro) {
      registro.password = user.password
      await this.registroRepo.save(registro)
    }

    return { message: 'Contraseña restablecida correctamente' }
  }

  async updateMe(
    userId: number,
    dto: UpdateMeDto
  ): Promise<Usuario> {
    const user = await this.usuarioRepo.findOne({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundException('Usuario no encontrado')
    }

    if (dto.password) {
      dto.password = await this.encrypt.encrypt(dto.password)
    }

    Object.assign(user, dto)
    return this.usuarioRepo.save(user)
  }
}

