import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, PaymentGateway } from 'src/repository/transaction/transaction.entity';
import { crearPreferenciaPago } from './const/tipo_avisos.preferences';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { PaymentResponseExtended } from './interfaces/payment-response.interface';
@Injectable()
export class MercadoPagoService {
    constructor(
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
    ) { }

    async crearPreferenciaYRegistrar(
        tipo: 'BASICO' | 'ESTANDAR' | 'PREMIUM',
        userId: number,
    ) {
        // 1️⃣ Crear preferencia
        const preference = await crearPreferenciaPago(tipo);

        // 2️⃣ Calcular monto del aviso
        const price = {
            BASICO: 80000,
            ESTANDAR: 140000,
            PREMIUM: 180000,
        }[tipo];
        if (!price) {
            throw new Error(`❌ Tipo de aviso no válido o sin precio definido: ${tipo}`);
        }

        // 3️⃣ Crear transacción en la BD
        const transaction = this.transactionRepository.create({
            orderId: `MP-${Date.now()}`, // genera un ID interno
            sessionId: String(userId),
            amount: price,
            token: preference.id, // id de preferencia
            status: 'PENDING',
            origen: PaymentGateway.MERCADOPAGO,
            response_data: preference,
        });

        await this.transactionRepository.save(transaction);

        console.log(`💰 Transacción Mercado Pago registrada:
      - Usuario ID: ${userId}
      - Tipo aviso: ${tipo}
      - Monto: ${price}
      - Pref ID: ${preference.id}`);

        // 4️⃣ Retornar la URL para iniciar pago
        return {
            preferenceId: preference.id,
            init_point: preference.init_point,
            sandbox_init_point: preference.sandbox_init_point,
        };
    }

    // ======================================================
    // 🔔 PROCESAR NOTIFICACIÓN (WEBHOOK)
    // ======================================================
    // async procesarNotificacionPago(paymentId: string): Promise<void> {
    //     console.log(`📬 Notificación recibida de Mercado Pago. paymentId=${paymentId}`);

    //     try {
    //         // Inicializa el cliente Mercado Pago
    //         const client = new MercadoPagoConfig({
    //             accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
    //         });

    //         const payment = new Payment(client);
    //         const result = (await payment.get({ id: paymentId })) as PaymentResponseExtended;

    //         // Extraer campos relevantes
    //         const prefId = result.preference_id;
    //         const status = result.status?.toUpperCase() || 'UNKNOWN';
    //         const externalRef = result.external_reference;

    //         console.log(`🔎 Pago encontrado en MP: ${paymentId} → ${status}`);
    //         console.log(`🧾 preference_id=${prefId} | external_reference=${externalRef}`);

    //         // Validación defensiva
    //         if (!prefId) {
    //             console.warn(`⚠️ No se recibió preference_id en el pago ${paymentId}`);
    //             return;
    //         }

    //         // Buscar la transacción correspondiente
    //         const tx = await this.transactionRepository.findOne({ where: { token: prefId } });

    //         if (!tx) {
    //             console.warn(`⚠️ No se encontró transacción asociada a preference_id: ${prefId}`);
    //             return;
    //         }

    //         // Actualizar estado y datos
    //         tx.status = status;
    //         tx.response_data = result;

    //         await this.transactionRepository.save(tx);

    //         console.log(`✅ Transacción ${tx.orderId} actualizada → ${status}`);
    //     } catch (error) {
    //         console.error('❌ Error procesando notificación de Mercado Pago:', error);
    //     }
    // }
    // ======================================================
    // 🔔 PROCESAR NOTIFICACIÓN (WEBHOOK) — versión robusta
    // ======================================================
    async procesarNotificacionPago(paymentId: string): Promise<void> {
        console.log(`📬 Notificación recibida de Mercado Pago. paymentId=${paymentId}`);

        try {
            // Inicializa el cliente Mercado Pago
            const client = new MercadoPagoConfig({
                accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
            });

            const payment = new Payment(client);

            let result: PaymentResponseExtended | null = null;

            try {
                result = (await payment.get({ id: paymentId })) as PaymentResponseExtended;
            } catch (err: any) {
                // Detectar error 404 — pago no visible con este token
                if (err?.status === 404 || err?.message?.includes('Payment not found')) {
                    console.warn(`⚠️ Pago ${paymentId} no encontrado en MP (sandbox o credenciales distintas).`);

                    // Simulación fallback en entorno dev/test
                    if (process.env.NODE_ENV !== 'production') {
                        console.log('⚙️ Simulando actualización local (modo test).');

                        const txFallback = await this.transactionRepository.findOne({
                            where: { orderId: `MP-${paymentId}` },
                        });

                        if (txFallback) {
                            txFallback.status = 'AUTHORIZED';
                            await this.transactionRepository.save(txFallback);
                            console.log(`✅ Transacción simulada como APROBADA → ${txFallback.orderId}`);
                        } else {
                            console.warn('⚠️ No se encontró ninguna transacción para simular.');
                        }
                    }
                    return;
                }

                throw err;
            }

            // Si realmente encontramos el pago
            const prefId = result.preference_id;
            const status = result.status?.toUpperCase() || 'UNKNOWN';
            const externalRef = result.external_reference;

            console.log(`🔎 Pago encontrado en MP: ${paymentId} → ${status}`);
            console.log(`🧾 preference_id=${prefId} | external_reference=${externalRef}`);

            if (!prefId) {
                console.warn(`⚠️ No se recibió preference_id en el pago ${paymentId}`);
                return;
            }

            // Buscar la transacción correspondiente
            const tx = await this.transactionRepository.findOne({ where: { token: prefId } });

            if (!tx) {
                console.warn(`⚠️ No se encontró transacción asociada a preference_id: ${prefId}`);
                return;
            }

            // Actualizar estado y datos
            tx.status = status;
            tx.response_data = result;

            await this.transactionRepository.save(tx);

            console.log(`✅ Transacción ${tx.orderId} actualizada → ${status}`);
        } catch (error) {
            console.error('❌ Error procesando notificación de Mercado Pago:', error);
        }
    }

    // async getDetailMpTransaccion(preferenceIdOrToken: string) {
    //     console.log(`🔍 Buscando transacción Mercado Pago con token: ${preferenceIdOrToken}`);

    //     const tx = await this.transactionRepository.findOne({
    //         where: { token: preferenceIdOrToken },
    //     });

    //     if (!tx) {
    //         throw new Error(`❌ No se encontró transacción con token: ${preferenceIdOrToken}`);
    //     }

    //     // Puedes filtrar solo lo relevante para el front
    //     const { orderId, sessionId, amount, status, response_data, createdAt, updatedAt } = tx;

    //     return {
    //         orderId,
    //         sessionId,
    //         amount,
    //         status,
    //         response_data,
    //         createdAt,
    //         updatedAt,
    //         origen: 'MERCADOPAGO',
    //     };
    // }
    async getDetailMpTransaccion(preferenceIdOrToken: string) {
        console.log(`🔍 Buscando transacción Mercado Pago con token: ${preferenceIdOrToken}`);

        const tx = await this.transactionRepository.findOne({
            where: { token: preferenceIdOrToken },
        });

        if (!tx) {
            // 👇 Lanzamos un error 404 en lugar de Error genérico
            throw new NotFoundException(`No se encontró transacción con token: ${preferenceIdOrToken}`);
        }

        // Estructuramos solo los datos relevantes para el front
        const { orderId, sessionId, amount, status, response_data, createdAt, updatedAt, origen } = tx;

        return {
            orderId,
            sessionId,
            amount,
            status,
            response_data,
            createdAt: createdAt,
            updatedAt: updatedAt,
            origen,
        };
    }



}
