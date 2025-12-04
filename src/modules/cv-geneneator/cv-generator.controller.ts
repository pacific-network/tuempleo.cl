import { Controller, Get, Param, Res } from '@nestjs/common';
import { CvGeneratorService } from './cv-generator.service';
import { Response } from 'express';
import { Repository } from 'typeorm';
import { Usuario } from 'src/repository/user/user.entity';
import { Postulante } from 'src/repository/postulant/postulant.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { PostulantDataDto } from '../../modules/postulant/dto/create-postulant.dto';

@Controller('v1/cv-generator')
export class CvGeneratorController {
    constructor(
        private readonly cvService: CvGeneratorService,
        @InjectRepository(Usuario)
        private readonly repoUsuario: Repository<Usuario>,
        @InjectRepository(Postulante)
        private readonly repoPostulante: Repository<Postulante>,
    ) { }

    @Get(':userId')
    async downloadCv(@Param('userId') userId: number, @Res() res: Response) {
        const usuario = await this.repoUsuario.findOne({ where: { id: userId } });
        if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });

        const postulante = await this.repoPostulante.findOne({ where: { usuario: { id: userId } } });
        const data: PostulantDataDto = postulante?.data || {} as PostulantDataDto;

        const pdfBuffer = await this.cvService.generatePdf(usuario, data);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${usuario.nombres}_${usuario.apellidos}_CV.pdf"`,
            'Content-Length': pdfBuffer.length,
        });

        res.end(pdfBuffer);
    }
}
