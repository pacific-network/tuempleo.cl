import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { WebpayPlus, Options, Environment } from "transbank-sdk"; // Importa Environment
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Transaction } from "../../repository/transaction/transaction.entity";
import { WEBPAY_CONFIG } from "./config/webpay.config";
import { Usuario } from "src/repository/user/user.entity";

const { commerceCode, apiKey, environment: envString, returnUrl } = WEBPAY_CONFIG;

// Mapea el string del config al enum que usa la SDK
const environment =
    envString === "INTEGRACION" ? Environment.Integration : Environment.Production;

// Instancia del SDK de Transbank con el environment correcto
const webpay = new WebpayPlus.Transaction(
    new Options(commerceCode, apiKey, environment)
);

@Injectable()
export class WebpayService {
    constructor(
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
        @InjectRepository(Usuario)
        private readonly usuarioRepository: Repository<Usuario>,
    ) { }


    //Obtener el usuario primero: 

    async getUserById(userId: number): Promise<Usuario> {
        const user = await this.usuarioRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new InternalServerErrorException("Usuario no encontrado");
        }
        return user;
    }

    /**
     * Crea una transacción Webpay
     */
    async createTransaction(amount: number, orderId: string, sessionId: string) {
        console.log("[WebpayService] createTransaction called with:", { amount, orderId, sessionId });
        console.log("[WebpayService] Using returnUrl:", returnUrl);

        try {
            const response = await webpay.create(orderId, sessionId, amount, returnUrl);

            console.log("[WebpayService] Transbank response:", response);

            const transaction = this.transactionRepository.create({
                orderId,
                sessionId,//user id 
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
        // ya la crea bien, pero el sesion id debe ser el user id del token y debemos caputrar el estado 
        //         # id, orderId, sessionId, amount, token, status, response_data, created_at
        // '14f31d01-8b95-4e29-a19c-0d0bea5da600', '123456789', 'session_123', '5000', '01ab7967e81c116c2b6986b5471e620d376999384b83568f41fd3f515fc0b71c', 'CREATED', NULL, '2025-07-10 21:23:06.613869'

    }

    /**
     * Confirma una transacción luego del pago en Webpay
     */
    async confirmTransaction(token: string) {
        console.log("[WebpayService] confirmTransaction called with token:", token);

        try {
            const response = await webpay.commit(token);

            console.log("[WebpayService] Commit response:", response);

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
     */
    async findTransactionByToken(token: string) {
        console.log("[WebpayService] findTransactionByToken called with token:", token);
        return await this.transactionRepository.findOne({ where: { token } });
    }




}
