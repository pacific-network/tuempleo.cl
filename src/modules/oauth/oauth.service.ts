import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtService } from '@nestjs/jwt'

import { Registro } from 'src/repository/register/register.entity'
import { Usuario } from 'src/repository/user/user.entity'
import { Rol } from 'src/repository/role/role.entity'
import { EncryptService } from 'src/shared/encrypt/encrypt.service'

type Provider = 'google' | 'linkedin'

interface ValidateOAuthUserInput {
  email: string
  name?: string
  picture?: string | null
  provider: Provider
  oauthId?: string | null
  rolId?: number // 1 = postulante, 2 = empleador (viene desde controller por audience)
}

@Injectable()
export class OauthService {
  constructor(
    @InjectRepository(Registro)
    private readonly registroRepository: Repository<Registro>,

    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,

    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,

    private readonly jwtService: JwtService,
    private readonly encryptService: EncryptService,
  ) { }

  // =========================
  // Helpers
  // =========================

  private normalizeEmail(email?: string): string {
    const e = (email || '').trim().toLowerCase()
    if (!e) throw new BadRequestException('Email vacío')
    return e
  }

  private splitFullName(fullName?: string) {
    const safe = (fullName || '').trim()
    if (!safe) return { nombres: '', apellidos: '' }

    const parts = safe.split(/\s+/)
    if (parts.length === 1) {
      return { nombres: parts[0], apellidos: '' }
    }

    const first = parts.shift()!
    return { nombres: first, apellidos: parts.join(' ') }
  }

  private async getRoleOrFail(rolId: number): Promise<Rol> {
    const rol = await this.rolRepository.findOne({ where: { id: rolId } })
    if (!rol) throw new UnauthorizedException('Rol no encontrado')
    return rol
  }

  private signFor(user: Usuario): string {
    const payload = {
      sub: Number(user.id),
      email: user.email,
    }

    console.log('[OAuth][JWT] signing payload:', payload)

    return this.jwtService.sign(payload)
  }

  // =========================
  // API pública
  // =========================

  async validateOAuthUser(
    input: ValidateOAuthUserInput,
  ): Promise<{
    usuario: Usuario
    token: string
    requiereEmpresa?: boolean
    requierePostulante?: boolean
  }> {
    try {
      console.log('\n==============================')
      console.log('[OAuth] validateOAuthUser START')
      console.log('[OAuth] provider:', input.provider)
      console.log('[OAuth] raw email:', input.email)
      console.log('[OAuth] incoming rolId:', input.rolId)
      console.log('==============================')

      const email = this.normalizeEmail(input.email)
      const fullName = (input.name || '').trim()
      const { nombres, apellidos } = this.splitFullName(fullName)

      const rolId = input.rolId ?? 1 // fallback postulante

      console.log('[OAuth] normalized email:', email)
      console.log('[OAuth] resolved rolId:', rolId)

      // -------------------------
      // 1️⃣ Registro
      // -------------------------
      let registro = await this.registroRepository.findOne({
        where: { email },
      })

      if (!registro) {
        console.log('[OAuth][Registro] creating new registro')

        const dummyHash = await this.encryptService.encrypt(
          `${input.provider}:${Math.random().toString(36).slice(2)}`,
        )

        registro = this.registroRepository.create({
          email,
          password: dummyHash,
          nombre_completo: fullName || email,
          es_activo: true,
        })

        await this.registroRepository.save(registro)
      } else {
        console.log('[OAuth][Registro] found existing registro')

        if (!registro.es_activo) {
          console.log('[OAuth][Registro] activating registro')
          registro.es_activo = true
          await this.registroRepository.save(registro)
        }
      }

      // -------------------------
      // 2️⃣ Usuario
      // -------------------------
      let usuario = await this.usuarioRepository.findOne({
        where: { email },
        relations: ['rol'],
      })

      if (!usuario) {
        console.log('[OAuth][Usuario] creating new usuario')

        const rol = await this.getRoleOrFail(rolId)

        usuario = this.usuarioRepository.create({
          email,
          nombres: nombres || email,
          apellidos: apellidos || '',
          password: registro.password,
          rol,
          perfil_foto: input.picture || null,
          is_activo: true,
          fecha_creacion: new Date(),
        })

        await this.usuarioRepository.save(usuario)
      } else {
        console.log('[OAuth][Usuario] found existing usuario:', {
          id: usuario.id,
          currentRol: usuario.rol?.id,
        })

        let touched = false

        if (!usuario.is_activo) {
          console.log('[OAuth][Usuario] activating usuario')
          usuario.is_activo = true
          touched = true
        }

        if (!usuario.rol || usuario.rol.id !== rolId) {
          console.log(
            '[OAuth][Usuario] updating rol:',
            usuario.rol?.id,
            '→',
            rolId,
          )
          usuario.rol = await this.getRoleOrFail(rolId)
          touched = true
        }

        if (touched) {
          await this.usuarioRepository.save(usuario)
        }
      }

      // -------------------------
      // 3️⃣ JWT
      // -------------------------
      const token = this.signFor(usuario)

      // -------------------------
      // 4️⃣ Hints
      // -------------------------
      const hints =
        rolId === 1
          ? { requierePostulante: true }
          : { requiereEmpresa: true }

      console.log('[OAuth] SUCCESS:', {
        userId: usuario.id,
        email: usuario.email,
        rolId: usuario.rol?.id,
      })
      console.log('==============================\n')

      return {
        usuario,
        token,
        ...hints,
      }
    } catch (err) {
      console.error('[OAuth] validateOAuthUser ERROR:', err)
      throw new InternalServerErrorException(
        'Error validando o creando usuario OAuth',
      )
    }
  }

  async findUserByEmail(email: string): Promise<Usuario | null> {
    const normalized = this.normalizeEmail(email)

    const user = await this.usuarioRepository.findOne({
      where: { email: normalized },
      relations: ['rol'],
    })

    if (!user) {
      throw new NotFoundException(
        `Usuario con email ${normalized} no encontrado`,
      )
    }

    return user
  }
}
