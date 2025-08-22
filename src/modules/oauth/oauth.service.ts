// src/modules/oauth/oauth.service.ts

import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { Registro } from 'src/repository/register/register.entity';
import { Usuario } from 'src/repository/user/user.entity';
import { Rol } from 'src/repository/role/role.entity';
import { EncryptService } from 'src/shared/encrypt/encrypt.service';

type Provider = 'google' | 'linkedin';

interface ValidateOAuthUserInput {
  email: string;
  name?: string;
  picture?: string | null;
  provider: Provider;
  oauthId?: string | null;   // opcional / informativo
  rolId?: number;            // 1 = candidato, 2 = empleador (el controller ya lo manda)
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
  ) {}

  // ----------------- Helpers -----------------
  private normalizeEmail(email?: string): string {
    const e = (email || '').trim().toLowerCase();
    if (!e) throw new BadRequestException('Email vacío');
    return e;
  }

  private splitFullName(fullName?: string): { nombres: string; apellidos: string } {
    const safe = (fullName || '').trim();
    if (!safe) return { nombres: '', apellidos: '' };
    const parts = safe.split(/\s+/);
    if (parts.length === 1) return { nombres: parts[0], apellidos: '' };
    const first = parts.shift()!;
    return { nombres: first, apellidos: parts.join(' ') };
  }

  private async getRoleOrFail(rolId: number): Promise<Rol> {
    const rol = await this.rolRepository.findOne({ where: { id: rolId } });
    if (!rol) throw new UnauthorizedException('Rol no encontrado');
    return rol;
  }

  private signFor(user: Usuario) {
    // IMPORTANT: sub DEBE ser numérico y corresponder a usuario.id
    const payload = { email: user.email, sub: Number(user.id), rolId: user.rol?.id };
    return this.jwtService.sign(payload);
    // Asegúrate que JwtModule/JwtStrategy usen el MISMO JWT_SECRET
  }

  // ----------------- API pública -----------------
  /**
   * Upsertea Registro + Usuario desde OAuth y devuelve token (sub = usuario.id)
   */
  async validateOAuthUser(input: ValidateOAuthUserInput): Promise<{
    usuario: Usuario;
    token: string;
    requiereEmpresa?: boolean;
    requierePostulante?: boolean;
  }> {
    try {
      const email = this.normalizeEmail(input.email);
      const fullName = (input.name || '').trim();
      const { nombres, apellidos } = this.splitFullName(fullName);
      const rolId = input.rolId ?? 2; // por compatibilidad, el controller ya manda 1 ó 2

      // 1) Registro (crear si no existe; activar si estaba inactivo)
      let registro = await this.registroRepository.findOne({ where: { email } });
      if (!registro) {
        const dummyHash = await this.encryptService.encrypt(
          `${input.provider}:${Math.random().toString(36).slice(2)}`
        );
        registro = this.registroRepository.create({
          email,
          password: dummyHash,
          nombre_completo: fullName || email,
          es_activo: true,
        });
        await this.registroRepository.save(registro);
      } else if (!registro.es_activo) {
        registro.es_activo = true;
        await this.registroRepository.save(registro);
      }

      // 2) Usuario (crear si no existe; ajustar rol si difiere)
      let usuario = await this.usuarioRepository.findOne({
        where: { email },
        relations: ['rol'],
      });

      if (!usuario) {
        const rol = await this.getRoleOrFail(rolId);
        usuario = this.usuarioRepository.create({
          email,
          nombres: nombres || email,
          apellidos: apellidos || '',
          password: registro.password, // usamos el hash "dummy"
          rol,
          perfil_foto: input.picture || null,
          is_activo: true,
          fecha_creacion: new Date(),
        });
        await this.usuarioRepository.save(usuario);
      } else {
        let touched = false;
        if (!usuario.is_activo) {
          usuario.is_activo = true;
          touched = true;
        }
        if (!usuario.rol || usuario.rol.id !== rolId) {
          usuario.rol = await this.getRoleOrFail(rolId);
          touched = true;
        }
        if (touched) {
          await this.usuarioRepository.save(usuario);
        }
      }

      // 3) Token con sub = usuario.id (numérico)
      const token = this.signFor(usuario);

      // 4) Hints opcionales (ajústalos si tienes tablas Empresa/Postulante)
      const hints =
        rolId === 1
          ? { requierePostulante: true } // candidato: llévalo a completar perfil
          : { requiereEmpresa: true };   // empleador: llévalo a crear empresa

      return { usuario, token, ...hints };
    } catch (err) {
      console.error('[OAuth] validateOAuthUser error:', err);
      throw new InternalServerErrorException('Error validando o creando usuario OAuth');
    }
  }

  // Usado por /v1/oauth/user-by-email si lo necesitas
  async findUserByEmail(email: string): Promise<Usuario | null> {
    const normalized = this.normalizeEmail(email);
    const user = await this.usuarioRepository.findOne({
      where: { email: normalized },
      relations: ['rol'],
    });
    if (!user) throw new NotFoundException(`Usuario con email ${normalized} no encontrado`);
    return user;
  }
}
