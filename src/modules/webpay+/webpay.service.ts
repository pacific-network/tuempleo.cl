// src/modules/webpay/webpay.service.ts

import { Injectable } from "@nestjs/common";
import { WebpayPlus, Options } from "transbank-sdk";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Transaction } from "../../repository/transaction/transaction.entity";
import { WEBPAY_CONFIG } from "./config/webpay.config";

const { commerceCode, apiKey, environment, returnUrl } = WEBPAY_CONFIG;

const webpay = new WebpayPlus.Transaction(
    new Options(commerceCode, apiKey, environment)
);

@Injectable()
export class WebpayService {
    constructor(
        @InjectRepository(Transaction)
        private transactionRepository: Repository<Transaction>,
    ) { }

    /**
     * Crea una transacción Webpay
     * @param amount Monto de la transacción
     * @param orderId ID del pedido
     * @param sessionId ID de la sesión
     * @returns URL de redirección y token
     */
    async createTransaction(amount: number, orderId: string, sessionId: string) {
        try {
            const response = await webpay.create(orderId, sessionId, amount, returnUrl);

            const transaction = this.transactionRepository.create({
                orderId,
                sessionId,
                amount,
                token: response.token,
            });

            await this.transactionRepository.save(transaction);

            return { url: response.url, token: response.token };
        } catch (error) {
            console.error("Error creando transacción:", error);
            throw new Error("Error al crear la transacción");
        }
    }

    /**
     * Confirma una transacción Webpay
     * @param token Token de la transacción
     * @returns Respuesta de Webpay
     */
    async confirmTransaction(token: string) {
        try {
            const response = await webpay.commit(token);

            const transaction = await this.transactionRepository.findOne({ where: { token } });

            if (!transaction) {
                throw new Error("Transacción no encontrada");
            }

            transaction.status = response.status;
            transaction.response_data = response;

            await this.transactionRepository.save(transaction);

            return response;
        } catch (error) {
            console.error("Error confirmando transacción:", error);

            if (error.response) {
                console.error("Error de Webpay:", error.response.data);
            }

            throw new Error("Error al confirmar la transacción");
        }
    }
}
