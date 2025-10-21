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
} from '@nestjs/common';
import { WebpayService } from './webpay.service';
import { Request, Response } from 'express';
import { WEBPAY_CONFIG } from './config/webpay.config';
import { AuthGuard } from '@nestjs/passport';
import { PageOptionsDto } from 'src/shared/pagination/page-options.dto';

@Controller('v1/webpay')
export class WebpayController {
    constructor(private readonly webpayService: WebpayService) { }

    @Post('/create-pending')
    @UseGuards(AuthGuard('jwt'))
    async createPendingTransaction(
        @Body() body: any,
        @Req() req: Request,
    ) {
        const user = req.user as any;
        if (!user) throw new UnauthorizedException('Usuario no autenticado');

        const userId = user.sub ?? user.userId ?? user.id;
        const { empresaId, items } = body;

        // ✅ Validaciones más seguras
        if (!empresaId || isNaN(Number(empresaId))) {
            throw new BadRequestException('empresaId inválido o ausente');
        }

        if (!Array.isArray(items) || items.length === 0) {
            throw new BadRequestException('items vacío o inválido');
        }

        console.log(`🧾 Creando transacción pendiente:
      - Usuario ID: ${userId}
      - Empresa ID: ${empresaId}
      - Ítems: ${items.length}`);

        // ✅ Llamada al servicio
        return this.webpayService.createPendingTransaction(
            Number(empresaId),
            userId,
            items,
        );
    }

    // ==============================================================
    // 1️⃣ Crear transacción Webpay (inicio del pago)
    // ==============================================================
    @Post('/create')
    @UseGuards(AuthGuard('jwt'))
    async createTransaction(
        @Body('amount') amount: number,
        @Body('orderId') orderId: string,
        @Req() req: Request,
    ) {
        const user = req.user as any;
        if (!user) throw new UnauthorizedException('Usuario no autenticado');

        const userId = user.sub ?? user.userId ?? user.id;
        if (!userId) throw new UnauthorizedException('ID de usuario no encontrado en token');

        const sessionId = `${userId}`; // se guarda como string (userId)

        console.log(`💳 Creando transacción Webpay:
      - Usuario ID: ${userId}
      - Orden: ${orderId}
      - Monto: ${amount}`);

        return this.webpayService.createTransaction(amount, orderId, sessionId);
    }

    // ==============================================================
    // 2️⃣ Confirmar transacción Webpay (callback desde Transbank)
    // ==============================================================
    @Get('/return')
    async confirmTransaction(@Req() req: Request, @Res() res: Response) {
        // Caso cancelado por el usuario
        const tbkToken = req.query.TBK_TOKEN as string | undefined;
        if (tbkToken) {
            const orden = (req.query.TBK_ORDEN_COMPRA as string) || 'N/A';
            console.warn(`⚠️ Pago cancelado por el usuario. Orden: ${orden}`);
            return res.redirect(
                `${WEBPAY_CONFIG.finalUrl}?error=1&reason=aborted&order=${encodeURIComponent(orden)}`,
            );
        }

        // Caso normal con token_ws
        let token_ws = req.query.token_ws;
        if (Array.isArray(token_ws)) token_ws = token_ws[0];
        if (typeof token_ws !== 'string') {
            return res.status(400).json({ message: 'token_ws debe ser un string' });
        }

        try {
            const response = await this.webpayService.confirmTransaction(token_ws);
            console.log(`✅ Transacción confirmada correctamente: ${token_ws}`);
            return res.redirect(`${WEBPAY_CONFIG.finalUrl}?token_ws=${token_ws}`);
        } catch (error) {
            console.error('❌ Error confirmando transacción:', error);
            return res.redirect(
                `${WEBPAY_CONFIG.finalUrl}?error=1&message=confirmacion_fallida`,
            );
        }
    }

    // ==============================================================
    // 3️⃣ Obtener detalle de transacción (consultado desde frontend)
    // ==============================================================
    @Get('/detail')
    async getTransactionDetail(@Query('token_ws') token: string) {
        if (!token) throw new BadRequestException('token_ws es requerido');

        const transaction = await this.webpayService.findTransactionByToken(token);
        if (!transaction) throw new NotFoundException('Transacción no encontrada');

        return {
            orderId: transaction.orderId,
            amount: transaction.amount,
            status: transaction.status,
            response_data: transaction.response_data,
        };
    }

    // ==============================================================
    // 4️⃣ Listar transacciones (administración / auditoría)
    // ==============================================================
    @Get()
    async obtenerTransacciones(
        @Query() pageOptions: PageOptionsDto,
        @Query('fechaInicio') fechaInicio?: string,
        @Query('fechaFin') fechaFin?: string,
    ) {
        return this.webpayService.obtenerTransacciones(pageOptions, fechaInicio, fechaFin);
    }
}
