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
    async procesarNotificacionPago(paymentId: string): Promise<void> {
        console.log(`📬 [Webhook] Notificación recibida de Mercado Pago. paymentId=${paymentId}`);

        try {
            // Inicializar cliente Mercado Pago
            const client = new MercadoPagoConfig({
                accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
            });

            const payment = new Payment(client);

            let result: PaymentResponseExtended | null = null;

            try {
                console.log('🔍 Consultando pago en API de Mercado Pago...');
                result = (await payment.get({ id: paymentId })) as PaymentResponseExtended;
                console.log('✅ Pago encontrado:', result.id);
            } catch (err: any) {
                if (err?.status === 404 || err?.message?.includes('Payment not found')) {
                    console.warn(`⚠️ Pago ${paymentId} no encontrado (modo sandbox o credenciales distintas).`);

                    if (process.env.NODE_ENV !== 'production') {
                        console.log('🧪 Modo test: simulando actualización local.');

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

            // 🧾 Extraer información relevante
            const prefId = result.preference_id;
            const status = result.status?.toUpperCase() || 'UNKNOWN';
            const externalRef = result.external_reference;

            console.log('📦 Datos del pago:', {
                preference_id: prefId,
                status,
                external_reference: externalRef,
            });

            if (!prefId) {
                console.warn(`⚠️ No se recibió preference_id en el pago ${paymentId}`);
                return;
            }

            // Buscar transacción correspondiente
            console.log('🔍 Buscando transacción asociada en base de datos...');
            const tx = await this.transactionRepository.findOne({ where: { token: prefId } });

            if (!tx) {
                console.warn(`⚠️ No se encontró transacción con token: ${prefId}`);
                return;
            }

            console.log('🧾 Transacción encontrada:', {
                orderId: tx.orderId,
                statusAnterior: tx.status,
            });

            // Actualizar estado y guardar
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
