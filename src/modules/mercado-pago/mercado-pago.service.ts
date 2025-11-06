import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, PaymentGateway } from 'src/repository/transaction/transaction.entity';
import { crearPreferenciaPago } from './const/tipo_avisos.preferences';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { PaymentResponseExtended } from './interfaces/payment-response.interface';
import { generateOrderId } from 'src/shared/generator/order-id.generator';

@Injectable()
export class MercadoPagoService {
    constructor(
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
    ) { }

    // ======================================================
    // 0️⃣ CREAR TRANSACCIÓN PENDIENTE (CON ÍTEMS)
    // ======================================================
    async createPendingTransactionMP(userId: number, items: any[]) {
        try {
            const total = items.reduce(
                (sum, i) => sum + (i.precio ?? i.precioUnitario ?? 0) * (i.cantidad ?? 1),
                0,
            );

            const orderId = generateOrderId('MERCADOPAGO');

            const transaction = this.transactionRepository.create({
                orderId,
                sessionId: String(userId),
                amount: total,
                status: 'PENDING',
                origen: PaymentGateway.MERCADOPAGO,
                items: items.map((i) => ({
                    tipoAviso: i.tipoAviso || i.nombre || 'Aviso',
                    cantidad: i.cantidad || 1,
                    precioUnitario: i.precio ?? i.precioUnitario ?? 0,
                    subtotal:
                        (i.precio ?? i.precioUnitario ?? 0) * (i.cantidad ?? 1),
                })),
            });

            await this.transactionRepository.save(transaction);

            console.log(`🧾 [MercadoPago] Transacción pendiente creada:
        - Usuario ID: ${userId}
        - Orden: ${orderId}
        - Ítems: ${items.length}
        - Total: ${total}`);

            return { orderId, total };
        } catch (error) {
            console.error('❌ Error creando transacción pendiente MP:', error);
            throw new InternalServerErrorException('No se pudo crear la transacción pendiente de Mercado Pago');
        }
    }

    // ======================================================
    // 1️⃣ CREAR PREFERENCIA Y ENLAZAR CON TRANSACCIÓN EXISTENTE
    // ======================================================
    // async crearPreferenciaYRegistrar(
    //     tipo: 'BASICO' | 'ESTANDAR' | 'PREMIUM',
    //     userId: number,
    //     items: any[] = [],
    // ) {
    //     console.log('🧠 [MercadoPagoService] → Creando preferencia e iniciando registro.');
    //     console.log(`📦 Tipo: ${tipo} | Usuario: ${userId}`);

    //     const preference = await crearPreferenciaPago(tipo);
    //     if (!preference.id) {
    //         throw new Error('❌ Mercado Pago no devolvió un preference.id válido');
    //     }

    //     console.log('🪄 Preferencia creada en Mercado Pago:', preference.id);

    //     const total = items.reduce((s, i) => s + (i.precio ?? i.precioUnitario ?? 0) * (i.cantidad ?? 1), 0);

    //     const tx = await this.transactionRepository.findOne({
    //         where: { sessionId: String(userId), status: 'PENDING', origen: PaymentGateway.MERCADOPAGO },
    //         order: { createdAt: 'DESC' },
    //     });

    //     if (!tx) throw new NotFoundException(`No se encontró transacción pendiente para el usuario ${userId}`);

    //     tx.token = preference.id;
    //     tx.response_data = preference;
    //     tx.amount = total;
    //     await this.transactionRepository.save(tx);

    //     console.log(`💾 Transacción actualizada con preferencia: ${preference.id}`);

    //     return {
    //         preferenceId: preference.id,
    //         init_point: preference.init_point,
    //         sandbox_init_point: preference.sandbox_init_point,
    //     };
    // }
    async crearPreferenciaYRegistrar(
        userId: number,
        items: any[] = [],
    ) {
        console.log('🧠 [MercadoPagoService] → Creando preferencia e iniciando registro.');

        // ✅ Detectar tipo según el primer ítem o fallback
        const tipo = (items[0]?.tipoAviso || 'BASICO').toUpperCase() as
            'BASICO' | 'ESTANDAR' | 'PREMIUM';

        const preference = await crearPreferenciaPago(tipo);
        if (!preference.id) {
            throw new Error('❌ Mercado Pago no devolvió un preference.id válido');
        }

        console.log('🪄 Preferencia creada en Mercado Pago:', preference.id);

        const total = items.reduce(
            (s, i) => s + (i.precio ?? i.precioUnitario ?? 0) * (i.cantidad ?? 1),
            0
        );

        const tx = await this.transactionRepository.findOne({
            where: { sessionId: String(userId), status: 'PENDING', origen: PaymentGateway.MERCADOPAGO },
            order: { createdAt: 'DESC' },
        });

        if (!tx)
            throw new NotFoundException(
                `No se encontró transacción pendiente para el usuario ${userId}`
            );

        tx.token = preference.id;
        tx.response_data = preference;
        tx.amount = total;
        await this.transactionRepository.save(tx);

        console.log(`💾 Transacción actualizada con preferencia: ${preference.id}`);

        return {
            preferenceId: preference.id,
            init_point: preference.init_point,
            sandbox_init_point: preference.sandbox_init_point,
        };
    }


    // ======================================================
    // 2️⃣ PROCESAR NOTIFICACIÓN DE MERCADO PAGO (WEBHOOK)
    // ======================================================
    async procesarNotificacionPago(paymentId: string): Promise<void> {
        console.log(`📬 [Webhook] Notificación recibida de Mercado Pago → paymentId=${paymentId}`);

        try {
            const client = new MercadoPagoConfig({
                accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
            });
            const payment = new Payment(client);

            console.log('🔍 Consultando pago en API de Mercado Pago...');
            const result = (await payment.get({ id: paymentId })) as PaymentResponseExtended;

            if (!result) {
                console.warn(`⚠️ No se encontró pago con ID ${paymentId} en la API.`);
                return;
            }

            console.log(`✅ Pago encontrado en Mercado Pago → ID ${result.id}`);

            const prefId = result.preference_id;
            const status = result.status?.toUpperCase() || 'UNKNOWN';
            const statusDetail = result.status_detail;

            console.log('📦 Datos del pago:', {
                id: result.id,
                preference_id: prefId,
                status,
                status_detail: statusDetail,
            });

            // ===============================
            // 🔍 Buscar transacción en DB
            // ===============================
            let tx: Transaction | null = null;

            if (prefId) {
                tx = await this.transactionRepository.findOne({
                    where: { token: prefId },
                    relations: ['items'],
                });
                if (tx) console.log(`✅ Transacción encontrada por token (${prefId})`);
            }

            if (!tx) {
                tx = await this.transactionRepository.findOne({
                    where: { status: 'PENDING', origen: PaymentGateway.MERCADOPAGO },
                    order: { createdAt: 'DESC' },
                    relations: ['items'],
                });
                if (tx) console.log(`⚠️ preference_id vacío → usando transacción pendiente más reciente (${tx.orderId})`);
            }

            if (!tx) {
                console.warn(`⚠️ No se encontró transacción asociada al pago ${paymentId}`);
                return;
            }

            // ===============================
            // 🧾 Actualizar transacción
            // ===============================
            console.log('🧾 Transacción encontrada:', {
                orderId: tx.orderId,
                statusAnterior: tx.status,
            });

            tx.status = status;
            tx.response_data = result;
            await this.transactionRepository.save(tx);

            console.log(`✅ Transacción ${tx.orderId} actualizada correctamente → ${status}`);
        } catch (error) {
            console.error('❌ Error procesando notificación de Mercado Pago:', error);
        }
    }

    // ======================================================
    // 3️⃣ OBTENER DETALLE DE TRANSACCIÓN
    // ======================================================
    async getDetailMpTransaccion(preferenceIdOrToken: string) {
        console.log('🧠 [MercadoPagoService] → Consultando detalle de transacción.');
        console.log(`🔍 Token recibido: ${preferenceIdOrToken}`);

        const tx = await this.transactionRepository.findOne({
            where: { token: preferenceIdOrToken },
            relations: ['items'],
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

        const { orderId, sessionId, amount, status, response_data, createdAt, updatedAt, origen, items } = tx;

        return {
            orderId,
            sessionId,
            amount,
            status,
            response_data,
            createdAt,
            updatedAt,
            origen,
            items,
        };
    }
}
