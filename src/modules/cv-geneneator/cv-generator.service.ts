// cv-generator.service.ts
import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Usuario } from 'src/repository/user/user.entity';
import { PostulantDataDto } from '../../modules/postulant/dto/create-postulant.dto';

@Injectable()
export class CvGeneratorService {
  async generatePdf(
    usuario: Usuario,
    data: PostulantDataDto,
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      /* ======================================================
         CABECERA PRINCIPAL - Nombre + contacto
      ====================================================== */
      doc.fontSize(22).text(`${usuario.nombres} ${usuario.apellidos}`, {
        align: 'center',
      });

      doc.fontSize(12).text(usuario.email, { align: 'center' });

      if (usuario.rut) {
        doc.text(`RUT: ${usuario.rut}`, { align: 'center' });
      }

      doc.moveDown(2);

      /* ======================================================
         INFORMACIÓN PERSONAL (del DTO)
      ====================================================== */
      if (data?.datos_personales) {
        const dp = data.datos_personales;

        doc.fontSize(14).text('Información Personal', { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(12).text(`Teléfono: ${dp.telefono || 'N/A'}`);
        doc.text(`Dirección: ${dp.direccion || 'N/A'}`);
        doc.text(`Comuna: ${dp.comuna}`);
        doc.text(`Región: ${dp.region}`);
        doc.text(`Género: ${dp.genero}`);
        doc.text(`Estado civil: ${dp.estado_civil}`);
        doc.text(`Nacionalidad: ${dp.nacionalidad}`);
        doc.text(`Fecha de nacimiento: ${dp.fecha_nacimiento}`);

        doc.moveDown(1.5);
      }

      /* ======================================================
         EXPERIENCIA LABORAL
      ====================================================== */
      if (data?.experiencias?.length) {
        doc.fontSize(14).text('Experiencia Laboral', { underline: true });
        doc.moveDown(0.5);

        data.experiencias.forEach((exp) => {
          doc.fontSize(12).text(
            `${exp.cargo} - ${exp.empresa} (${exp.anno_inicio} - ${exp.anno_termino ?? 'Presente'
            })`,
          );

          doc.text(`Nivel: ${exp.nivel_experiencia}`);

          if (exp.descripcion) {
            doc.text(`• ${exp.descripcion.replace(/\n/g, ' ')}`);
          }

          doc.moveDown();
        });

        doc.moveDown(1);
      }

      /* ======================================================
         EDUCACIÓN
      ====================================================== */
      if (data?.educacion?.length) {
        doc.fontSize(14).text('Educación', { underline: true });
        doc.moveDown(0.5);

        data.educacion.forEach((edu) => {
          doc.fontSize(12).text(
            `${edu.titulo} - ${edu.institucion} (${edu.anio_inicio} - ${edu.anio_finalizacion ?? 'Presente'
            })`,
          );

          doc.text(`Grado: ${edu.grado}`);
          doc.text(`Estado: ${edu.estado}`);

          doc.moveDown();
        });

        doc.moveDown(1);
      }

      /* ======================================================
         IDIOMAS
      ====================================================== */
      if (data?.idiomas?.length) {
        doc.fontSize(14).text('Idiomas', { underline: true });
        doc.moveDown(0.5);

        data.idiomas.forEach((i) => {
          doc.fontSize(12).text(
            `${i.idioma}: Oral (${i.nivel_oral}), Escrito (${i.nivel_escrito})`,
          );
        });

        doc.moveDown(1.5);
      }

      /* ======================================================
         PREFERENCIAS (Objetivo Laboral + categoría + modalidad)
      ====================================================== */
      if (data?.preferencias) {
        const p = data.preferencias;

        doc.fontSize(14).text('Preferencias Laborales', {
          underline: true,
        });
        doc.moveDown(0.5);

        if (p.objetivo_laboral) doc.fontSize(12).text(`Objetivo: ${p.objetivo_laboral}`);

        doc.text(`Modalidad: ${p.modalidad}`);
        doc.text(`Categoría: ${p.categoria_empleo}`);
        doc.text(`Salario esperado: ${p.salario_esperado.toLocaleString('es-CL')}`);

        doc.moveDown(1.5);
      }

      /* ======================================================
         REDES SOCIALES
      ====================================================== */
      if (data?.redes_sociales?.length) {
        doc.fontSize(14).text('Redes Sociales', { underline: true });
        doc.moveDown(0.5);

        data.redes_sociales.forEach((rs) => {
          doc.fontSize(12).text(`${rs.red_social}: ${rs.url}`);
        });

        doc.moveDown(1);
      }

      doc.end();
    });
  }
}
