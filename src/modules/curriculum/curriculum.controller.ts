// src/modules/curriculum/curriculum.controller.ts
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  NotFoundException,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CurriculumService } from './curriculum.service';
import { Curriculum } from 'src/repository/curriculum/curriculum.entity';

@Controller('v1/curriculum')
export class CurriculumController {
  constructor(private readonly curriculumService: CurriculumService) { }

  // Si quieres, deja esta constante para otros usos
  // (no se usa en las rutas de abajo)
  private readonly uploadDir = path.join(
    __dirname,
    '..',
    '..',
    'Documents/UploadsCv.Tuempleo',
  );

  // Crea el registro de Curriculum (sin archivo)
  @Post(':rut')
  async createCurriculum(
    @Param('rut') rut: string,
    @Body('data') data: any,
    @Body('cv_file') cvFile: string,
  ): Promise<Curriculum> {
    return this.curriculumService.createCurriculum(rut, data, cvFile);
  }

  // Obtiene el curriculum por RUT
  @Get(':rut')
  async getCurriculumsByRut(@Param('rut') rut: string): Promise<Curriculum[]> {
    const curriculum = await this.curriculumService.getCurriculumsByRut(rut);
    return Array.isArray(curriculum) ? curriculum : [curriculum];
  }

  // -------- SUBIDA DE ARCHIVO (guarda físicamente en /var/www/html/uploads) --------
  @Post('upload/:rut')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = process.env.CV_UPLOAD_PATH || '/var/www/html/uploads/';
          const fs = require('fs');
          if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const fileName = `${Date.now()}-${file.originalname}`;
          cb(null, fileName);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.doc', '.docx'];
        const ext = extname(file.originalname).toLowerCase();
        if (!allowed.includes(ext)) {
          return cb(
            new BadRequestException(
              'Tipo de archivo no permitido. Solo .pdf, .doc, .docx',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(
    @Param('rut') rut: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ message: string; cv_path: string; url: string }> {
    if (!file) {
      throw new BadRequestException('No se ha subido ningún archivo.');
    }

    // Guardas la RUTA ABSOLUTA en BD (como venías haciendo):
    const absolutePath = `/var/www/html/uploads/${file.filename}`;
    const curriculum = await this.curriculumService.updateCvPath(
      rut,
      absolutePath,
    );

    // Para mostrar en el navegador, la URL pública es /uploads/<archivo>
    const publicPath =
      curriculum.cv_path?.startsWith('/uploads')
        ? curriculum.cv_path
        : `/uploads/${path.basename(curriculum.cv_path)}`;

    const base = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';

    return {
      message: 'Archivo subido y path actualizado correctamente.',
      cv_path: curriculum.cv_path, // lo que quedó en BD (absoluto)
      url: `${base}${publicPath}`, // URL lista para abrir en el navegador
    };
  }

  // -------- VER EL CV EN EL NAVEGADOR (redirige a /uploads/...) --------
  @Get(':rut/view')
  async viewCv(@Param('rut') rut: string, @Res() res: Response) {
    const cvData = await this.curriculumService.getCurriculumsByRut(rut);
    const cv = Array.isArray(cvData) ? cvData[0] : cvData;

    const webPath = cv?.cv_path?.startsWith('/uploads')
      ? cv.cv_path
      : `/uploads/${path.basename(cv?.cv_path || '')}`;

    if (!webPath || webPath === '/uploads/') {
      throw new NotFoundException('CV no disponible.');
    }
    return res.redirect(webPath); // 302 -> /uploads/...
  }

  @Get(':rut/download')
  async downloadCv(@Param('rut') rut: string, @Res() res: Response) {
    const cvData = await this.curriculumService.getCurriculumsByRut(rut);
    const cv = Array.isArray(cvData) ? cvData[0] : cvData;

    const webPath = cv?.cv_path?.startsWith('/uploads')
      ? cv.cv_path
      : `/uploads/${path.basename(cv?.cv_path || '')}`;
    const diskBase = '/var/www/html';
    const filePath = path.join(diskBase, webPath); // /var/www/html/uploads/xxx.pdf

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado en el servidor.');
    }

    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);

    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === '.pdf'
        ? 'application/pdf'
        : ext === '.doc'
          ? 'application/msword'
          : ext === '.docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    return res.sendFile(filePath);
  }
}