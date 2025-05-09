import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Postulante } from '../../repository/postulant/potulant.entity';
import { Usuario } from '../../repository/user/user.entity';

@Injectable()
export class PostulanteService {
    constructor(
        @InjectRepository(Postulante)
        private readonly postulanteRepository: Repository<Postulante>,
        @InjectRepository(Usuario)
        private readonly usuarioRepository: Repository<Usuario>,
    ) { }

    async crearPostulante(userId: number, rut: string, data: Record<string, any>): Promise<Postulante> {
        const usuario = await this.usuarioRepository.findOne({ where: { id: userId } });

        if (!usuario) {
            throw new NotFoundException('Usuario no encontrado');
        }

        const nuevoPostulante = this.postulanteRepository.create({
            usuario,
            rut,
            data,
        });

        return this.postulanteRepository.save(nuevoPostulante);
    }

    async obtenerPostulante(userId: number): Promise<Postulante> {
        const postulante = await this.postulanteRepository.findOne({
            where: { usuario: { id: userId } },
            relations: ['usuario'],  // Aquí hacemos el JOIN
        });

        if (!postulante) {
            throw new NotFoundException('Postulante no encontrado');
        }

        return postulante;
    }
}
