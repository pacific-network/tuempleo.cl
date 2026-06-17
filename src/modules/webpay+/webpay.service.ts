import {
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { WebpayPlus, Options, Environment } from 'transbank-sdk';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../../repository/transaction/transaction.entity';
import { Usuario } from 'src/repository/user/user.entity';
import { Empleador } from 'src/repository/employer/employer.entity';
import { StockService } from '../stock/stock.service';
import { WEBPAY_CONFIG } from './config/webpay.config';
import { PageDto } from 'src/shared/pagination/page.dto';
import { PageMetaDto } from 'src/shared/pagination/page-meta.dto';
import { PageOptionsDto } from 'src/shared/pagination/page-options.dto';
import { generateOrderId } from 'src/shared/generator/order-id.generator';
import { TransactionStatus, mapPaymentStatus } from './enum/transaction-status';

// =======================
// CONFIGURACIÓN WEBPAY
// =======================
const { commerceCode, apiKey, environment: envString, returnUrl } = WEBPAY_CONFIG;

const environment =
    envString === 'INTEGRACION'
        ? Environment.Integration
        : Environment.Production;

const webpay = new WebpayPlus.Transaction(
    new Options(commerceCode, apiKey, environment),
);

// =======================
// SERVICIO PRINCIPAL
// =======================
@Injectable()
export class WebpayService {
    constructor(
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,

        @InjectRepository(Empleador)
        private readonly empleadorRepository: Repository<Empleador>,

        private readonly stockService: StockService,
    ) { }

    // ==============================================================
    // 1️⃣ Crear transacción Webpay COMPLETA (pendiente + create)
    // ==============================================================
    async createPendingTransaction(
        empresaId: number,
        userId: number,
        items: any[],
    ) {
        try {
            // 1️⃣ Calcular total DESDE BACKEND
            const total = items.reduce(
                (sum, i) => sum + (i.precioUnitario ?? 0) * (i.cantidad ?? 1),
                0,
            )

            if (total <= 0) {
                throw new InternalServerErrorException('Monto inválido')
            }

            // 2️⃣ Generar orden
            const orderId = generateOrderId('WEBPAY')
            const sessionId = String(userId)

            // 3️⃣ Crear transacción + ítems (estado PENDING)
            const transaction = this.transactionRepository.create({
                orderId,
                sessionId,
                amount: total,
                status: TransactionStatus.PENDIENTE,
                items: items.map((i) => ({
                    // Persistimos SIEMPRE en MAYÚSCULAS para cuadrar con el enum del stock.
                    tipoAviso: String(i.tipoAviso ?? '').toUpperCase() as
                        'GRATIS' | 'BASICO' | 'ESTANDAR' | 'PREMIUM',
                    cantidad: i.cantidad,
                    precioUnitario: i.precioUnitario,
                    subtotal: (i.precioUnitario ?? 0) * (i.cantidad ?? 1),
                })),
            })

            await this.transactionRepository.save(transaction)

            // 4️⃣ Crear transacción en Webpay
            const response = await webpay.create(
                orderId,
                sessionId,
                total,
                returnUrl,
            )

            // 5️⃣ Actualizar transacción existente
            transaction.token = response.token
            transaction.status = TransactionStatus.PENDIENTE
            await this.transactionRepository.save(transaction)

            console.log(`💳 Webpay creado correctamente:
            - Orden: ${orderId}
            - Monto: ${total}
            - Token: ${response.token}`)

            // 6️⃣ Retornar a frontend
            return {
                payment: transaction,
                url: response.url,
                token: response.token,
            }
        } catch (error) {
            console.error('❌ Error creando transacción Webpay:', error)
            throw new InternalServerErrorException(
                'No se pudo crear la transacción Webpay',
            )
        }
    }

    // ==============================================================
    // 2️⃣ Confirmar transacción Webpay
    // ==============================================================
    async confirmTransaction(token: string) {
        try {
            const response = await webpay.commit(token)

            const transaction = await this.transactionRepository.findOne({
                where: { token },
                relations: ['items'],
            })

            if (!transaction) {
                throw new NotFoundException('Transacción no encontrada')
            }

            const mappedStatus = mapPaymentStatus(response.status)
            transaction.status = mappedStatus
            transaction.response_data = response
            await this.transactionRepository.save(transaction)

            if (mappedStatus === TransactionStatus.PAGADA && !transaction.stock_processed) {
                await this.processStockForTransaction(transaction)
            }

            return response
        } catch (error) {
            console.error('❌ Error confirmando transacción Webpay:', error)
            throw new InternalServerErrorException(
                'No se pudo confirmar la transacción Webpay',
            )
        }
    }

    // ==============================================================
    // 3️⃣ Procesar stock para una transacción autorizada
    // ==============================================================
    async processStockForTransaction(transaction: Transaction) {
        const userId = Number(transaction.sessionId)

        const empleador = await this.empleadorRepository.findOne({
            where: { usuario: { id: userId } },
            relations: ['empresa'],
        })

        if (!empleador?.empresa?.id) {
            console.warn(`⚠️ Usuario ${userId} sin empresa asociada`)
            return
        }

        await this.stockService.processTransactionStock(
            transaction.id,
            empleador.empresa.id,
        )

        transaction.stock_processed = true
        await this.transactionRepository.save(transaction)

        console.log(`✅ Stock procesado para transacción ${transaction.id}`)
    }

    // ==============================================================
    // 4️⃣ Reconciliar transacciones huérfanas (CREATED > 10 min)
    // ==============================================================
    async reconcileOrphanedTransactions() {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

        const orphaned = await this.transactionRepository
            .createQueryBuilder('t')
            .leftJoinAndSelect('t.items', 'items')
            .where('t.status = :status', { status: TransactionStatus.PENDIENTE })
            .andWhere('t.origen = :origen', { origen: 'WEBPAY' })
            .andWhere('t.createdAt < :cutoff', { cutoff: tenMinutesAgo })
            .getMany()

        if (orphaned.length === 0) return

        console.log(`🔄 Reconciliando ${orphaned.length} transacciones huérfanas`)

        for (const tx of orphaned) {
            try {
                const wpStatus = await webpay.status(tx.token)

                const mappedStatus = mapPaymentStatus(wpStatus.status)
                tx.response_data = wpStatus
                tx.status = mappedStatus

                // Timeout duro: si lleva >24h sin avanzar a PAGADA, cerrar como FALLIDA
                // para que el cron deje de consultarla indefinidamente.
                if (
                    mappedStatus === TransactionStatus.PENDIENTE &&
                    tx.createdAt < twentyFourHoursAgo
                ) {
                    tx.status = TransactionStatus.FALLIDA
                    await this.transactionRepository.save(tx)
                    console.log(`⏱️ Transacción ${tx.orderId} expirada por timeout (>24h)`)
                    continue
                }

                await this.transactionRepository.save(tx)

                if (mappedStatus === TransactionStatus.PAGADA && !tx.stock_processed) {
                    await this.processStockForTransaction(tx)
                    console.log(`✅ Reconciliada transacción ${tx.orderId}`)
                } else {
                    console.log(`ℹ️ Transacción ${tx.orderId} estado: ${wpStatus.status}`)
                }
            } catch (error) {
                console.error(`❌ Error reconciliando ${tx.orderId}:`, error.message)

                // Si Webpay ya no reconoce el token (expirado), marcar como FALLIDA
                tx.status = TransactionStatus.FALLIDA
                await this.transactionRepository.save(tx)
            }
        }
    }

    // ==============================================================
    // 5️⃣ Buscar transacción por token
    // ==============================================================
    async findTransactionByToken(token: string) {
        const transaction = await this.transactionRepository.findOne({
            where: { token },
            relations: ['items'], // 👈 CLAVE
        })

        if (!transaction) {
            throw new NotFoundException('Transacción no encontrada')
        }

        return transaction
    }

}

