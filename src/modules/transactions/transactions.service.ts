import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Transaction } from 'src/repository/transaction/transaction.entity';
import { Usuario } from 'src/repository/user/user.entity';
import { PageDto } from 'src/shared/pagination/page.dto';
import { PageMetaDto } from 'src/shared/pagination/page-meta.dto';
import { PageOptionsDto } from 'src/shared/pagination/page-options.dto';
import { TransactionItem } from 'src/repository/transaction_items/transaction-items.entity';

interface TransactionFilters {
    search?: string;
    fechaInicio?: string;
    fechaFin?: string;
}

@Injectable()
export class TransactionsService {
    constructor(
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
        @InjectRepository(TransactionItem)
        private readonly transactionItemRepository: Repository<TransactionItem>,
        @InjectRepository(Usuario)
        private readonly usuarioRepository: Repository<Usuario>,
    ) { }

    async obtenerTransacciones(
        userId: number,
        pageOptions: PageOptionsDto,
        filters: TransactionFilters,
    ): Promise<PageDto<Transaction>> {
        const qb = this.transactionRepository
            .createQueryBuilder('transaction')
            .where('transaction.sessionId = :userId', { userId });

        if (filters.search) {
            const like = `%${filters.search}%`;
            qb.andWhere(
                `(transaction.orderId LIKE :like
          OR transaction.token LIKE :like
          OR transaction.status LIKE :like
          OR CAST(transaction.amount AS CHAR) LIKE :like)`,
                { like },
            );
        }

        if (filters.fechaInicio && filters.fechaFin) {
            qb.andWhere(
                'transaction.created_at BETWEEN :fechaInicio AND :fechaFin',
                { fechaInicio: filters.fechaInicio, fechaFin: filters.fechaFin },
            );
        } else if (filters.fechaInicio) {
            qb.andWhere('transaction.created_at >= :fechaInicio', {
                fechaInicio: filters.fechaInicio,
            });
        } else if (filters.fechaFin) {
            qb.andWhere('transaction.created_at <= :fechaFin', {
                fechaFin: filters.fechaFin,
            });
        }

        qb.orderBy('transaction.created_at', 'DESC')
            .skip(pageOptions.skip)
            .take(pageOptions.take);

        const [entities, itemCount] = await qb.getManyAndCount();

        // Obtener usuarios asociados
        const userIds = [...new Set(entities.map(t => Number(t.sessionId)).filter(id => !isNaN(id)))];
        if (userIds.length > 0) {
            const usuarios = await this.usuarioRepository.find({
                where: { id: In(userIds) },
                select: ['id', 'nombres', 'apellidos', 'email'],
            });
            const userMap = new Map(usuarios.map(u => [u.id, u]));
            for (const tx of entities) {
                tx.usuario = userMap.get(Number(tx.sessionId));
            }
        }

        const meta = new PageMetaDto({ pageOptionsDto: pageOptions, itemCount });
        return new PageDto(entities, meta);
    }

    async obtenerTransaccionPorId(id: string): Promise<Transaction> {
        const transaction = await this.transactionRepository.findOne({
            where: { id },
            relations: ['items'],
        });

        if (!transaction) {
            throw new NotFoundException(`Transacción con ID ${id} no encontrada`);
        }

        const usuario = await this.usuarioRepository.findOne({
            where: { id: Number(transaction.sessionId) },
            select: ['id', 'nombres', 'apellidos', 'email'],
        });
        transaction.usuario = usuario ?? undefined;

        return transaction;
    }

}
