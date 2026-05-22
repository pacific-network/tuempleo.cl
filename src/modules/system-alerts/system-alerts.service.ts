import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import {
  AlertAudiencia,
  SystemAlert,
} from 'src/repository/system-alert/system-alert.entity';
import { Usuario } from 'src/repository/user/user.entity';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';

@Injectable()
export class SystemAlertsService {
  constructor(
    @InjectRepository(SystemAlert)
    private readonly alertRepo: Repository<SystemAlert>,
    @InjectRepository(Usuario)
    private readonly userRepo: Repository<Usuario>,
  ) {}

  async create(adminId: number, dto: CreateAlertDto): Promise<SystemAlert> {
    const admin = await this.userRepo.findOne({ where: { id: adminId } });

    const alert = this.alertRepo.create({
      titulo: dto.titulo,
      mensaje: dto.mensaje,
      audiencia: dto.audiencia ?? AlertAudiencia.TODOS,
      activa: dto.activa ?? true,
      fecha_inicio: dto.fecha_inicio ? new Date(dto.fecha_inicio) : null,
      fecha_fin: dto.fecha_fin ? new Date(dto.fecha_fin) : null,
      created_by: admin,
    });

    return this.alertRepo.save(alert);
  }

  async findAll(page = 1, limit = 20) {
    const [items, total] = await this.alertRepo.findAndCount({
      order: { created_at: 'DESC' },
      relations: ['created_by'],
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<SystemAlert> {
    const alert = await this.alertRepo.findOne({
      where: { id },
      relations: ['created_by'],
    });
    if (!alert) throw new NotFoundException('Alerta no encontrada');
    return alert;
  }

  async update(id: number, dto: UpdateAlertDto): Promise<SystemAlert> {
    const alert = await this.findOne(id);

    if (dto.titulo !== undefined) alert.titulo = dto.titulo;
    if (dto.mensaje !== undefined) alert.mensaje = dto.mensaje;
    if (dto.audiencia !== undefined) alert.audiencia = dto.audiencia;
    if (dto.activa !== undefined) alert.activa = dto.activa;
    if (dto.fecha_inicio !== undefined) {
      alert.fecha_inicio = dto.fecha_inicio ? new Date(dto.fecha_inicio) : null;
    }
    if (dto.fecha_fin !== undefined) {
      alert.fecha_fin = dto.fecha_fin ? new Date(dto.fecha_fin) : null;
    }

    return this.alertRepo.save(alert);
  }

  async toggle(id: number): Promise<SystemAlert> {
    const alert = await this.findOne(id);
    alert.activa = !alert.activa;
    return this.alertRepo.save(alert);
  }

  async remove(id: number): Promise<{ removed: boolean }> {
    const alert = await this.findOne(id);
    await this.alertRepo.remove(alert);
    return { removed: true };
  }

  // Devuelve las alertas activas que apliquen al usuario logueado (popup al login).
  async findActivasForUser(payload: {
    context?: string;
    isAdmin?: boolean;
  }): Promise<SystemAlert[]> {
    const now = new Date();

    const audiencias: AlertAudiencia[] = [AlertAudiencia.TODOS];
    if (payload.isAdmin) audiencias.push(AlertAudiencia.ADMINS);
    if (payload.context === 'postulante') {
      audiencias.push(AlertAudiencia.POSTULANTES);
    }
    if (payload.context === 'empleador') {
      audiencias.push(AlertAudiencia.EMPLEADORES);
    }

    return this.alertRepo
      .createQueryBuilder('a')
      .where('a.activa = :activa', { activa: true })
      .andWhere('a.audiencia IN (:...audiencias)', { audiencias })
      .andWhere(
        new Brackets((qb) =>
          qb
            .where('a.fecha_inicio IS NULL')
            .orWhere('a.fecha_inicio <= :now', { now }),
        ),
      )
      .andWhere(
        new Brackets((qb) =>
          qb
            .where('a.fecha_fin IS NULL')
            .orWhere('a.fecha_fin >= :now', { now }),
        ),
      )
      .orderBy('a.created_at', 'DESC')
      .getMany();
  }
}
