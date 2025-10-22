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

        @InjectRepository(Usuario)
        private readonly usuarioRepository: Repository<Usuario>,

        @InjectRepository(Empleador)
        private readonly empleadorRepository: Repository<Empleador>,

        private readonly stockService: StockService,
    ) { }
    // ==============================================================
    // 0️⃣ Crear transacción pendiente (antes de enviar a Webpay)
    // ==============================================================
    // ==============================
    // 0️⃣ Crear transacción pendiente (antes de enviar a Webpay)
    // ==============================
    // ===========================================================
    // 0️⃣ Crear transacción pendiente (usando relaciones ORM)
    // ===========================================================
    async createPendingTransaction(empresaId: number, userId: number, items: any[]) {
        try {
            const total = items.reduce(
                (sum, i) => sum + (i.precioUnitario ?? 0) * (i.cantidad ?? 1),
                0
            );

            const orderId = Math.random().toString(36).substring(2, 14);

            // 🧾 Crear transacción con sus ítems (ORM puro)
            const transaction = this.transactionRepository.create({
                orderId,
                sessionId: String(userId),
                amount: total,
                status: 'PENDING',
                items: items.map((i) => ({
                    tipoAviso: i.tipoAviso,
                    cantidad: i.cantidad,
                    precioUnitario: i.precioUnitario,
                    subtotal: (i.precioUnitario ?? 0) * (i.cantidad ?? 1),
                })),
            });

            await this.transactionRepository.save(transaction);

            console.log(`🧾 Creando transacción pendiente:
        - Usuario ID: ${userId}
        - Empresa ID: ${empresaId}
        - Ítems: ${items.length}`);

            return { orderId, total };
        } catch (error) {
            console.error('❌ Error creando transacción pendiente:', error);
            throw new InternalServerErrorException('No se pudo crear la transacción pendiente');
        }
    }





    // ==============================================================
    // 1️⃣ Crear transacción Webpay (inicio del pago)
    // ==============================================================
    async createTransaction(amount: number, orderId: string, sessionId: string) {
        try {
            const response = await webpay.create(orderId, sessionId, amount, returnUrl);

            // Buscar la transacción pendiente por orderId y actualizarla con el token
            const transaction = await this.transactionRepository.findOne({ where: { orderId } });

            if (transaction) {
                transaction.token = response.token;
                transaction.status = 'CREATED';
                await this.transactionRepository.save(transaction);
            } else {
                // Fallback por si no se encuentra
                await this.transactionRepository.save({
                    orderId,
                    sessionId,
                    amount,
                    token: response.token,
                    status: 'CREATED',
                });
            }

            console.log(`💳 Creando transacción Webpay:
            - Usuario ID: ${sessionId}
            - Orden: ${orderId}
            - Monto: ${amount}
            - Token: ${response.token}`);

            return { url: response.url, token: response.token };
        } catch (error) {
            console.error('❌ Error creando transacción Webpay:', error);
            throw new InternalServerErrorException('No se pudo crear la transacción Webpay');
        }
    }


    // ==============================================================
    // 2️⃣ Confirmar transacción Webpay y actualizar stock automáticamente
    // ==============================================================
    // async confirmTransaction(token: string) {
    //     try {
    //         // 🔹 Confirmación con Transbank
    //         const response = await webpay.commit(token);

    //         // 🔹 Buscar la transacción en la base de datos
    //         const transaction = await this.transactionRepository.findOne({
    //             where: { token },
    //             relations: ['items'],
    //         });

    //         if (!transaction) {
    //             throw new NotFoundException('Transacción no encontrada');
    //         }

    //         // 🔹 Actualizar estado y guardar datos de respuesta
    //         transaction.status = response.status;
    //         transaction.response_data = response;
    //         await this.transactionRepository.save(transaction);

    //         // ==============================================================
    //         // ✅ Si está autorizada, actualizar stock de la empresa asociada
    //         // ==============================================================
    //         if (response.status === 'AUTHORIZED') {
    //             const userId = Number(transaction.sessionId);

    //             // Buscar empleador vinculado al usuario
    //             const empleador = await this.empleadorRepository.findOne({
    //                 where: { usuario: { id: userId } },
    //                 relations: ['empresa'],
    //             });

    //             if (!empleador?.empresa?.id) {
    //                 console.warn(`⚠️ Usuario ${userId} no tiene empresa asociada (no se actualiza stock).`);
    //                 return response;
    //             }

    //             const empresaId = empleador.empresa.id;

    //             // 🔹 Actualizar créditos según los ítems comprados
    //             for (const item of transaction.items ?? []) {
    //                 await this.stockService.addCredits(
    //                     empresaId,
    //                     item.tipoAviso,
    //                     item.cantidad,
    //                 );
    //             }

    //             console.log(
    //                 `✅ Stock actualizado correctamente para empresa ${empresaId} (orden ${transaction.orderId})`,
    //             );
    //         }

    //         return response;
    //     } catch (error) {
    //         console.error('❌ Error confirmando transacción:', error);
    //         throw new InternalServerErrorException('No se pudo confirmar la transacción Webpay');
    //     }
    // }
    // src/modules/webpay/webpay.service.ts
    async confirmTransaction(token: string) {
        try {
            // 1️⃣ Confirmar con Transbank
            const response = await webpay.commit(token);

            // 2️⃣ Buscar la transacción en base de datos (con sus ítems)
            const transaction = await this.transactionRepository.findOne({
                where: { token },
                relations: ['items'], // fundamental
            });

            if (!transaction) {
                throw new NotFoundException('Transacción no encontrada');
            }

            // 3️⃣ Actualizar estado y datos de respuesta
            transaction.status = response.status;
            transaction.response_data = response;
            await this.transactionRepository.save(transaction);

            // 4️⃣ Procesar solo si está AUTORIZADA
            if (response.status === 'AUTHORIZED') {
                const userId = Number(transaction.sessionId);

                // Buscar la empresa asociada al usuario
                const empleador = await this.empleadorRepository.findOne({
                    where: { usuario: { id: userId } },
                    relations: ['empresa'],
                });

                if (!empleador?.empresa?.id) {
                    console.warn(`⚠️ Usuario ${userId} no tiene empresa asociada (stock no actualizado).`);
                    return response;
                }

                const empresaId = empleador.empresa.id;

                // 🧩 Si no cargó los ítems (caso edge), los recuperamos manualmente
                if (!transaction.items || transaction.items.length === 0) {
                    transaction.items = await this.transactionRepository.query(
                        `SELECT tipoAviso, cantidad FROM transaction_items WHERE transaction_id = ?`,
                        [transaction.id]
                    );
                }

                // 5️⃣ Procesar stock basado en la transacción
                await this.stockService.processTransactionStock(transaction.id, empresaId);

                console.log(
                    `✅ Stock actualizado correctamente para empresa ${empresaId} (orden ${transaction.orderId})`
                );
            }

            return response;
        } catch (error) {
            console.error('❌ Error confirmando transacción:', error);
            throw new InternalServerErrorException('No se pudo confirmar la transacción Webpay');
        }
    }



    // ==============================================================
    // 3️⃣ Buscar transacción por token (para vista final del frontend)
    // ==============================================================
    async findTransactionByToken(token: string) {
        return this.transactionRepository.findOne({ where: { token } });
    }

    // ==============================================================
    // 4️⃣ Listar transacciones (paginadas)
    // ==============================================================
    async obtenerTransacciones(
        pageOptions: PageOptionsDto,
        fechaInicio?: string,
        fechaFin?: string,
    ): Promise<PageDto<Transaction>> {
        const queryBuilder =
            this.transactionRepository.createQueryBuilder('transaction');

        if (fechaInicio && fechaFin) {
            queryBuilder.where(
                'transaction.created_at BETWEEN :fechaInicio AND :fechaFin',
                { fechaInicio, fechaFin },
            );
        } else if (fechaInicio) {
            queryBuilder.where('transaction.created_at >= :fechaInicio', { fechaInicio });
        } else if (fechaFin) {
            queryBuilder.where('transaction.created_at <= :fechaFin', { fechaFin });
        }

        queryBuilder
            .orderBy('transaction.created_at', 'DESC')
            .skip(pageOptions.skip)
            .take(pageOptions.take);

        const [entities, itemCount] = await queryBuilder.getManyAndCount();
        const meta = new PageMetaDto({ pageOptionsDto: pageOptions, itemCount });

        return new PageDto(entities, meta);
    }
}
