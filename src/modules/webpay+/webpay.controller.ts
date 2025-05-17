// src/modules/webpay/webpay.controller.ts

import { Controller, Post, Body, Req, Res } from "@nestjs/common";
import { WebpayService } from "./webpay.service";
import { Request, Response } from "express";

@Controller("v1/webpay")
export class WebpayController {
    constructor(private readonly webpayService: WebpayService) { }

    /**
     * Endpoint para crear una transacción en Webpay
     * @param amount Monto de la transacción
     * @param orderId ID del pedido
     * @param sessionId ID de la sesión
     */
    @Post("/create")
    async createTransaction(
        @Body("amount") amount: number,
        @Body("orderId") orderId: string,
        @Body("sessionId") sessionId: string,
    ) {
        return this.webpayService.createTransaction(amount, orderId, sessionId);
    }

    /**
     * Endpoint para confirmar la transacción Webpay
     * @param req Objeto Request
     * @param res Objeto Response
     */
    @Post("/return")
    async confirmTransaction(@Req() req: Request, @Res() res: Response) {
        const { token_ws } = req.body;

        if (!token_ws) {
            return res.status(400).json({ message: "token_ws es requerido" });
        }

        try {
            const result = await this.webpayService.confirmTransaction(token_ws);
            return res.json(result);
        } catch (error) {
            console.error("Error en confirmación de transacción:", error.message);
            return res.status(500).json({ message: "Error al confirmar la transacción" });
        }
    }
}
