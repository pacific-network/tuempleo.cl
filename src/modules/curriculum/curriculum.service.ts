import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Curriculum } from 'src/repository/curriculum/curriculum.entity';
import { Postulante } from '../../repository/postulant/postulant.entity';
import { Usuario } from '../../repository/user/user.entity';
import { ParsedCvData } from './cv-parser/cv-parser.interface';
import * as path from 'path';

@Injectable()
export class CurriculumService {
  private readonly logger = new Logger(CurriculumService.name);
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

  async getCurriculumsByRut(rut: string): Promise<Curriculum> {
    const usuario = await this.usuarioRepository.findOne({ where: { rut } });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const curriculum = await this.curriculumRepository.findOne({
      where: { usuario: { id: usuario.id } },
      relations: ['usuario'],
    })

    if (!curriculum) {
      throw new NotFoundException('Curriculum no encontrado.');
    }
    return curriculum;
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

  async upsertCvPath(rut: string, cvPath: string): Promise<Curriculum> {
    if (!cvPath) {
      throw new BadRequestException('El path del archivo no puede estar vacío.');
    }

    const usuario = await this.usuarioRepository.findOne({ where: { rut } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    let curriculum = await this.curriculumRepository.findOne({
      where: { usuario: { id: usuario.id } },
    });

    if (!curriculum) {
      curriculum = this.curriculumRepository.create({
        usuario,
        data: {},
        cv_file: path.basename(cvPath),
        cv_path: cvPath,
      });
    } else {
      curriculum.cv_path = cvPath;
    }

    return this.curriculumRepository.save(curriculum);
  }

  async updatePostulanteDataFromCv(
    rut: string,
    parsedData: ParsedCvData,
  ): Promise<void> {
    const usuario = await this.usuarioRepository.findOne({ where: { rut } });
    if (!usuario) return;

    const postulante = await this.postulanteRepository.findOne({
      where: { usuario: { id: usuario.id } },
    });
    if (!postulante) return;

    const current = postulante.data || {};
    postulante.data = this.mergeWithoutOverwrite(current, parsedData);
    await this.postulanteRepository.save(postulante);
    this.logger.log(`Postulante profile updated from CV for RUT: ${rut}`);
  }

  private mergeWithoutOverwrite(
    current: Record<string, any>,
    parsed: ParsedCvData,
  ): Record<string, any> {
    const result = { ...current };

    // Only fill datos_personales fields that are empty
    if (parsed.datos_personales) {
      if (!result.datos_personales) result.datos_personales = {};
      for (const [key, value] of Object.entries(parsed.datos_personales)) {
        if (!result.datos_personales[key] && value) {
          result.datos_personales[key] = value;
        }
      }
    }

    // Only fill arrays if they're empty
    if (!result.educacion?.length && parsed.educacion?.length) {
      result.educacion = parsed.educacion;
    }

    if (!result.experiencias?.length && parsed.experiencias?.length) {
      result.experiencias = parsed.experiencias;
    }

    if (!result.idiomas?.length && parsed.idiomas?.length) {
      result.idiomas = parsed.idiomas;
    }

    return result;
  }
}
