import {
  Injectable, UnauthorizedException, BadRequestException,
  InternalServerErrorException, NotFoundException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Registro } from '../../repository/register/register.entity';
import { Usuario } from '../../repository/user/user.entity';
import { Rol } from '../../repository/role/role.entity';
import { RegistrarUsuarioDto } from './dto/register';
import { IniciarSesionDto } from '../oauth/dto/login';
import { EncryptService } from 'src/shared/encrypt/encrypt.service';
import { UpdateMeDto } from './dto/update-me';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Registro) private readonly registroRepo: Repository<Registro>,
    @InjectRepository(Usuario)  private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Rol)      private readonly rolRepo: Repository<Rol>,
    private readonly jwt: JwtService,
    private readonly encrypt: EncryptService,
  ) {}

  // ---------- helpers públicos ----------
  async findUserFullByIdSafe(id?: number): Promise<Usuario | null> {
    if (!Number.isFinite(id)) return null;
    return this.usuarioRepo.findOne({ where: { id: Number(id) }, relations: ['rol'] });
  }

  async findUserByEmailSafe(email?: string): Promise<Usuario | null> {
    const e = (email || '').trim().toLowerCase();
    if (!e) return null;
    return this.usuarioRepo.findOne({ where: { email: e }, relations: ['rol'] });
  }

  // Crea (o completa) el usuario a partir de los claims del JWT (OAuth)
  // payload esperado: { email, name?, given_name?/givenName?/first_name?/localizedFirstName, family_name?/familyName?/last_name?/localizedLastName, rolId? }
  async ensureUserFromJwt(payload: any): Promise<Usuario> {
    const email = (payload?.email || '').trim().toLowerCase();
    if (!email) throw new UnauthorizedException('Token sin email');

    // ¿ya existe?
    let user = await this.usuarioRepo.findOne({ where: { email }, relations: ['rol'] });

    // Derivar nombres desde varios posibles claims (Google/LinkedIn/otros)
    const claim = (v?: any) => (typeof v === 'string' ? v.trim() : '');

    let given  =
      claim(payload?.given_name) ||
      claim(payload?.givenName) ||
      claim(payload?.first_name) ||
      claim(payload?.profile?.given_name) ||
      claim(payload?.profile?.first_name) ||
      claim(payload?.localizedFirstName);

    let family =
      claim(payload?.family_name) ||
      claim(payload?.familyName) ||
      claim(payload?.last_name)  ||
      claim(payload?.profile?.family_name) ||
      claim(payload?.profile?.last_name) ||
      claim(payload?.localizedLastName);

    const full = claim(payload?.name) || claim(payload?.displayName) || claim(payload?.profile?.name);

    // Si faltan given/family, partir 'name' por el último espacio
    if ((!given || !family) && full) {
      const t = full.replace(/\s+/g, ' ').trim();
      const i = t.lastIndexOf(' ');
      if (i > 0) {
        given  = given  || t.slice(0, i);
        family = family || t.slice(i + 1);
      } else {
        given = given || t;
      }
    }

    const nombres   = (given  || '').trim();
    const apellidos = (family || '').trim();

    // Resolver rol: si el usuario YA existe, no lo tocamos (no alterar empresa).
    let rol: Rol | null = null;
    if (!user) {
      let rolId = Number(payload?.rolId);
      if (!Number.isFinite(rolId) || rolId <= 0) rolId = 1; // 1 = Postulante por defecto
      rol = await this.rolRepo.findOne({ where: { id: rolId } });
      if (!rol) {
        // fallback: intenta 1, o cualquiera
        rol = await this.rolRepo.findOne({ where: { id: 1 } }) || await this.rolRepo.findOne({});
        if (!rol) throw new UnauthorizedException('Rol no disponible para crear usuario');
      }
    }

    // Password dummy para cumplir esquema
    const dummy = await this.encrypt.encrypt(`oauth:${email}:${Date.now()}`);

    if (!user) {
      // Crear nuevo usuario (candidato por defecto si no se indicó otro)
      user = this.usuarioRepo.create({
        email,
        nombres: nombres || '',
        apellidos: apellidos || '',
        password: dummy,
        rol: rol!, // definido arriba
      });
      await this.usuarioRepo.save(user);
    } else {
      // Completar datos faltantes, pero NO cambiar el rol existente (respeta empresa)
      let changed = false;
      if (!user.nombres && nombres)      { user.nombres = nombres; changed = true; }
      if (!user.apellidos && apellidos)  { user.apellidos = apellidos; changed = true; }
      if (!user.password)                { user.password = dummy;    changed = true; }
      if (changed) await this.usuarioRepo.save(user);
    }

    // devolver con relación de rol
    return this.usuarioRepo.findOne({ where: { id: user.id }, relations: ['rol'] }) as Promise<Usuario>;
  }

  // ---------- registro clásico ----------
  private norm(email?: string) {
    const e = (email || '').trim().toLowerCase();
    if (!e) throw new BadRequestException('Email vacío');
    return e;
  }

  async register(dto: RegistrarUsuarioDto) {
    try {
      const email = this.norm(dto.email);

      const exists = await this.registroRepo.findOne({ where: { email } });
      if (exists) throw new UnauthorizedException('Email ya registrado');

      const pass = await this.encrypt.encrypt(dto.password);
      const reg = this.registroRepo.create({
        email, password: pass, nombre_completo: dto.nombre_completo, es_activo: false,
      });
      await this.registroRepo.save(reg);
      return { message: 'Registro exitoso. Espera la activación.' };
    } catch (e) {
      if (e instanceof UnauthorizedException || e instanceof BadRequestException) throw e;
      throw new InternalServerErrorException('Error al registrar el usuario');
    }
  }

  // ---------- login clásico por rol ----------
  async login(data: IniciarSesionDto, rolId: number) {
    const email = this.norm(data.email);

    const registro = await this.registroRepo.findOne({ where: { email } });
    if (!registro) throw new UnauthorizedException('Usuario no encontrado');

    const ok = await this.encrypt.compare(data.password, registro.password);
    if (!ok) throw new UnauthorizedException('Contraseña incorrecta');

    registro.es_activo = true;
    await this.registroRepo.save(registro);

    let user = await this.usuarioRepo.findOne({ where: { email }, relations: ['rol'] });
    if (!user) {
      const rol = await this.rolRepo.findOne({ where: { id: rolId } });
      if (!rol) throw new UnauthorizedException('Rol no encontrado');

      const parts = (registro.nombre_completo || '').trim().split(/\s+/);
      user = this.usuarioRepo.create({
        email,
        nombres: parts[0] || '',
        apellidos: parts.slice(1).join(' '),
        password: registro.password,
        rol,
      });
      await this.usuarioRepo.save(user);
    } else if (user.rol?.id !== rolId) {
      const rol = await this.rolRepo.findOne({ where: { id: rolId } });
      if (!rol) throw new UnauthorizedException('Rol no encontrado');
      user.rol = rol;
      await this.usuarioRepo.save(user);
    }

    const token = this.jwt.sign({ email: user.email, sub: Number(user.id), rolId: user.rol.id });
    return { message: 'Login exitoso', token };
  }

  // ---------- misceláneos ----------
  async findUserFullById(id: number) {
    const user = await this.usuarioRepo.findOne({ where: { id }, relations: ['rol'] });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    return user;
  }

  async updateMe(userId: number, dto: UpdateMeDto): Promise<Usuario> {
    const user = await this.usuarioRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (dto.password) dto.password = await this.encrypt.encrypt(dto.password);
    Object.assign(user, dto);
    return this.usuarioRepo.save(user);
  }
}
