import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  HttpException,
  HttpStatus,
  UseGuards,
  Patch,
  Query,
  UsePipes,
  ValidationPipe,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join, basename } from 'path';
import * as fs from 'fs';
import { Response } from 'express';
import { PostulanteService } from '../postulant/postulant.service';
import { AuthGuard } from '../auth/guards/auth.guards';
import { UpdatePostulantDto } from './dto/update-postulant.dto';
import { PageOptionsDto } from 'src/shared/pagination/page-options.dto';
import { PageDto } from 'src/shared/pagination/page.dto';
import { Postulante } from 'src/repository/postulant/postulant.entity';
import { User } from 'src/shared/decorators/user.decorator';
import { CurriculumService } from '../curriculum/curriculum.service';
import { CvParserService } from '../curriculum/cv-parser/cv-parser.service';

const CV_SUBDIR = 'cvs';

function resolveUploadBase(): string {
  return process.env.UPLOAD_PATH || join(__dirname, '..', '..', '..', 'upload');
}

@Controller('v1/postulante')
export class PostulanteController {
  constructor(
    private readonly postulanteService: PostulanteService,
    private readonly curriculumService: CurriculumService,
    private readonly cvParserService: CvParserService,
  ) { }

  @Get('check-rut/:rut')
  async checkRut(@Param('rut') rut: string) {
    return this.postulanteService.checkRutExists(rut);
  }

  // ── Perfil propio (seguro: userId desde JWT) ──────────────

  @UseGuards(AuthGuard)
  @Get('me')
  async obtenerMe(@User() user: any) {
    try {
      return await this.postulanteService.obtenerPostulante(user.sub);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @UseGuards(AuthGuard)
  @Patch('me')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async updateMe(@Body() payload: UpdatePostulantDto, @User() user: any) {
    try {
      const postulante = await this.postulanteService.updatePostulant(payload, user.sub);
      return { message: 'Perfil actualizado exitosamente', postulante };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // ── CV: upload / download del usuario autenticado ─────────

  @UseGuards(AuthGuard)
  @Post('upload-cv')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dest = join(resolveUploadBase(), CV_SUBDIR);
          if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
          cb(null, dest);
        },
        filename: (req, file, cb) => {
          const safeName = file.originalname.replace(/[^\w.\-]+/g, '_');
          cb(null, `${Date.now()}-${safeName}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.doc', '.docx'];
        const ext = extname(file.originalname).toLowerCase();
        if (!allowed.includes(ext)) {
          return cb(
            new BadRequestException('Tipo de archivo no permitido. Solo .pdf, .doc, .docx'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadCv(
    @UploadedFile() file: Express.Multer.File,
    @User() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha subido ningún archivo.');
    }

    const rut = await this.postulanteService.getRutByUserId(user.sub);
    const publicPath = `/upload/${CV_SUBDIR}/${file.filename}`;

    const curriculum = await this.curriculumService.upsertCvPath(rut, publicPath);

    let parsed = false;
    try {
      const diskPath = join(resolveUploadBase(), CV_SUBDIR, file.filename);
      const parsedData = await this.cvParserService.parseFromFile(diskPath);
      if (parsedData && Object.keys(parsedData).some((k) => (parsedData as any)[k])) {
        await this.curriculumService.updatePostulanteDataFromCv(rut, parsedData);
        parsed = true;
      }
    } catch (err) {
      console.warn('CV parsing failed, upload still succeeded:', err?.message);
    }

    const base = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
    return {
      message: parsed
        ? 'CV subido y perfil actualizado automáticamente.'
        : 'CV subido correctamente.',
      cv_path: curriculum.cv_path,
      url: `${base}${publicPath}`,
      parsed,
    };
  }

  @UseGuards(AuthGuard)
  @Get('download-cv')
  async downloadCv(@User() user: any, @Res() res: Response) {
    const rut = await this.postulanteService.getRutByUserId(user.sub);
    const cv = await this.curriculumService.getCurriculumsByRut(rut);

    const cvPath = Array.isArray(cv) ? cv[0]?.cv_path : cv?.cv_path;
    if (!cvPath) {
      throw new NotFoundException('CV no disponible.');
    }

    const fileName = basename(cvPath);
    const diskPath = join(resolveUploadBase(), CV_SUBDIR, fileName);

    if (!fs.existsSync(diskPath)) {
      throw new NotFoundException('Archivo no encontrado en el servidor.');
    }

    const ext = extname(diskPath).toLowerCase();
    const contentType =
      ext === '.pdf'
        ? 'application/pdf'
        : ext === '.doc'
          ? 'application/msword'
          : ext === '.docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.sendFile(diskPath);
  }

  // ── Endpoints legacy (mantienen compatibilidad) ───────────

  // Crear postulante
  @UseGuards(AuthGuard)
  @Post(':userId')
  async crearPostulante(
    @Param('userId', ParseIntPipe) userId: number,
    @Body('rut') rut: string,
    @Body('data') data: Record<string, any>
  ) {
    try {
      const postulante = await this.postulanteService.crearPostulante(userId, rut, data);
      return { message: 'Postulante creado exitosamente', postulante };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(AuthGuard)
  @Get(':userId')
  async obtenerPostulante(@Param('userId', ParseIntPipe) userId: number) {
    try {
      const postulante = await this.postulanteService.obtenerPostulante(userId);
      return postulante;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @UseGuards(AuthGuard)
  @Patch('update/:userId')
  async updatePostulante(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() payload: UpdatePostulantDto
  ) {
    try {
      const postulante = await this.postulanteService.updatePostulant(payload, userId);
      return { message: 'Postulante actualizado exitosamente', postulante };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(AuthGuard)
  @Get()
  async getAllPostulantes(@Query() PageOptionsDto: PageOptionsDto): Promise<PageDto<Postulante>> {
    return this.postulanteService.findAllPostulants(PageOptionsDto);
  }


}
