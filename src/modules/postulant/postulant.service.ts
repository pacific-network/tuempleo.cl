import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Postulante } from '../../repository/postulant/postulant.entity';
import { Usuario } from '../../repository/user/user.entity';
import { UpdatePostulantDto } from './dto/update-postulant.dto';
import { PageOptionsDto } from 'src/shared/pagination/page-options.dto';
import { PageDto } from 'src/shared/pagination/page.dto';
import { PageMetaDto } from 'src/shared/pagination/page-meta.dto';

@Injectable()
export class PostulanteService {
  constructor(
    @InjectRepository(Postulante)
    private readonly postulanteRepository: Repository<Postulante>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  /**
   * Disponibilidad de un RUT contra el índice único de `usuario.rut`.
   *
   * excludeUserId evita el falso positivo del dual-rol: si el usuario ya cargó su
   * RUT al registrarse como empleador, ese RUT es suyo y sirve igual para su perfil
   * de candidato. `crearPostulante` ya lo permite ("RUT único, permitiendo mismo
   * usuario"), así que sin esta exclusión la validación previa era más estricta que
   * la escritura y bloqueaba un caso válido.
   *
   * `exists` se mantiene por compatibilidad con los consumidores actuales, pero la
   * decisión correcta es `disponible`.
   */
  async checkRutExists(
    rut: string,
    excludeUserId?: number,
  ): Promise<{ exists: boolean; disponible: boolean }> {
    const usuario = await this.usuarioRepository.findOne({ where: { rut } });
    if (!usuario) return { exists: false, disponible: true };
    const esPropio = excludeUserId !== undefined && usuario.id === excludeUserId;
    return { exists: true, disponible: esPropio };
  }

  async getRutByUserId(userId: number): Promise<string> {
    const usuario = await this.usuarioRepository.findOne({ where: { id: userId } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (!usuario.rut) {
      throw new NotFoundException('El usuario no tiene RUT registrado');
    }
    return usuario.rut;
  }

  async crearPostulante(
    userId: number,
    rut: string,
    data: Record<string, any>,
  ): Promise<Postulante> {
    const usuario = await this.usuarioRepository.findOne({ where: { id: userId } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // RUT único (permitiendo mismo usuario)
    if (rut) {
      const rutExistente = await this.usuarioRepository.findOne({ where: { rut } });
      if (rutExistente && rutExistente.id !== userId) {
        throw new NotFoundException('El RUT ya está asociado a otro usuario');
      }
      usuario.rut = rut;
    }

    // Nombre / Apellido se esperan DENTRO de "data"
    // admite data.nombre / data.apellido o data.datos_personales.nombre/apellido
    const nombre =
      (typeof data?.nombre === 'string' && data.nombre.trim()) ||
      (typeof data?.datos_personales?.nombre === 'string' && data.datos_personales.nombre.trim()) ||
      '';

    const apellido =
      (typeof data?.apellido === 'string' && data.apellido.trim()) ||
      (typeof data?.datos_personales?.apellido === 'string' && data.datos_personales.apellido.trim()) ||
      '';

    if (nombre)   usuario.nombres   = nombre;
    if (apellido) usuario.apellidos = apellido;

    await this.usuarioRepository.save(usuario);

    // Crear / actualizar postulante (upsert)
    let postulante = await this.postulanteRepository.findOne({
      where: { usuario: { id: userId } },
      relations: ['usuario'],
    });

    if (!postulante) {
      postulante = this.postulanteRepository.create({
        usuario,
        data: data ?? {},
      });
    } else {
      const prev = postulante.data || {};
      postulante.data = { ...prev, ...(data || {}) };
    }

    return this.postulanteRepository.save(postulante);
  }

  async obtenerPostulante(userId: number): Promise<Postulante> {
    const postulante = await this.postulanteRepository.findOne({
      where: { usuario: { id: userId } },
      relations: ['usuario'],
    });

    if (!postulante) {
      throw new NotFoundException('Postulante no encontrado');
    }

    return postulante;
  }

  async updatePostulant(payload: UpdatePostulantDto, userId: number): Promise<Postulante> {
    const postulant = await this.postulanteRepository.findOne({
      where: { usuario: { id: userId } },
      relations: ['usuario'],
    });

    if (!postulant) {
      throw new NotFoundException('Postulante no encontrado');
    }

    const base = (postulant.data || {}) as Record<string, any>;
    const incoming = (payload.data || {}) as Record<string, any>;

    // Si viene nombre/apellido en data, también actualiza el usuario
    const incNombre =
      (typeof incoming?.nombre === 'string' && incoming.nombre.trim()) ||
      (typeof incoming?.datos_personales?.nombre === 'string' && incoming.datos_personales.nombre.trim()) ||
      '';
    const incApellido =
      (typeof incoming?.apellido === 'string' && incoming.apellido.trim()) ||
      (typeof incoming?.datos_personales?.apellido === 'string' && incoming.datos_personales.apellido.trim()) ||
      '';

    if (incNombre)   postulant.usuario.nombres   = incNombre;
    if (incApellido) postulant.usuario.apellidos = incApellido;
    await this.usuarioRepository.save(postulant.usuario);

    postulant.data = {
      ...base,
      ...incoming,
      datos_personales: {
        ...(base.datos_personales || {}),
        ...(incoming.datos_personales || {}),
      },
      educacion: Array.isArray(incoming.educacion) ? incoming.educacion : (base.educacion || []),
      experiencias: Array.isArray(incoming.experiencias) ? incoming.experiencias : (base.experiencias || []),
      idiomas: Array.isArray(incoming.idiomas) ? incoming.idiomas : (base.idiomas || []),
      preferencias: { ...(base.preferencias || {}), ...(incoming.preferencias || {}) },
      redes_sociales: Array.isArray(incoming.redes_sociales) ? incoming.redes_sociales : (base.redes_sociales || []),
    };

    postulant.fecha_update = new Date();
    postulant.modificado_por = userId;

    await this.postulanteRepository.save(postulant);

    return {
      ...postulant,
      usuario: { ...postulant.usuario },
    };
  }

  async findAllPostulants(pageOptionsDto: PageOptionsDto): Promise<PageDto<Postulante>> {
    const queryBuilder = this.postulanteRepository.createQueryBuilder('postulante');

    queryBuilder
      .leftJoinAndSelect('postulante.usuario', 'usuario')
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const itemCount = await queryBuilder.getCount();
    const { entities } = await queryBuilder.getRawAndEntities();

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    return new PageDto(entities, pageMetaDto);
  }
}
