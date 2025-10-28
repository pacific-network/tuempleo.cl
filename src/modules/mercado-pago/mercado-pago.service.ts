import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, PaymentGateway } from 'src/repository/transaction/transaction.entity';
import { crearPreferenciaPago } from './const/tipo_avisos.preferences';

@Injectable()
export class MercadoPagoService {
    constructor(
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
    ) { }

    async crearPreferenciaYRegistrar(
        tipo: 'BASICA' | 'ESTANDAR' | 'PREMIUM',
        userId: number,
    ) {
        // 1️⃣ Crear preferencia
        const preference = await crearPreferenciaPago(tipo);

        // 2️⃣ Calcular monto del aviso
        const price = {
            BASICA: 80000,
            ESTANDAR: 140000,
            PREMIUM: 180000,
        }[tipo];

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
}
