import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { WebpayPlus, Options } from "transbank-sdk";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Transaction } from "../../repository/transaction/transaction.entity";
import { WEBPAY_CONFIG } from "./config/webpay.config";

const { commerceCode, apiKey, environment, returnUrl } = WEBPAY_CONFIG;

// Instancia del SDK de Transbank
const webpay = new WebpayPlus.Transaction(
    new Options(commerceCode, apiKey, environment)
);

@Injectable()
export class WebpayService {
    constructor(
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
    ) { }

    /**
     * Crea una transacción Webpay
     * @param amount Monto total de la transacción
     * @param orderId ID del pedido/compra (único)
     * @param sessionId ID de la sesión del cliente
     * @returns Objeto con URL y token para redireccionar a Webpay
     */
    async createTransaction(amount: number, orderId: string, sessionId: string) {
        try {
            const response = await webpay.create(orderId, sessionId, amount, returnUrl);

            const transaction = this.transactionRepository.create({
                orderId,
                sessionId,
                amount,
                token: response.token,
                status: 'CREATED',
            });

            await this.transactionRepository.save(transaction);

            return {
                url: response.url,
                token: response.token,
            };
        } catch (error) {
            console.error("Error creando transacción Webpay:", error);
            throw new InternalServerErrorException("No se pudo crear la transacción");
        }
    }

    /**
     * Confirma una transacción luego del pago en Webpay
     * @param token Token de la transacción (token_ws)
     * @returns Respuesta de Webpay con el estado
     */
    async confirmTransaction(token: string) {
        try {
            const response = await webpay.commit(token);

            const transaction = await this.transactionRepository.findOne({
                where: { token },
            });

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
                console.error("Respuesta de Webpay:", error.response.data);
            }

            throw new InternalServerErrorException("No se pudo confirmar la transacción");
        }
    }

    /**
     * Devuelve una transacción por token (usado por el HTML de resultado)
     * @param token Token entregado por Webpay
     * @returns Objeto con datos de la transacción
     */
    async findTransactionByToken(token: string) {
        return await this.transactionRepository.findOne({ where: { token } });
    }
}
