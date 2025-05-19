import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Postulante } from '../../repository/postulant/postulant.entity';
import { Usuario } from '../../repository/user/user.entity';
import { UpdatePostulantDto } from './dto/update-postulant.dto';

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

        // Verificar si el RUT ya existe en otro usuario
        const rutExistente = await this.usuarioRepository.findOne({ where: { rut } });
        if (rutExistente) {
            throw new NotFoundException('El RUT ya está asociado a otro usuario');
        }

        // Actualizar el RUT del usuario
        usuario.rut = rut;
        await this.usuarioRepository.save(usuario);

        // Crear el postulante asociado
        const nuevoPostulante = this.postulanteRepository.create({
            usuario,
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

    // async updatePostulant(payload: UpdatePostulantDto, userId: number): Promise<Postulante> {
    //     const postulant = await this.postulanteRepository.findOne({
    //         where: { usuario: { id: userId } },
    //         relations: ['usuario'],
    //     });

    //     if (!postulant) {
    //         throw new NotFoundException('Postulante no encontrado');
    //     }

    //     // Aseguramos que las propiedades sean siempre arrays si no existen
    //     const updatedPostulant = {
    //         ...postulant,
    //         data: {
    //             ...postulant.data,
    //             ...payload.data,
    //             datos_personales: {
    //                 ...postulant.data.datos_personales,
    //                 ...payload.data?.datos_personales,
    //             },
    //             educacion: Array.isArray(postulant.data.educacion)
    //                 ? [
    //                     ...postulant.data.educacion,
    //                     ...(payload.data?.educacion || [])
    //                 ]
    //                 : (payload.data?.educacion || []), // Si no es un array, inicializamos como vacío o con lo del payload
    //             experiencias: Array.isArray(postulant.data.experiencias)
    //                 ? [
    //                     ...postulant.data.experiencias,
    //                     ...(payload.data?.experiencias || [])
    //                 ]
    //                 : (payload.data?.experiencias || []),
    //             idiomas: Array.isArray(postulant.data.idiomas)
    //                 ? [
    //                     ...postulant.data.idiomas,
    //                     ...(payload.data?.idiomas || [])
    //                 ]
    //                 : (payload.data?.idiomas || []),
    //             preferencias: {
    //                 ...postulant.data.preferencias,
    //                 ...(payload.data?.preferencias || {}),
    //             },
    //             redes_sociales: Array.isArray(postulant.data.redes_sociales)
    //                 ? [
    //                     ...postulant.data.redes_sociales,
    //                     ...(payload.data?.redes_sociales || [])
    //                 ]
    //                 : (payload.data?.redes_sociales || []),
    //         },
    //     };

    //     // Realizamos la actualización
    //     await this.postulanteRepository.update(postulant.id, updatedPostulant);
    //     return updatedPostulant;
    // }

    async updatePostulant(payload: UpdatePostulantDto, userId: number): Promise<Postulante> {
        const postulant = await this.postulanteRepository.findOne({
            where: { usuario: { id: userId } },
            relations: ['usuario'],
        });

        if (!postulant) {
            throw new NotFoundException('Postulante no encontrado');
        }

        // Realizamos la actualización de los datos
        if (payload.data) {
            postulant.data = {
                ...postulant.data,
                ...payload.data,
                datos_personales: {
                    ...postulant.data.datos_personales,
                    ...payload.data?.datos_personales,
                },
                educacion: [
                    ...(postulant.data.educacion || []),
                    ...(payload.data?.educacion || [])
                ],
                experiencias: [
                    ...(postulant.data.experiencias || []),
                    ...(payload.data?.experiencias || [])
                ],
                idiomas: [
                    ...(postulant.data.idiomas || []),
                    ...(payload.data?.idiomas || [])
                ],
                preferencias: {
                    ...postulant.data.preferencias,
                    ...(payload.data?.preferencias || {}),
                },
                redes_sociales: [
                    ...(postulant.data.redes_sociales || []),
                    ...(payload.data?.redes_sociales || [])
                ],
            };
        }

        postulant.fecha_update = new Date();
        postulant.modificado_por = userId;

        // Usamos save para actualizar la entidad y sus relaciones
        await this.postulanteRepository.save(postulant);

        return {
            ...postulant,
            usuario: {
                ...postulant.usuario,
            }
        };
    }




}
