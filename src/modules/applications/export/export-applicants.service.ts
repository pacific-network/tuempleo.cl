import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Postulacion } from '../../../repository/applications/applications.entity';
import { Oferta } from '../../../repository/job_offer/job-offer.entity';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExportApplicantsService {
  constructor(
    @InjectRepository(Postulacion)
    private readonly postulacionRepo: Repository<Postulacion>,
    @InjectRepository(Oferta)
    private readonly ofertaRepo: Repository<Oferta>,
  ) {}

  async exportApplicants(
    ofertaId: number,
    userId: number,
    format: 'xlsx' | 'csv' = 'xlsx',
  ): Promise<Buffer> {
    const oferta = await this.ofertaRepo.findOne({
      where: { id: ofertaId },
      relations: ['empleador', 'empleador.usuario'],
    });

    if (!oferta) {
      throw new NotFoundException('Oferta no encontrada');
    }

    if (oferta.empleador.usuario.id !== userId) {
      throw new ForbiddenException('No tienes permisos sobre esta oferta');
    }

    const postulaciones = await this.postulacionRepo.find({
      where: { oferta: { id: ofertaId } },
      relations: ['postulante', 'postulante.usuario'],
      order: { fechaPostulacion: 'DESC' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Postulantes');

    sheet.columns = [
      { header: 'Nombre', key: 'nombre', width: 20 },
      { header: 'Apellido', key: 'apellido', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'RUT', key: 'rut', width: 15 },
      { header: 'Telefono', key: 'telefono', width: 18 },
      { header: 'Educacion', key: 'educacion', width: 45 },
      { header: 'Experiencia', key: 'experiencia', width: 45 },
      { header: 'Estado', key: 'estado', width: 18 },
      { header: 'Fecha Postulacion', key: 'fecha', width: 20 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true };

    for (const p of postulaciones) {
      const data = p.postulante?.data || {};
      const usuario = p.postulante?.usuario;

      const educacion = (data.educacion || [])
        .map((e: any) => `${e.titulo || ''} - ${e.institucion || ''}`)
        .join('; ');

      const experiencia = (data.experiencias || [])
        .map((e: any) => `${e.cargo || ''} en ${e.empresa || ''}`)
        .join('; ');

      const telefono =
        data.datos_personales?.telefono || '';

      sheet.addRow({
        nombre: usuario?.nombres || '',
        apellido: usuario?.apellidos || '',
        email: usuario?.email || '',
        rut: usuario?.rut || '',
        telefono,
        educacion,
        experiencia,
        estado: p.estado,
        fecha: p.fechaPostulacion
          ? new Date(p.fechaPostulacion).toISOString().split('T')[0]
          : '',
      });
    }

    if (format === 'csv') {
      return Buffer.from(await workbook.csv.writeBuffer());
    }
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
