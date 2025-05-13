import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Curriculum } from 'src/repository/curriculum/curriculum.entity';
import { Postulante } from '../../repository/postulant/potulant.entity';
import { Usuario } from '../../repository/user/user.entity';
import * as path from 'path';

@Injectable()
export class CurriculumService {
  private readonly uploadDir = path.join(__dirname, '..', '..', 'Documents/UploadsCv.Tuempleo');

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

    return this.curriculumRepository.find({ where: { usuario } });
  }

  async updateCvPath(rut: string, cvPath: string): Promise<Curriculum> {
    const usuario = await this.usuarioRepository.findOne({ where: { rut } });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const curriculum = await this.curriculumRepository.findOne({
      where: { usuario: { id: usuario.id } },
    });

    if (!curriculum) {
      throw new NotFoundException('Curriculum no encontrado. Debe ser creado antes de subir un CV.');
    }

    if (!cvPath) {
      throw new BadRequestException('El path del archivo no puede estar vacío.');
    }

    curriculum.cv_path = cvPath;
    return this.curriculumRepository.save(curriculum);
  }
}
