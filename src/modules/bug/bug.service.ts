import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Bug, BugStatus } from 'src/repository/bug/bug.entity';
import { CreateBugDto } from './dto/create-bug.dto';
import { MailerService } from '../mailer/mailer.service';

@Injectable()
export class BugService {
    private readonly logger = new Logger(BugService.name);

    constructor(
        @InjectRepository(Bug) private readonly bugRepo: Repository<Bug>,
        private readonly mailerService: MailerService,
        private readonly configService: ConfigService,
    ) { }

    async create(dto: CreateBugDto, usuarioId: number, userAgent: string | null): Promise<Bug> {
        const bug = this.bugRepo.create({
            usuarioId,
            titulo: dto.titulo,
            descripcion: dto.descripcion,
            pagina: dto.pagina,
            userAgent,
            status: 'abierto',
        });
        const saved = await this.bugRepo.save(bug);

        this.notifyAdmin(saved).catch((err) =>
            this.logger.warn(`No se pudo notificar bug ${saved.id} por email: ${err?.message ?? err}`),
        );

        return saved;
    }

    async list(page: number, limit: number, status?: BugStatus) {
        const qb = this.bugRepo
            .createQueryBuilder('bug')
            .leftJoinAndSelect('bug.usuario', 'usuario')
            .orderBy('bug.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        if (status) qb.where('bug.status = :status', { status });

        const [items, total] = await qb.getManyAndCount();
        return { items, total, page, limit };
    }

    async updateStatus(id: number, status: BugStatus): Promise<Bug> {
        const bug = await this.bugRepo.findOne({ where: { id } });
        if (!bug) throw new NotFoundException(`Bug ${id} no encontrado`);
        bug.status = status;
        return this.bugRepo.save(bug);
    }

    async getById(id: number): Promise<Bug> {
        const bug = await this.bugRepo.findOne({
            where: { id },
            relations: ['usuario'],
        });
        if (!bug) throw new NotFoundException(`Bug ${id} no encontrado`);
        return bug;
    }

    async getStats(): Promise<Record<BugStatus | 'total', number>> {
        const rows = await this.bugRepo
            .createQueryBuilder('bug')
            .select('bug.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('bug.status')
            .getRawMany<{ status: BugStatus; count: string }>();

        const stats: Record<string, number> = {
            abierto: 0,
            en_revision: 0,
            resuelto: 0,
            no_se_corrige: 0,
            total: 0,
        };
        for (const row of rows) {
            const n = parseInt(row.count, 10);
            stats[row.status] = n;
            stats.total += n;
        }
        return stats as Record<BugStatus | 'total', number>;
    }

    async updateNotes(id: number, notasInternas: string | null): Promise<Bug> {
        const bug = await this.bugRepo.findOne({ where: { id } });
        if (!bug) throw new NotFoundException(`Bug ${id} no encontrado`);
        bug.notasInternas = notasInternas;
        return this.bugRepo.save(bug);
    }

    private async notifyAdmin(bug: Bug): Promise<void> {
        const adminEmail = this.configService.get<string>('BUG_NOTIFY_EMAIL');
        const templateId = this.configService.get<string>('BUG_NOTIFY_MESSAGE_ID');

        if (!adminEmail || !templateId) {
            this.logger.debug(
                'BUG_NOTIFY_EMAIL o BUG_NOTIFY_MESSAGE_ID no configurados, omitiendo notificación.',
            );
            return;
        }

        await this.mailerService.sendTemplateMail({
            dest_email: adminEmail,
            message_id: templateId,
            BugId: String(bug.id),
            Titulo: bug.titulo,
            Pagina: bug.pagina,
            UsuarioId: bug.usuarioId != null ? String(bug.usuarioId) : 'anónimo',
            Descripcion: bug.descripcion.slice(0, 1000),
        });
    }
}
