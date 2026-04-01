import {
    Controller,
    Post,
    Get,
    Body,
    BadRequestException,
    Req,
    Res,
    UseGuards,
    HttpCode,
    HttpStatus,
    Query,
} from '@nestjs/common';
import { MercadoPagoService } from './mercado-pago.service';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { CreatePreferenceDto } from './dto/create-preference.dto';

@Controller('v1/mercadopago')
export class MercadoPagoController {
    constructor(private readonly mpService: MercadoPagoService) { }

    // 💳 Crear preferencia (checkout)
    @UseGuards(AuthGuard('jwt'))
    @Post('preferences')
    async createPreference(
        @Body() body: CreatePreferenceDto,
        @Req() req: Request,
    ) {
        const user = req.user as any;
        const userId = user?.sub ?? user?.id ?? null;

        if (!userId) {
            throw new BadRequestException('No se pudo determinar el usuario autenticado.');
        }

        const result = await this.mpService.crearPreferenciaYRegistrar(
            body.items,
            userId,
        );

        return {
            message: 'Preferencia creada correctamente',
            ...result,
        };
    }

    // 🔔 Webhook de Mercado Pago (notificaciones)
    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    async handleWebhook(@Req() req: Request, @Res() res: Response) {
        try {
            const body = req.body as any;

            console.log('📦 Webhook Mercado Pago recibido:');
            console.log(JSON.stringify(body, null, 2));

            const topic = body?.topic || body?.type;
            const paymentId = body?.data?.id ?? body?.id;

            if (!paymentId) {
                console.warn('⚠️ Webhook sin ID de pago. No se procesa.');
                return res.status(200).json({ message: 'Sin ID de pago' });
            }

            if (topic && topic !== 'payment') {
                console.log(`ℹ️ Evento ignorado (topic=${topic})`);
                return res.status(200).json({ message: 'Evento ignorado', topic });
            }

            await this.mpService.procesarNotificacionPago(String(paymentId));

            return res.status(200).json({ success: true, paymentId });
        } catch (error) {
            console.error('❌ Error al procesar webhook de Mercado Pago:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno procesando webhook',
            });
        }
    }

    // 🧪 Endpoint de test para verificar el webhook
    @Post('webhook/test')
    async testWebhook(@Req() req: Request, @Res() res: Response) {
        console.log('🧪 Test de webhook recibido:', req.body);
        return res
            .status(200)
            .json({ message: 'Webhook test recibido OK', body: req.body });
    }

    @Get('detail')
    async getDetail(@Query('token') token: string) {
        if (!token) throw new BadRequestException('Falta el parámetro token o preference_id');

        const detail = await this.mpService.getDetailMpTransaccion(token);
        return {
            message: 'Detalle de transacción recuperado correctamente',
            data: detail,
        };
    }
}
