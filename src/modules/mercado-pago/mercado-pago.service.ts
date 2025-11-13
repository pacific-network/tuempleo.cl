import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, PaymentGateway } from 'src/repository/transaction/transaction.entity';
import { crearPreferenciaPago } from './const/tipo_avisos.preferences';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { PaymentResponseExtended } from './interfaces/payment-response.interface';
import { generateOrderId } from 'src/shared/generator/order-id.generator';
import { StockService } from '../stock/stock.service';
import { Empleador } from 'src/repository/employer/employer.entity';


type ItemComprado = {
    tipo: 'BASICO' | 'ESTANDAR' | 'PREMIUM';
    cantidad: number;
    precio: number;
};
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

    //         // 1️⃣ Buscar por preference_id si existe
    //         if (prefId) {
    //             tx = await this.transactionRepository.findOne({ where: { token: prefId } });
    //             if (tx) console.log(`✅ Transacción encontrada por token (${prefId})`);
    //         }

    //         // 2️⃣ Si no existe preference_id, buscar la más reciente pendiente
    //         if (!tx) {
    //             tx = await this.transactionRepository.findOne({
    //                 where: { status: 'PENDING', origen: PaymentGateway.MERCADOPAGO },
    //                 order: { createdAt: 'DESC' },
    //             });
    //             if (tx)
    //                 console.log(
    //                     `⚠️ preference_id vacío → usando transacción pendiente más reciente: ${tx.orderId}`,
    //                 );
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

            const prefId = result.preference_id;
            const status = result.status?.toUpperCase() || 'UNKNOWN';

            console.log('📦 Datos del pago recibido:', {
                id: result.id,
                status,
                preference_id: prefId,
                metadata: result.metadata,
                add_info_items: result.additional_info?.items,
            });

            // ===============================
            // 🔍 Buscar transacción
            // ===============================
            let tx: Transaction | null = null;

            // Intentar por preference_id
            if (prefId) {
                tx = await this.transactionRepository.findOne({ where: { token: prefId } });
                if (tx) console.log(`✅ Transacción encontrada por token (${prefId})`);
            }

            // Fallback: última pendiente
            if (!tx) {
                tx = await this.transactionRepository.findOne({
                    where: { status: 'PENDING', origen: PaymentGateway.MERCADOPAGO },
                    order: { createdAt: 'DESC' },
                });
                if (tx) console.log(`⚠️ preference_id vacío → usando la última transacción pendiente: ${tx.orderId}`);
            }

            if (!tx) {
                console.warn(`⚠️ No se encontró transacción asociada al pago ${paymentId}`);
                return;
            }

            console.log(`🧾 Transacción encontrada: ${tx.orderId}`);

            // ===============================
            // 🧾 Actualizar estado de transacción
            // ===============================
            tx.status = status;
            tx.response_data = result;
            await this.transactionRepository.save(tx);

            // ===============================
            // 🚨 Procesar solo si está APROBADO
            // ===============================
            if (!(status === 'APPROVED' || status === 'AUTHORIZED')) {
                console.warn(`⚠️ Pago ${paymentId} no aprobado (estado: ${status}).`);
                return;
            }

            // ===============================
            // 👤 Obtener empresa del usuario
            // ===============================
            const userId = Number(tx.sessionId);

            const empleador = await this.empleadorRepository.findOne({
                where: { usuario: { id: userId } },
                relations: ['empresa'],
            });

            if (!empleador?.empresa?.id) {
                console.warn(`⚠️ Usuario ${userId} no tiene empresa asociada. Stock NO actualizado.`);
                return;
            }

            const empresaId = empleador.empresa.id;

            // ===============================
            // 🧩 RECONSTRUIR ITEMS COMPRADOS
            // ===============================
            let items: ItemComprado[] = [];

            // 1️⃣ Intentar desde additional_info.items
            if (result.additional_info?.items?.length > 0) {
                console.log(`📦 Items obtenidos desde additional_info (${result.additional_info.items.length})`);
                items = result.additional_info.items.map(it => ({
                    tipo: it.id || it.title,
                    cantidad: it.quantity || 1,
                    precio: it.unit_price || 0,
                }));
            }
            // 2️⃣ Fallback: desde metadata
            else if (result.metadata?.tipos?.length > 0) {
                console.log(`📦 Items obtenidos desde metadata (${result.metadata.tipos.length})`);
                items = result.metadata.tipos.map((tipo: string) => {
                    const pricingMap: any = {
                        BASICO: 80000,
                        ESTANDAR: 140000,
                        PREMIUM: 180000,
                    };

                    return {
                        tipo,
                        cantidad: 1,
                        precio: pricingMap[tipo] || 0,
                    };
                });
            }

            // 3️⃣ Falla crítica
            if (items.length === 0) {
                console.error(`❌ No se encontraron items ni en additional_info ni en metadata.`);
                return;
            }

            // ===============================
            // 📝 Insertar transaction_items
            // ===============================
            console.log(`🧩 Insertando ${items.length} items en transaction_items...`);

            for (const item of items) {
                const precioUnitario = item.precio;
                const subtotal = item.precio * item.cantidad;

                await this.transactionRepository.query(
                    `INSERT INTO transaction_items 
                    (transaction_id, tipoAviso, cantidad, precioUnitario, subtotal)
                    VALUES (?, ?, ?, ?, ?)`,
                    [tx.id, item.tipo, item.cantidad, precioUnitario, subtotal]
                );
            }

            // ===============================
            // 📦 Procesar stock igual que Webpay
            // ===============================
            await this.stockService.processTransactionStock(tx.id, empresaId);

            console.log(`✅ Stock actualizado correctamente para empresa ${empresaId} (orden ${tx.orderId})`);

            console.log(`🎉 Compra procesada correctamente → ${tx.orderId}`);
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
    async confirmarPagoMercadoPago(paymentId: string): Promise<void> {
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

            const prefId = result.preference_id;
            const status = result.status?.toUpperCase() || 'UNKNOWN';

            // Buscar transacción por token o la más reciente pendiente
            let tx = await this.transactionRepository.findOne({ where: { token: prefId } });
            if (!tx) {
                tx = await this.transactionRepository.findOne({
                    where: { status: 'PENDING', origen: PaymentGateway.MERCADOPAGO },
                    order: { createdAt: 'DESC' },
                });
            }

            if (!tx) {
                console.warn(`⚠️ No se encontró transacción asociada al pago ${paymentId}`);
                return;
            }

            console.log(`🧾 Transacción encontrada: ${tx.orderId}`);

            // ✅ Actualizar estado y respuesta
            tx.status = status;
            tx.response_data = result;
            await this.transactionRepository.save(tx);

            // Solo continuar si está autorizada
            if (status === 'APPROVED' || status === 'AUTHORIZED') {
                const userId = Number(tx.sessionId);

                // Buscar empresa del usuario
                const empleador = await this.empleadorRepository.findOne({
                    where: { usuario: { id: userId } },
                    relations: ['empresa'],
                });

                if (!empleador?.empresa?.id) {
                    console.warn(`⚠️ Usuario ${userId} no tiene empresa asociada (stock no actualizado).`);
                    return;
                }

                const empresaId = empleador.empresa.id;

                // 🧾 Registrar items si aún no existen
                const existingItems = await this.transactionRepository.query(
                    `SELECT COUNT(*) as count FROM transaction_items WHERE transaction_id = ?`,
                    [tx.id]
                );

                if (existingItems[0].count == 0 && result.additional_info?.items) {
                    console.log(`🧩 Insertando ${result.additional_info.items.length} items para la transacción ${tx.id}`);
                    for (const item of result.additional_info.items) {
                        await this.transactionRepository.query(
                            `INSERT INTO transaction_items (transaction_id, tipoAviso, cantidad, precio)
                             VALUES (?, ?, ?, ?)`,
                            [tx.id, item.title || item.id, item.quantity || 1, item.unit_price || 0]
                        );
                    }
                }

                // 🔁 Procesar stock
                await this.stockService.processTransactionStock(tx.id, empresaId);

                console.log(`✅ Stock actualizado correctamente para empresa ${empresaId} (orden ${tx.orderId})`);
            }

            console.log(`✅ Transacción ${tx.orderId} actualizada correctamente → ${status}`);
        } catch (error) {
            console.error('❌ Error procesando notificación de Mercado Pago:', error);
        }
    }

}

