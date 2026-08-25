import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { InvitacionEmpleador } from 'src/repository/invitacion-empleador/invitacion-empleador.entity';
import { Empleador } from 'src/repository/employer/employer.entity';
import { Usuario } from 'src/repository/user/user.entity';
import { Registro } from 'src/repository/register/register.entity';
import { MailerService } from '../mailer/mailer.service';
import { EncryptService } from 'src/shared/encrypt/encrypt.service';
import { AceptarInvitacionDto } from './dto/invitar-empleador.dto';

@Injectable()
export class InvitacionService {
  constructor(
    @InjectRepository(InvitacionEmpleador)
    private readonly invitacionRepo: Repository<InvitacionEmpleador>,

    @InjectRepository(Empleador)
    private readonly empleadorRepo: Repository<Empleador>,

    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,

    @InjectRepository(Registro)
    private readonly registroRepo: Repository<Registro>,

    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly encryptService: EncryptService,
  ) {}

  // Genera codigo de 6 digitos
  private generarCodigo(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Membresía en la empresa activa (`usuario.id_empresa`). Con una sola
   * membresía se devuelve esa, para no exigir selección previa a quien tiene
   * una empresa nada más.
   */
  private async getMembresiaActiva(userId: number): Promise<Empleador | null> {
    const usuario = await this.usuarioRepo.findOne({ where: { id: userId } });
    if (!usuario) return null;

    if (usuario.id_empresa) {
      return this.empleadorRepo.findOne({
        where: { usuario: { id: userId }, empresa: { id: usuario.id_empresa } },
        relations: ['usuario', 'empresa'],
      });
    }

    const membresias = await this.empleadorRepo.find({
      where: { usuario: { id: userId } },
      relations: ['usuario', 'empresa'],
      take: 2,
    });
    return membresias.length === 1 ? membresias[0] : null;
  }

  // ======================================================
  // INVITAR MIEMBRO
  // ======================================================
  async invitar(userId: number, telefono?: string, email?: string) {
    // Se invita a la empresa activa: con la persona en varias empresas, resolver
    // solo por usuario mandaría la invitación a una empresa arbitraria.
    const empleador = await this.getMembresiaActiva(userId);

    if (!empleador) {
      throw new NotFoundException('Empleador no encontrado');
    }

    if (empleador.rol_empresa !== 'admin') {
      throw new ForbiddenException('Solo el administrador puede invitar miembros');
    }

    if (!telefono && !email) {
      throw new BadRequestException('Debe proporcionar al menos un telefono o email');
    }

    // Invalidar invitaciones pendientes anteriores para este telefono/email + empresa
    const condiciones: any[] = [];
    if (telefono) condiciones.push({ telefono, empresa: { id: empleador.empresa.id }, estado: 'pendiente' });
    if (email) condiciones.push({ email, empresa: { id: empleador.empresa.id }, estado: 'pendiente' });

    if (condiciones.length > 0) {
      const anteriores = await this.invitacionRepo.find({ where: condiciones });
      for (const inv of anteriores) {
        inv.estado = 'expirada';
      }
      if (anteriores.length > 0) {
        await this.invitacionRepo.save(anteriores);
      }
    }

    // Generar codigo unico
    let codigo: string;
    do {
      codigo = this.generarCodigo();
    } while (await this.invitacionRepo.existsBy({ codigo, estado: 'pendiente' }));

    // Crear invitacion (expira en 48 horas)
    const expiraEn = new Date();
    expiraEn.setHours(expiraEn.getHours() + 48);

    const invitacion = this.invitacionRepo.create({
      codigo,
      telefono: telefono || null,
      email: email || null,
      empresa: empleador.empresa,
      invitadoPor: empleador,
      estado: 'pendiente',
      expiraEn,
    });

    await this.invitacionRepo.save(invitacion);

    const nombreAdmin = empleador.usuario.nombres;
    const nombreEmpresa = empleador.empresa.nombre_fantasia
      || empleador.empresa.razon_social
      || 'tu empresa';

    const frontendUrl = process.env.FRONTEND_URL || 'https://tuvacante.com';
    const linkInvitacion = `${frontendUrl}/invitacion?codigo=${codigo}`;

    // El SMS de invitacion NO se manda desde aca: lo envia el frontend en
    // `InvitarEmpleador.tsx`, con el codigo y ademas el link de registro.
    // Hasta ahora se mandaban los dos y el invitado recibia dos mensajes
    // distintos por el mismo codigo. Se dejo el del frontend por ser el mas
    // completo. `canales` sigue reportando SMS porque el invitado si lo recibe.

    // Enviar email si se proporciona
    let emailEnviado = false;
    if (email) {
      try {
        await this.mailerService.sendTemplateMail({
          dest_email: email,
          message_id: process.env.PACIFIC_TEMPLATE_INVITACION || '96274',
          NombreInvitado: nombreAdmin,
          NombreEmpresa: nombreEmpresa,
          LinkInvitacion: linkInvitacion,
        });
        emailEnviado = true;
      } catch {
        // Si el email falla, no bloquear el flujo
      }
    }

    const canales = [telefono && 'SMS', emailEnviado && 'Email'].filter(Boolean);

    return {
      message: `Invitacion enviada por ${canales.join(' y ')}`,
      codigo,
      expiraEn,
    };
  }

  // ======================================================
  // VALIDAR CODIGO (solo verifica, no consume)
  // ======================================================
  async validarCodigo(codigo: string) {
    const invitacion = await this.invitacionRepo.findOne({
      where: { codigo, estado: 'pendiente' },
      relations: ['empresa'],
    });

    if (!invitacion) {
      throw new NotFoundException('Codigo invalido o ya utilizado');
    }

    if (invitacion.expiraEn < new Date()) {
      invitacion.estado = 'expirada';
      await this.invitacionRepo.save(invitacion);
      throw new BadRequestException('El codigo ha expirado');
    }

    return {
      valido: true,
      empresa: invitacion.empresa.nombre_fantasia
        || invitacion.empresa.razon_social,
      empresa_id: invitacion.empresa.id,
    };
  }

  // ======================================================
  // ACEPTAR INVITACION (crear usuario + empleador)
  // ======================================================
  async aceptarInvitacion(dto: AceptarInvitacionDto) {
    // Validar codigo
    const invitacion = await this.invitacionRepo.findOne({
      where: { codigo: dto.codigo, estado: 'pendiente' },
      relations: ['empresa'],
    });

    if (!invitacion) {
      throw new NotFoundException('Codigo invalido o ya utilizado');
    }

    if (invitacion.expiraEn < new Date()) {
      invitacion.estado = 'expirada';
      await this.invitacionRepo.save(invitacion);
      throw new BadRequestException('El codigo ha expirado');
    }

    // Verificar que el email no exista
    const emailExiste = await this.usuarioRepo.findOne({
      where: { email: dto.email },
    });

    if (emailExiste) {
      throw new BadRequestException('El email ya esta registrado');
    }

    const encryptedPassword = this.encryptService.encrypt(dto.password);

    // Crear registro (para que pueda hacer login)
    const registro = this.registroRepo.create({
      email: dto.email,
      password: encryptedPassword,
      nombre_completo: '',
      es_activo: true,
    });
    await this.registroRepo.save(registro);

    // Crear usuario minimo (datos se completan en onboarding)
    const usuario = this.usuarioRepo.create({
      email: dto.email,
      nombres: '',
      apellidos: '',
      password: encryptedPassword,
      is_activo: true,
      id_empresa: invitacion.empresa.id,
    });
    await this.usuarioRepo.save(usuario);

    // Crear empleador como miembro (data se completa en onboarding)
    const empleador = this.empleadorRepo.create({
      usuario,
      empresa: invitacion.empresa,
      rol_empresa: 'miembro',
      data: {},
    });
    await this.empleadorRepo.save(empleador);

    // Marcar invitacion como aceptada
    invitacion.estado = 'aceptada';
    await this.invitacionRepo.save(invitacion);

    // Generar JWT para login automatico
    const token = this.jwtService.sign({
      sub: usuario.id,
      email: usuario.email,
      context: 'empleador',
      isAdmin: false,
    });

    return {
      message: 'Invitacion aceptada. Tu cuenta ha sido creada.',
      token,
      empleador_id: empleador.id,
      empresa_id: invitacion.empresa.id,
    };
  }
}
