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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { CurriculumService } from './curriculum.service';
import { Curriculum } from 'src/repository/curriculum/curriculum.entity';

@Controller('v1/curriculum')
export class CurriculumController {
    constructor(private readonly curriculumService: CurriculumService) { }

    private readonly uploadDir = join(__dirname, '..', '..', 'Documents/UploadsCv.Tuempleo');

    @Post(':rut')
    async createCurriculum(
        @Param('rut') rut: string,
        @Body('data') data: any,
        @Body('cv_file') cvFile: string,
    ): Promise<Curriculum> {
        return this.curriculumService.createCurriculum(rut, data, cvFile);
    }

    @Get(':rut')
    async getCurriculumsByRut(@Param('rut') rut: string): Promise<Curriculum[]> {
        return this.curriculumService.getCurriculumsByRut(rut);
    }

    @Post('upload/:rut')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                // Aquí definimos la carpeta donde se guardarán los archivos
                destination: (req, file, cb) => {
                    const uploadPath = '/Users/pauloramirezciani/Documents/Workspace/tuempleo.cl/upload';
                    cb(null, uploadPath);  // El archivo se sube a la carpeta upload
                },
                filename: (req, file, cb) => {
                    const ext = extname(file.originalname);  // Obtener la extensión del archivo
                    const fileName = `${Date.now()}-${file.originalname}`;  // Nombre único para el archivo
                    cb(null, fileName);  // Definir el nombre del archivo
                },
            }),
            fileFilter: (req, file, cb) => {
                const allowedExtensions = ['.pdf', '.doc', '.docx'];  // Tipos de archivo permitidos
                const ext = extname(file.originalname).toLowerCase();
                if (!allowedExtensions.includes(ext)) {
                    return cb(new BadRequestException('Tipo de archivo no permitido. Solo se permiten .pdf, .doc, .docx'), false);
                }
                cb(null, true);  // Si la extensión es válida, se permite el archivo
            },
        }),
    )
    async uploadFile(
        @Param('rut') rut: string,
        @UploadedFile() file: Express.Multer.File,
    ): Promise<{ message: string; cv_path: string }> {
        if (!file) {
            throw new BadRequestException('No se ha subido ningún archivo.');
        }

        // Definir la ruta completa del archivo
        const cvPath = join(__dirname, '../../upload', file.filename);

        // Actualizar la base de datos con el path del archivo subido
        const curriculum = await this.curriculumService.updateCvPath(rut, cvPath);

        // Retornar la respuesta
        return {
            message: 'Archivo subido y path actualizado correctamente.',
            cv_path: curriculum.cv_path,
        };
    }
}
