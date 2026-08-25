import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Usuario } from 'src/repository/user/user.entity';
import { Repository } from 'typeorm';
import { Transaction, PaymentGateway } from 'src/repository/transaction/transaction.entity';
import { crearPreferenciaPago, avisos, MpItem } from './const/tipo_avisos.preferences';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { PaymentResponseExtended } from './interfaces/payment-response.interface';
import { generateOrderId } from 'src/shared/generator/order-id.generator';
import { StockService } from '../stock/stock.service';
import { Empleador } from 'src/repository/employer/employer.entity';
import { TransactionStatus, mapPaymentStatus } from '../webpay+/enum/transaction-status';

@Injectable()
export class MercadoPagoService {
    constructor(
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
        @InjectRepository(Empleador)
        private readonly empleadorRepository: Repository<Empleador>,
        private readonly stockService: StockService,
    ) { }

    // ======================================================
    // 💳 CREAR PREFERENCIA + REGISTRAR TRANSACCIÓN
    // ======================================================
    async crearPreferenciaYRegistrar(
        items: MpItem[],
        userId: number,
    ) {
        console.log('🧠 [MercadoPagoService] → Iniciando creación de preferencia múltiple.');
        console.log(`📦 Items: ${JSON.stringify(items)} | Usuario: ${userId}`);

        if (!Array.isArray(items) || items.length === 0) {
            throw new Error('Debes seleccionar al menos un tipo de aviso.');
        }

        // 1️⃣ Generar orderId primero para usarlo como external_reference
        const orderId = generateOrderId('MERCADOPAGO');

        // 2️⃣ Crear preferencia (orderId viaja como external_reference)
        const preference = await crearPreferenciaPago(items, orderId);
        console.log('🪄 Preferencia creada en Mercado Pago:', preference.id);

        // 3️⃣ Calcular monto total desde backend
        let total = 0;
        for (const item of items) {
            const plan = avisos[item.tipoAviso];
            if (!plan) throw new Error(`Tipo de aviso no válido: ${item.tipoAviso}`);
            total += plan.price * item.cantidad;
        }

        // 4️⃣ Crear transacción con items en base de datos
        const transaction = this.transactionRepository.create({
            orderId,
            sessionId: String(userId),
            amount: total,
            token: preference.id,
            status: TransactionStatus.PENDIENTE,
            origen: PaymentGateway.MERCADOPAGO,
            response_data: preference,
            items: items.map((i) => ({
                tipoAviso: i.tipoAviso,
                cantidad: i.cantidad,
                precioUnitario: avisos[i.tipoAviso].price,
                subtotal: avisos[i.tipoAviso].price * i.cantidad,
            })),
        });

        await this.transactionRepository.save(transaction);

        console.log('💾 Transacción registrada correctamente:');
        console.log({
            orderId: transaction.orderId,
            userId,
            items,
            monto_total: total,
            preferenceId: preference.id,
        });

        // 4️⃣ Retornar datos al front
        console.log('🔗 URL de inicio de pago:', preference.init_point);
        return {
            preferenceId: preference.id,
            init_point: preference.init_point,
            sandbox_init_point: preference.sandbox_init_point,
            total,
        };
    }

    // ======================================================
    // 🔔 PROCESAR NOTIFICACIÓN (WEBHOOK)
    // ======================================================
    async procesarNotificacionPago(paymentId: string): Promise<void> {
        console.log(`📬 [Webhook] Notificación recibida de Mercado Pago → paymentId=${paymentId}`);
        await this.confirmAndProcess(paymentId);
    }

    // ======================================================
    // ✅ CONFIRMAR + PROCESAR STOCK (idempotente)
    //    Usado tanto por el webhook como por el redirect del usuario.
    // ======================================================
    async confirmAndProcess(paymentId: string): Promise<void> {
        try {
            const client = new MercadoPagoConfig({
                accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
            });
            const payment = new Payment(client);

            console.log(`🔍 Consultando pago en API de Mercado Pago → ${paymentId}`);
            const result = (await payment.get({ id: paymentId })) as PaymentResponseExtended;

            if (!result) {
                console.warn(`⚠️ No se encontró pago con ID ${paymentId} en la API.`);
                return;
            }

            const prefId = result.preference_id;
            const externalRef = (result as any).external_reference as string | undefined;
            const status = result.status?.toUpperCase() || 'UNKNOWN';

            let tx = prefId
                ? await this.transactionRepository.findOne({ where: { token: prefId } })
                : null;

            if (!tx && externalRef) {
                tx = await this.transactionRepository.findOne({ where: { orderId: externalRef } });
            }

            if (!tx) {
                console.warn(
                    `⚠️ Sin transacción asociada al pago ${paymentId} (preference_id=${prefId ?? 'null'}, external_reference=${externalRef ?? 'null'})`,
                );
                return;
            }

            const mappedStatus = mapPaymentStatus(status);
            tx.status = mappedStatus;
            tx.response_data = result;
            await this.transactionRepository.save(tx);

            if (mappedStatus !== TransactionStatus.PAGADA) {
                console.warn(`⚠️ Pago ${paymentId} no aprobado (estado: ${status} → ${mappedStatus}).`);
                return;
            }

            if (tx.stock_processed) {
                console.log(`ℹ️ Stock ya procesado para ${tx.orderId}, omitiendo.`);
                return;
            }

            const userId = Number(tx.sessionId);

            // El stock se acredita a la empresa activa al momento de la compra.
            // Resolver solo por usuario podía acreditarlo a otra de sus empresas
            // cuando administra varias, y esto es dinero: no se adivina.
            const comprador = await this.empleadorRepository.manager.findOne(Usuario, {
                where: { id: userId },
            });

            const empleador = comprador?.id_empresa
                ? await this.empleadorRepository.findOne({
                    where: {
                        usuario: { id: userId },
                        empresa: { id: comprador.id_empresa },
                    },
                    relations: ['empresa'],
                })
                : await this.empleadorRepository.findOne({
                    where: { usuario: { id: userId } },
                    relations: ['empresa'],
                });

            if (!empleador?.empresa?.id) {
                console.warn(`⚠️ Usuario ${userId} no tiene empresa asociada. Stock NO actualizado.`);
                return;
            }

            await this.stockService.processTransactionStock(tx.id, empleador.empresa.id);

            tx.stock_processed = true;
            await this.transactionRepository.save(tx);

            console.log(`✅ Stock actualizado correctamente para empresa ${empleador.empresa.id} (orden ${tx.orderId})`);
        } catch (error) {
            console.error('❌ Error confirmando/procesando pago Mercado Pago:', error);
        }
    }

    // ======================================================
    // 🔎 OBTENER DETALLE DE TRANSACCIÓN
    // ======================================================
    async getDetailMpTransaccion(preferenceIdOrToken: string) {
        console.log('🧠 [MercadoPagoService] → Consultando detalle de transacción.');
        console.log(`🔍 Token recibido: ${preferenceIdOrToken}`);

        const tx = await this.transactionRepository.findOne({
            where: { token: preferenceIdOrToken },
        });

        if (!tx) {
            console.error(`❌ No se encontró transacción con token: ${preferenceIdOrToken}`);
            throw new NotFoundException(`No se encontró transacción con token: ${preferenceIdOrToken}`);
        }

        console.log('✅ Transacción encontrada:');
        console.log({
            orderId: tx.orderId,
            status: tx.status,
            monto: tx.amount,
            updatedAt: tx.updatedAt,
        });

        const { orderId, sessionId, amount, status, response_data, createdAt, updatedAt, origen } = tx;

        return {
            orderId,
            sessionId,
            amount,
            status,
            response_data,
            createdAt,
            updatedAt,
            origen,
        };
    }
}
