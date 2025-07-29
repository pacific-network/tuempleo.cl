import {
    Controller,
    Post,
    Get,
    Body,
    Query,
    Req,
    Res,
    BadRequestException,
    NotFoundException,
    UseGuards,
    UnauthorizedException,
} from "@nestjs/common";
import { WebpayService } from "./webpay.service";
import { Request, Response } from "express";
import { WEBPAY_CONFIG } from "./config/webpay.config";
import { AuthGuard } from "@nestjs/passport";

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
    @UseGuards(AuthGuard("jwt"))
    async createTransaction(
        @Body("amount") amount: number,
        @Body("orderId") orderId: string,
        @Req() req: Request
    ) {
        console.log("Contenido de req.user:", req.user);

        const user = req.user as any;
        if (!user) {
            throw new UnauthorizedException("Usuario no autenticado");
        }

        // Aquí inspecciona si el ID está en otro campo
        const userId = user.sub ?? user.userId ?? user.id;

        if (!userId) {
            throw new UnauthorizedException("ID de usuario no encontrado en token");
        }

        const sessionId = `session_${userId}`;

        return this.webpayService.createTransaction(amount, orderId, sessionId);
    }
    /**
     * Endpoint para confirmar la transacción Webpay
     * Este endpoint lo llama Webpay al finalizar el pago
     */
    @Post("/return")
    async confirmTransaction(@Req() req: Request, @Res() res: Response) {
        const token_ws = req.body.token_ws || req.query.token_ws;

        if (!token_ws) {
            return res.status(400).json({ message: "token_ws es requerido" });
        }

        try {
            await this.webpayService.confirmTransaction(token_ws);

            // Redirige al HTML final del frontend
            return res.redirect(`${WEBPAY_CONFIG.finalUrl}?token_ws=${token_ws}`);
        } catch (error) {
            console.error("Error en confirmación de transacción:", error.message);
            return res.redirect(
                `${WEBPAY_CONFIG.finalUrl}?error=1&message=confirmacion_fallida`,
            );
        }
    }

    /**
     * Endpoint para obtener detalles de la transacción (consultado desde el HTML)
     */
    @Get("/detail")
    async getTransactionDetail(@Query("token_ws") token: string) {
        if (!token) {
            throw new BadRequestException("token_ws es requerido");
        }

        const transaction = await this.webpayService.findTransactionByToken(token);

        if (!transaction) {
            throw new NotFoundException("Transacción no encontrada");
        }

        return {
            orderId: transaction.orderId,
            amount: transaction.amount,
            status: transaction.status,
            response_data: transaction.response_data,
        };
    }
}
