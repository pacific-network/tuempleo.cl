import { Injectable, NotFoundException } from '@nestjs/common';
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
    // 💳 CREAR PREFERENCIA + REGISTRAR TRANSACCIÓN
    // ======================================================
    // async crearPreferenciaYRegistrar(
    //     tipo: 'BASICO' | 'ESTANDAR' | 'PREMIUM',
    //     userId: number,
    // ) {
    //     console.log('🧠 [MercadoPagoService] → Iniciando creación de preferencia.');
    //     console.log(`📦 Tipo: ${tipo} | Usuario: ${userId}`);

    //     // 1️⃣ Crear preferencia
    //     const preference = await crearPreferenciaPago(tipo);
    //     console.log('🪄 Preferencia creada en Mercado Pago:', preference.id);

    //     // 2️⃣ Calcular monto
    //     const price = {
    //         BASICO: 80000,
    //         ESTANDAR: 140000,
    //         PREMIUM: 180000,
    //     }[tipo];

    //     if (!price) {
    //         throw new Error(`❌ Tipo de aviso no válido o sin precio definido: ${tipo}`);
    //     }

    //     // 3️⃣ Crear transacción en base de datos
    //     const transaction = this.transactionRepository.create({
    //         orderId: generateOrderId('MERCADOPAGO'),
    //         sessionId: String(userId),
    //         amount: price,
    //         token: preference.id,
    //         status: 'PENDING',
    //         origen: PaymentGateway.MERCADOPAGO,
    //         response_data: preference,
    //     });

    //     await this.transactionRepository.save(transaction);

    //     console.log('💾 Transacción registrada correctamente:');
    //     console.log({
    //         orderId: transaction.orderId,
    //         userId,
    //         tipo,
    //         monto: price,
    //         preferenceId: preference.id,
    //     });

    //     // 4️⃣ Retornar datos al front
    //     console.log('🔗 URL de inicio de pago:', preference.init_point);
    //     return {
    //         preferenceId: preference.id,
    //         init_point: preference.init_point,
    //         sandbox_init_point: preference.sandbox_init_point,
    //     };
    // }
    async crearPreferenciaYRegistrar(
        tipos: ('BASICO' | 'ESTANDAR' | 'PREMIUM')[],
        userId: number,
    ) {
        console.log('🧠 [MercadoPagoService] → Iniciando creación de preferencia múltiple.');
        console.log(`📦 Tipos seleccionados: ${tipos.join(', ')} | Usuario: ${userId}`);

        if (!Array.isArray(tipos) || tipos.length === 0) {
            throw new Error('Debes seleccionar al menos un tipo de aviso.');
        }

        // 1️⃣ Crear preferencia con varios ítems
        const preference = await crearPreferenciaPago(tipos);
        console.log('🪄 Preferencia creada en Mercado Pago:', preference.id);

        // 2️⃣ Calcular monto total
        const precios: Record<'BASICO' | 'ESTANDAR' | 'PREMIUM', number> = {
            BASICO: 80000,
            ESTANDAR: 140000,
            PREMIUM: 180000,
        };

        let total = 0;
        for (const tipo of tipos) {
            const price = precios[tipo];
            if (!price) throw new Error(`❌ Tipo de aviso no válido o sin precio definido: ${tipo}`);
            total += price;
        }

        // 3️⃣ Crear transacción en base de datos
        const transaction = this.transactionRepository.create({
            orderId: generateOrderId('MERCADOPAGO'),
            sessionId: String(userId),
            amount: total,
            token: preference.id,
            status: 'PENDING',
            origen: PaymentGateway.MERCADOPAGO,
            response_data: preference,
        });

        await this.transactionRepository.save(transaction);

        console.log('💾 Transacción registrada correctamente:');
        console.log({
            orderId: transaction.orderId,
            userId,
            tipos,
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
    // async procesarNotificacionPago(paymentId: string): Promise<void> {
    //     console.log(`📬 [Webhook] Notificación recibida de Mercado Pago → paymentId=${paymentId}`);

    //     try {
    //         const client = new MercadoPagoConfig({
    //             accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
    //         });
    //         const payment = new Payment(client);

    //         console.log('🔍 Consultando pago en API de Mercado Pago...');
    //         const result = (await payment.get({ id: paymentId })) as PaymentResponseExtended;

    //         if (!result) {
    //             console.warn(`⚠️ No se encontró pago con ID ${paymentId} en la API.`);
    //             return;
    //         }

    //         console.log(`✅ Pago encontrado en Mercado Pago → ID ${result.id}`);

    //         const prefId = result.preference_id;
    //         const status = result.status?.toUpperCase() || 'UNKNOWN';
    //         const externalRef = result.external_reference;
    //         const statusDetail = result.status_detail;

    //         console.log('📦 Datos del pago:', {
    //             id: result.id,
    //             preference_id: prefId,
    //             status,
    //             external_reference: externalRef,
    //             status_detail: statusDetail,
    //         });

    //         // ===============================
    //         // 🔍 Buscar transacción en DB
    //         // ===============================
    //         let tx: Transaction | null = null;

    //         if (prefId) {
    //             // Primero intenta por el preference_id (token)
    //             tx = await this.transactionRepository.findOne({ where: { token: prefId } });
    //             if (tx) console.log(`✅ Transacción encontrada por token (${prefId})`);
    //         }

    //         // Si no se encuentra, buscar por ID numérico sin prefijo
    //         if (!tx) {
    //             tx = await this.transactionRepository.findOne({
    //                 where: { orderId: `MP-${paymentId}` },
    //             });

    //             if (!tx) {
    //                 tx = await this.transactionRepository.findOne({
    //                     where: { orderId: paymentId }, // busca por número directo
    //                 });
    //             }
    //         }

    //         if (!tx) {
    //             console.warn(`⚠️ No se encontró transacción asociada al pago ${paymentId}`);
    //             return;
    //         }

    //         // ===============================
    //         // 🧾 Actualizar transacción
    //         // ===============================
    //         console.log('🧾 Transacción encontrada:', {
    //             orderId: tx.orderId,
    //             statusAnterior: tx.status,
    //         });

    //         tx.status = status;
    //         tx.response_data = result;
    //         await this.transactionRepository.save(tx);

    //         console.log(`✅ Transacción ${tx.orderId} actualizada correctamente → ${status}`);
    //     } catch (error) {
    //         console.error('❌ Error procesando notificación de Mercado Pago:', error);
    //     }
    // }
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
            const externalRef = result.external_reference;
            const statusDetail = result.status_detail;

            console.log('📦 Datos del pago:', {
                id: result.id,
                preference_id: prefId,
                status,
                external_reference: externalRef,
                status_detail: statusDetail,
            });

            // ===============================
            // 🔍 Buscar transacción en DB
            // ===============================
            let tx: Transaction | null = null;

            // 1️⃣ Buscar por preference_id si existe
            if (prefId) {
                tx = await this.transactionRepository.findOne({ where: { token: prefId } });
                if (tx) console.log(`✅ Transacción encontrada por token (${prefId})`);
            }

            // 2️⃣ Si no existe preference_id, buscar la más reciente pendiente
            if (!tx) {
                tx = await this.transactionRepository.findOne({
                    where: { status: 'PENDING', origen: PaymentGateway.MERCADOPAGO },
                    order: { createdAt: 'DESC' },
                });
                if (tx)
                    console.log(
                        `⚠️ preference_id vacío → usando transacción pendiente más reciente: ${tx.orderId}`,
                    );
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

