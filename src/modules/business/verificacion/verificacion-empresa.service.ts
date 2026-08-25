import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Empresa } from '../../../repository/business/business.entity';
import { VerificacionEmpresa } from '../../../repository/business/verificacion-empresa.entity';
import { Empleador } from '../../../repository/employer/employer.entity';
import { SmsService } from '../../sms-generator/sms.service';
import { SmsTipo } from '../../sms-generator/dto/sms.dto';

const CODIGO_VIGENCIA_MIN = 15;
const MAX_INTENTOS = 5;

@Injectable()
export class VerificacionEmpresaService {
  constructor(
    @InjectRepository(VerificacionEmpresa)
    private readonly verificacionRepo: Repository<VerificacionEmpresa>,

    @InjectRepository(Empresa)
    private readonly empresaRepo: Repository<Empresa>,

    @InjectRepository(Empleador)
    private readonly empleadorRepo: Repository<Empleador>,

    private readonly smsService: SmsService,
  ) { }

  private generarCodigo(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // El usuario autenticado debe ser admin de ESA empresa.
  private async validarAdminDeEmpresa(empresaId: number, userId: number): Promise<Empresa> {
    const empresa = await this.empresaRepo.findOne({ where: { id: empresaId } });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    // Se busca la membresía de ESTA empresa. Resolver por usuario y comparar
    // después devolvía una membresía arbitraria cuando la persona está en
    // varias empresas, y rechazaba a quien sí pertenecía.
    const empleador = await this.empleadorRepo.findOne({
      where: { usuario: { id: userId }, empresa: { id: empresaId } },
      relations: ['empresa'],
    });
    if (!empleador) {
      throw new ForbiddenException('No perteneces a esta empresa');
    }
    if (empleador.rol_empresa !== 'admin') {
      throw new ForbiddenException('Solo el administrador puede verificar la empresa');
    }
    return empresa;
  }

  async solicitar(empresaId: number, telefono: string, userId: number) {
    const empresa = await this.validarAdminDeEmpresa(empresaId, userId);

    if (empresa.verificada) {
      throw new BadRequestException('La empresa ya está verificada');
    }

    // Invalidar códigos pendientes anteriores de esta empresa.
    const pendientes = await this.verificacionRepo.find({
      where: { empresa: { id: empresaId }, estado: 'pendiente' },
    });
    for (const v of pendientes) v.estado = 'expirada';
    if (pendientes.length) await this.verificacionRepo.save(pendientes);

    const codigo = this.generarCodigo();
    const expiraEn = new Date();
    expiraEn.setMinutes(expiraEn.getMinutes() + CODIGO_VIGENCIA_MIN);

    const verificacion = this.verificacionRepo.create({
      empresa,
      telefono,
      codigo,
      estado: 'pendiente',
      intentos: 0,
      expiraEn,
    });
    await this.verificacionRepo.save(verificacion);

    const nombre = empresa.nombre_fantasia || empresa.razon_social || 'tu empresa';
    await this.smsService.sendIndividualSms({
      number: telefono,
      content: `Tu codigo de verificacion para ${nombre} en tuvacante.com es: ${codigo}. Vence en ${CODIGO_VIGENCIA_MIN} minutos.`,
      tipo: SmsTipo.TRANSACCIONAL,
    });

    return {
      message: 'Código de verificación enviado por SMS',
      expiraEn,
    };
  }

  async confirmar(empresaId: number, codigo: string, userId: number) {
    await this.validarAdminDeEmpresa(empresaId, userId);

    const verificacion = await this.verificacionRepo.findOne({
      where: { empresa: { id: empresaId }, estado: 'pendiente' },
      relations: ['empresa'],
      order: { createdAt: 'DESC' },
    });
    if (!verificacion) {
      throw new BadRequestException('No hay una verificación pendiente. Solicita un nuevo código.');
    }

    if (verificacion.expiraEn < new Date()) {
      verificacion.estado = 'expirada';
      await this.verificacionRepo.save(verificacion);
      throw new BadRequestException('El código ha expirado. Solicita uno nuevo.');
    }

    if (verificacion.intentos >= MAX_INTENTOS) {
      verificacion.estado = 'expirada';
      await this.verificacionRepo.save(verificacion);
      throw new BadRequestException('Demasiados intentos. Solicita un nuevo código.');
    }

    if (verificacion.codigo !== codigo) {
      verificacion.intentos += 1;
      await this.verificacionRepo.save(verificacion);
      throw new BadRequestException('Código incorrecto');
    }

    // ✅ Código correcto → marcar verificación y empresa.
    const ahora = new Date();
    verificacion.estado = 'verificada';
    verificacion.verifiedAt = ahora;
    await this.verificacionRepo.save(verificacion);

    const empresa = verificacion.empresa;
    empresa.verificada = true;
    empresa.fecha_verificacion = ahora;
    empresa.telefono_verificado = verificacion.telefono;
    await this.empresaRepo.save(empresa);

    return {
      message: 'Empresa verificada correctamente',
      verificada: true,
      fecha_verificacion: ahora,
    };
  }

  async estado(empresaId: number) {
    const empresa = await this.empresaRepo.findOne({ where: { id: empresaId } });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');
    return {
      empresa_id: empresa.id,
      verificada: !!empresa.verificada,
      fecha_verificacion: empresa.fecha_verificacion ?? null,
    };
  }
}
