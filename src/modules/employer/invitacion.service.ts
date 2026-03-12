import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { InvitacionEmpleador } from 'src/repository/invitacion-empleador/invitacion-empleador.entity';
import { Empleador } from 'src/repository/employer/employer.entity';
import { Usuario } from 'src/repository/user/user.entity';
import { SmsService } from '../sms-generator/sms.service';
import { SmsTipo } from '../sms-generator/dto/sms.dto';
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

    private readonly smsService: SmsService,
    private readonly mailerService: MailerService,
    private readonly encryptService: EncryptService,
  ) {}

  // Genera codigo de 6 digitos
  private generarCodigo(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // ======================================================
  // INVITAR MIEMBRO
  // ======================================================
  async invitar(userId: number, telefono?: string, email?: string) {
    // Verificar que el empleador es admin
    const empleador = await this.empleadorRepo.findOne({
      where: { usuario: { id: userId } },
      relations: ['usuario', 'empresa'],
    });

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

    const frontendUrl = process.env.FRONTEND_URL || 'https://tuempleo.cl';
    const linkInvitacion = `${frontendUrl}/invitacion?codigo=${codigo}`;

    // Enviar SMS si se proporciona telefono
    if (telefono) {
      await this.smsService.sendIndividualSms({
        number: telefono,
        content: `${nombreAdmin} te invito a ser miembro de ${nombreEmpresa} en TuEmpleo.cl. Tu codigo es: ${codigo}`,
        tipo: SmsTipo.TRANSACCIONAL,
      });
    }

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

    // Crear usuario
    const usuario = this.usuarioRepo.create({
      email: dto.email,
      nombres: dto.nombres,
      apellidos: dto.apellidos,
      rut: dto.rut,
      password: this.encryptService.encrypt(dto.password),
      is_activo: true,
      id_empresa: invitacion.empresa.id,
    });

    await this.usuarioRepo.save(usuario);

    // Crear empleador como miembro
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

    return {
      message: 'Invitacion aceptada. Tu cuenta ha sido creada.',
      empleador_id: empleador.id,
      empresa_id: invitacion.empresa.id,
    };
  }
}
