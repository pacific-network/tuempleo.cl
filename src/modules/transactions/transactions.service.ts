import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from 'src/repository/transaction/transaction.entity';
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
    ) { }

    async obtenerTransacciones(
        userId: number,
        pageOptions: PageOptionsDto,
        filters: TransactionFilters,
    ): Promise<PageDto<Transaction>> {
        const qb = this.transactionRepository
            .createQueryBuilder('transaction')
            // ✅ Filtramos por el sessionId (que es el userId)
            .where('transaction.sessionId = :userId', { userId });

        // 🔍 Búsqueda por texto libre
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

        // 🔹 Filtro por rango de fechas
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
        const meta = new PageMetaDto({ pageOptionsDto: pageOptions, itemCount });

        return new PageDto(entities, meta);
    }

    async obtenerTransaccionPorId(id: string): Promise<Transaction> {
        // Buscar la transacción base
        const transaction = await this.transactionRepository.findOne({
            where: { id },
            relations: ['items'], // ← trae los ítems asociados
        });
    
        // Si no existe, lanzamos error
        if (!transaction) {
            throw new NotFoundException(`Transacción con ID ${id} no encontrada`);
        }
    
        return transaction;
    }
    
}
