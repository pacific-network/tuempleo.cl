import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Oferta } from '../../repository/job_offer/job-offer.entity';
import { Empresa } from '../../repository/business/business.entity';
import { CreateOfertaDto } from './dto/create-oferta.dto';

const PALABRAS_PROHIBIDAS = [
  'gana dinero fácil',
  'gana dinero facil',
  'trabaja desde casa y gana',
  'ingresos ilimitados',
  'sin experiencia gana',
  'multinivel',
  'pirámide',
  'piramide',
  'estafa',
  'envía dinero',
  'envia dinero',
  'pago por adelantado',
  'comisión inmediata',
  'comision inmediata',
  'sexo',
  'escort',
  'webcam',
  'onlyfans',
  'contenido adulto',
  'desnudo',
];

const TITULO_MIN_LENGTH = 5;
const TITULO_MAX_LENGTH = 255;
const DESCRIPCION_MIN_LENGTH = 200;
const MAX_OFERTAS_POR_DIA = 10;
const RENTA_MINIMA = 50000; // CLP

@Injectable()
export class OfertaValidationService {
  constructor(
    @InjectRepository(Oferta)
    private readonly ofertaRepository: Repository<Oferta>,
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
  ) {}

  async validarOferta(dto: CreateOfertaDto): Promise<void> {
    const errores: string[] = [];

    this.validarTitulo(dto.titulo, errores);
    this.validarDescripcion(dto.data?.descripcion_puesto, errores);
    this.validarContenidoProhibido(dto, errores);
    this.validarRenta(dto.data?.renta_salarial, errores);
    this.validarVacantes(dto.data?.numero_vacantes, errores);

    await this.validarEmpresaActiva(dto.empresa_id, errores);
    await this.validarLimiteOfertasDiarias(dto.empresa_id, errores);

    if (errores.length > 0) {
      throw new BadRequestException({
        message: 'La oferta no pasó la validación.',
        errores,
      });
    }
  }

  private validarTitulo(titulo: string, errores: string[]): void {
    if (!titulo || titulo.trim().length < TITULO_MIN_LENGTH) {
      errores.push(`El título debe tener al menos ${TITULO_MIN_LENGTH} caracteres.`);
      return;
    }

    if (titulo.length > TITULO_MAX_LENGTH) {
      errores.push(`El título no puede superar los ${TITULO_MAX_LENGTH} caracteres.`);
    }

    if (titulo === titulo.toUpperCase() && titulo.length > 10) {
      errores.push('El título no puede estar completamente en mayúsculas.');
    }

    if (/(.)\1{4,}/.test(titulo)) {
      errores.push('El título contiene caracteres repetidos de forma excesiva.');
    }
  }

  private validarDescripcion(descripcion: string | undefined, errores: string[]): void {
    if (!descripcion || descripcion.trim().length < DESCRIPCION_MIN_LENGTH) {
      errores.push(`La descripción del puesto debe tener al menos ${DESCRIPCION_MIN_LENGTH} caracteres.`);
    }
  }

  private validarContenidoProhibido(dto: CreateOfertaDto, errores: string[]): void {
    const textoCompleto = [
      dto.titulo,
      dto.data?.descripcion_puesto,
      ...(dto.data?.responsabilidades || []),
      ...(dto.data?.requisitos_minimos || []),
      ...(dto.data?.beneficios || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    for (const palabra of PALABRAS_PROHIBIDAS) {
      if (textoCompleto.includes(palabra)) {
        errores.push(`La oferta contiene contenido no permitido: "${palabra}".`);
      }
    }
  }

  private validarRenta(
    renta: { desde?: number; hasta?: number; de_acuerdo_al_mercado?: boolean } | undefined,
    errores: string[],
  ): void {
    if (!renta || renta.de_acuerdo_al_mercado) return;

    if (renta.desde !== undefined && renta.desde < RENTA_MINIMA) {
      errores.push(`La renta mínima no puede ser inferior a $${RENTA_MINIMA.toLocaleString('es-CL')}.`);
    }

    if (renta.desde !== undefined && renta.hasta !== undefined && renta.desde > renta.hasta) {
      errores.push('La renta mínima no puede ser mayor a la renta máxima.');
    }
  }

  private validarVacantes(vacantes: number | undefined, errores: string[]): void {
    if (vacantes !== undefined && vacantes < 1) {
      errores.push('El número de vacantes debe ser al menos 1.');
    }
  }

  private async validarEmpresaActiva(empresaId: number, errores: string[]): Promise<void> {
    const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });

    if (!empresa) {
      errores.push('La empresa asociada no existe.');
    }
  }

  private async validarLimiteOfertasDiarias(empresaId: number, errores: string[]): Promise<void> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const ofertasHoy = await this.ofertaRepository.count({
      where: {
        empresa: { id: empresaId },
        fecha_publicacion: MoreThan(hoy),
      },
    });

    if (ofertasHoy >= MAX_OFERTAS_POR_DIA) {
      errores.push(`Se ha alcanzado el límite de ${MAX_OFERTAS_POR_DIA} ofertas por día para esta empresa.`);
    }
  }
}
