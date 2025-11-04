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
    async crearPreferenciaYRegistrar(
        tipo: 'BASICO' | 'ESTANDAR' | 'PREMIUM',
        userId: number,
    ) {
        console.log('🧠 [MercadoPagoService] → Iniciando creación de preferencia.');
        console.log(`📦 Tipo: ${tipo} | Usuario: ${userId}`);

        // 1️⃣ Crear preferencia
        const preference = await crearPreferenciaPago(tipo);
        console.log('🪄 Preferencia creada en Mercado Pago:', preference.id);

        // 2️⃣ Calcular monto
        const price = {
            BASICO: 80000,
            ESTANDAR: 140000,
            PREMIUM: 180000,
        }[tipo];

        if (!price) {
            throw new Error(`❌ Tipo de aviso no válido o sin precio definido: ${tipo}`);
        }

        // 3️⃣ Crear transacción en base de datos
        const transaction = this.transactionRepository.create({
            orderId: generateOrderId('MERCADOPAGO'),
            sessionId: String(userId),
            amount: price,
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
            tipo,
            monto: price,
            preferenceId: preference.id,
        });

        // 4️⃣ Retornar datos al front
        console.log('🔗 URL de inicio de pago:', preference.init_point);
        return {
            preferenceId: preference.id,
            init_point: preference.init_point,
            sandbox_init_point: preference.sandbox_init_point,
        };
    }

    // ======================================================
    // 🔔 PROCESAR NOTIFICACIÓN (WEBHOOK)
    // ======================================================
    // ===============================
    // 📦 Servicio Mercado Pago
    // ===============================
    async procesarNotificacionPago(paymentId: string): Promise<void> {
        console.log(`📬 [Webhook] Notificación recibida de Mercado Pago → paymentId=${paymentId}`);

        try {
            // 1️⃣ Inicializar cliente Mercado Pago
            const client = new MercadoPagoConfig({
                accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
            });

            const payment = new Payment(client);
            let result: PaymentResponseExtended | null = null;

            try {
                console.log('🔍 Consultando pago en API de Mercado Pago...');
                result = (await payment.get({ id: paymentId })) as PaymentResponseExtended;
                console.log(`✅ Pago encontrado en Mercado Pago → ID ${result.id}`);
            } catch (err: any) {
                if (err?.status === 404 || err?.message?.includes('Payment not found')) {
                    console.warn(`⚠️ Pago ${paymentId} no encontrado (modo sandbox o credenciales distintas).`);

                    // 🧪 Modo test: simulación de actualización local
                    if (process.env.NODE_ENV !== 'production') {
                        const txFallback = await this.transactionRepository.findOne({
                            where: { orderId: `MP-${paymentId}` },
                        });

                        if (txFallback) {
                            txFallback.status = 'AUTHORIZED';
                            await this.transactionRepository.save(txFallback);
                            console.log(`✅ Transacción simulada como APROBADA → ${txFallback.orderId}`);
                        } else {
                            console.warn('⚠️ No se encontró transacción para simular.');
                        }
                    }
                    return;
                }
                throw err;
            }

            // 2️⃣ Extraer datos relevantes del pago
            const prefId = result?.preference_id;
            const status = result?.status?.toUpperCase() || 'UNKNOWN';
            const externalRef = result?.external_reference;
            const detail = result?.status_detail;

            console.log('📦 Datos del pago:', {
                id: result?.id,
                preference_id: prefId,
                status,
                external_reference: externalRef,
                status_detail: detail,
            });

            // 3️⃣ Buscar transacción en base de datos
            let tx: Transaction | null = null; // ✅ Tipo explícito

            if (prefId) {
                console.log('🔍 Buscando transacción por token (preference_id)...');
                tx = await this.transactionRepository.findOne({ where: { token: prefId } });
            }

            if (!tx) {
                console.warn(`⚠️ No se encontró por token. Buscando por orderId → MP-${paymentId}`);
                tx = await this.transactionRepository.findOne({
                    where: { orderId: `MP-${paymentId}` },
                });
            }

            if (!tx) {
                console.warn(`⚠️ No se encontró transacción asociada al pago ${paymentId}`);
                return;
            }

            // 4️⃣ Actualizar transacción
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

