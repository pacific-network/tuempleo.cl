// cv-generator.service.ts
import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Usuario } from 'src/repository/user/user.entity';
import { PostulantDataDto } from '../../modules/postulant/dto/create-postulant.dto';

@Injectable()
export class CvGeneratorService {
  async generatePdf(usuario: Usuario, data: PostulantDataDto): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // --- Header ---
      doc.fontSize(22).text(`${usuario.nombres} ${usuario.apellidos}`, { align: 'center' });
      doc.fontSize(12).text(`RUT: ${usuario.rut || 'N/A'} | Email: ${usuario.email}`, { align: 'center' });
      doc.moveDown();

      // --- Datos personales ---
      if (data?.datos_personales) {
        const dp = data.datos_personales;
        doc.fontSize(14).text('Datos Personales', { underline: true });
        doc.fontSize(12).text(`Dirección: ${dp.direccion || 'N/A'}`);
        doc.text(`Comuna: ${dp.comuna}`);
        doc.text(`Región: ${dp.region}`);
        doc.text(`Teléfono: ${dp.telefono}`);
        doc.text(`Género: ${dp.genero}`);
        doc.text(`Estado civil: ${dp.estado_civil}`);
        doc.text(`Nacionalidad: ${dp.nacionalidad}`);
        doc.text(`Fecha de nacimiento: ${dp.fecha_nacimiento}`);
        doc.moveDown();
      }

      // --- Educación ---
      if (data?.educacion?.length) {
        doc.fontSize(14).text('Educación', { underline: true });
        data.educacion.forEach((edu) => {
          doc.fontSize(12).text(`${edu.titulo} - ${edu.institucion} (${edu.anno_inicio} - ${edu.anno_termino || 'Presente'})`);
        });
        doc.moveDown();
      }

      // --- Experiencia ---
      if (data?.experiencias?.length) {
        doc.fontSize(14).text('Experiencia', { underline: true });
        data.experiencias.forEach((exp) => {
          doc.fontSize(12).text(`${exp.cargo} - ${exp.empresa} (${exp.anno_inicio} - ${exp.anno_termino || 'Presente'})`);
          doc.text(`Descripción: ${exp.descripcion}`);
          doc.text(`Nivel: ${exp.nivel_experiencia}`);
          doc.moveDown();
        });
      }

      // --- Preferencias ---
      if (data?.preferencias) {
        const p = data.preferencias;
        doc.fontSize(14).text('Preferencias', { underline: true });
        doc.fontSize(12).text(`Modalidad: ${p.modalidad}`);
        doc.text(`Categoría: ${p.categoria_empleo}`);
        doc.text(`Salario esperado: ${p.salario_esperado}`);
        doc.moveDown();
      }

      doc.end();
    });
  }
}
