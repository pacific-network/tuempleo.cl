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
                status: 'PENDING',
                items: items.map((i) => ({
                    tipoAviso: i.tipoAviso,
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
            transaction.status = 'CREATED'
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

            transaction.status = response.status
            transaction.response_data = response
            await this.transactionRepository.save(transaction)

            if (response.status === 'AUTHORIZED') {
                const userId = Number(transaction.sessionId)

                const empleador = await this.empleadorRepository.findOne({
                    where: { usuario: { id: userId } },
                    relations: ['empresa'],
                })

                if (!empleador?.empresa?.id) {
                    console.warn(
                        `⚠️ Usuario ${userId} sin empresa asociada`,
                    )
                    return response
                }

                await this.stockService.processTransactionStock(
                    transaction.id,
                    empleador.empresa.id,
                )
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
    // 3️⃣ Buscar transacción por token
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

