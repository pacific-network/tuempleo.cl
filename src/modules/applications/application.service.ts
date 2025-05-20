import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Postulacion } from '../../repository/applications/applications.entity';
import { CreatePostulacionDto } from './dto/create-postulacion.dto';
import { Postulante } from '../../repository/postulant/postulant.entity';
import { Oferta } from '../../repository/job_offer/job-offer.entity';

@Injectable()
export class PostulacionService {
    constructor(
        @InjectRepository(Postulacion)
        private readonly postulacionRepository: Repository<Postulacion>,

        @InjectRepository(Postulante)
        private readonly postulanteRepository: Repository<Postulante>,

        @InjectRepository(Oferta)
        private readonly ofertaRepository: Repository<Oferta>,
    ) { }

    async crearPostulacion(dto: CreatePostulacionDto): Promise<Postulacion> {
        const postulante = await this.postulanteRepository.findOne({ where: { id: dto.postulante_id } });
        if (!postulante) {
            throw new NotFoundException(`Postulante con ID ${dto.postulante_id} no encontrado`);
        }

        const oferta = await this.ofertaRepository.findOne({ where: { id: dto.oferta_id } });
        if (!oferta) {
            throw new NotFoundException(`Oferta con ID ${dto.oferta_id} no encontrada`);
        }

        const existe = await this.postulacionRepository.findOne({
            where: { postulante: { id: dto.postulante_id }, oferta: { id: dto.oferta_id } },
        });

        if (existe) {
            throw new ConflictException('Ya estás inscrito en esta oferta');
        }

        const postulacion = this.postulacionRepository.create({
            postulante,
            oferta,
        });

        return this.postulacionRepository.save(postulacion);
    }
}
