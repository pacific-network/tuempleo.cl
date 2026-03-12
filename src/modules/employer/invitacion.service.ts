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
    private readonly encryptService: EncryptService,
  ) {}

  // Genera codigo de 6 digitos
  private generarCodigo(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // ======================================================
  // INVITAR MIEMBRO
  // ======================================================
  async invitar(userId: number, telefono: string) {
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

    // Verificar que no haya invitacion pendiente para este telefono + empresa
    const existente = await this.invitacionRepo.findOne({
      where: {
        telefono,
        empresa: { id: empleador.empresa.id },
        estado: 'pendiente',
        expiraEn: MoreThan(new Date()),
      },
    });

    if (existente) {
      throw new BadRequestException('Ya existe una invitacion pendiente para este numero');
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
      telefono,
      empresa: empleador.empresa,
      invitadoPor: empleador,
      estado: 'pendiente',
      expiraEn,
    });

    await this.invitacionRepo.save(invitacion);

    // Enviar SMS
    const nombreAdmin = empleador.usuario.nombres;
    const nombreEmpresa = empleador.empresa.nombre_fantasia
      || empleador.empresa.razon_social
      || 'tu empresa';

    await this.smsService.sendIndividualSms({
      number: telefono,
      content: `${nombreAdmin} te invito a ser miembro de ${nombreEmpresa} en TuEmpleo.cl. Tu codigo es: ${codigo}`,
      tipo: SmsTipo.TRANSACCIONAL,
    });

    return {
      message: 'Invitacion enviada por SMS',
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
