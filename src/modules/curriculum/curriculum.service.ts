import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurriculumController } from '../curriculum/curriculum.controller';
import { Curriculum } from 'src/repository/curriculum/curriculum.entity';
import { Postulante } from '../../repository/postulant/potulant.entity';
import { Usuario } from '../../repository/user/user.entity';

@Injectable()
export class CurriculumService {
  constructor(
    @InjectRepository(Curriculum)
    private readonly curriculumRepository: Repository<Curriculum>,

    @InjectRepository(Postulante)
    private readonly postulanteRepository: Repository<Postulante>,

    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) { }

  async createCurriculum(rut: string, data: any, cvFile: string): Promise<Curriculum> {
    const usuario = await this.usuarioRepository.findOne({ where: { rut } });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const postulante = await this.postulanteRepository.findOne({
      where: { usuario: { id: usuario.id } },
    });

    if (!postulante) {
      throw new NotFoundException('El postulante no existe. Debe ser creado antes de agregar un CV.');
    }

    const curriculum = this.curriculumRepository.create({
      usuario,
      data,
      cv_file: cvFile,
    });

    return await this.curriculumRepository.save(curriculum);
  }

  async getCurriculumsByRut(rut: string): Promise<Curriculum[]> {
    const usuario = await this.usuarioRepository.findOne({ where: { rut } });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return await this.curriculumRepository.find({ where: { usuario } });
  }
}
