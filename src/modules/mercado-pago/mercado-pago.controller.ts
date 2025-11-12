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

@Controller('v1/mercadopago')
export class MercadoPagoController {
    constructor(private readonly mpService: MercadoPagoService) { }

    // ======================================================
    // 💳 Crear preferencia (checkout)
    // ======================================================
    // @UseGuards(AuthGuard('jwt'))
    // @Post('preferences')
    // async createPreference(
    //     @Body('tipo') tipo: string,
    //     @Req() req: Request,
    // ) {
    //     // ✅ Validación del tipo de aviso
    //     const validTypes = ['BASICO', 'ESTANDAR', 'PREMIUM'];
    //     if (!tipo || !validTypes.includes(tipo.toUpperCase())) {
    //         throw new BadRequestException(
    //             `Tipo de aviso inválido. Debe ser uno de: ${validTypes.join(', ')}.`,
    //         );
    //     }

    //     // 🔹 Obtener el ID del usuario autenticado
    //     const user = req.user as any;
    //     const userId = user?.sub ?? user?.id ?? null;

    //     if (!userId) {
    //         throw new BadRequestException('No se pudo determinar el usuario.');
    //     }

    //     // ✅ Crear preferencia y registrar transacción
    //     const result = await this.mpService.crearPreferenciaYRegistrar(
    //         tipo.toUpperCase() as 'BASICO' | 'ESTANDAR' | 'PREMIUM',
    //         userId,
    //     );

    //     return {
    //         message: 'Preferencia creada correctamente',
    //         ...result,
    //     };
    // }
    @UseGuards(AuthGuard('jwt'))
    @Post('preferences')
    async createPreference(
        @Body('tipos') tipos: string[],
        @Req() req: Request,
    ) {
        const validTypes = ['BASICO', 'ESTANDAR', 'PREMIUM'];

        // ✅ Validaciones
        if (!Array.isArray(tipos) || tipos.length === 0) {
            throw new BadRequestException('Debes enviar al menos un tipo de aviso.');
        }

        if (tipos.length > 3) {
            throw new BadRequestException('Solo puedes seleccionar hasta 3 avisos (uno de cada tipo).');
        }

        // Normalizar y validar tipos
        const tiposUpper = tipos.map(t => t.toUpperCase());
        const tiposInvalidos = tiposUpper.filter(t => !validTypes.includes(t));
        if (tiposInvalidos.length > 0) {
            throw new BadRequestException(
                `Tipo(s) inválido(s): ${tiposInvalidos.join(', ')}. Deben ser uno de: ${validTypes.join(', ')}.`,
            );
        }

        // Evitar duplicados
        const tiposUnicos = [...new Set(tiposUpper)];
        if (tiposUnicos.length !== tiposUpper.length) {
            throw new BadRequestException('No puedes repetir el mismo tipo de aviso.');
        }

        // 🔹 Obtener usuario autenticado
        const user = req.user as any;
        const userId = user?.sub ?? user?.id ?? null;

        if (!userId) {
            throw new BadRequestException('No se pudo determinar el usuario autenticado.');
        }

        // ✅ Crear preferencia y registrar transacción
        const result = await this.mpService.crearPreferenciaYRegistrar(
            tiposUnicos as ('BASICO' | 'ESTANDAR' | 'PREMIUM')[],
            userId,
        );

        return {
            message: 'Preferencia creada correctamente',
            ...result,
        };
    }

    // ======================================================
    // 🔔 Webhook de Mercado Pago (notificaciones)
    // ======================================================
    // @Post('webhook')
    // @HttpCode(HttpStatus.OK)
    // async handleWebhook(@Req() req: Request, @Res() res: Response) {
    //     try {
    //         const body = req.body;

    //         console.log('📦 Webhook Mercado Pago recibido:');
    //         console.log(JSON.stringify(body, null, 2));

    //         // Mercado Pago puede enviar distintas estructuras según el evento
    //         const topic = body?.topic || body?.type; // algunos envían 'topic', otros 'type'
    //         const paymentId = body?.data?.id ?? body?.id;

    //         if (!paymentId) {
    //             console.warn('⚠️ Webhook sin ID de pago. No se procesa.');
    //             return res.sendStatus(200);
    //         }

    //         // Solo procesamos pagos (ignora órdenes, reclamos, etc.)
    //         if (topic && topic !== 'payment') {
    //             console.log(`ℹ️ Evento ignorado (topic=${topic})`);
    //             return res.sendStatus(200);
    //         }

    //         // 🔹 Procesar pago en el servicio
    //         await this.mpService.procesarNotificacionPago(String(paymentId));

    //         // ✅ Siempre responde 200 para evitar reintentos de Mercado Pago
    //         return res.sendStatus(200);
    //     } catch (error) {
    //         console.error('❌ Error al procesar webhook de Mercado Pago:', error);
    //         return res.sendStatus(500);
    //     }
    // }
    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    async handleWebhook(@Req() req: Request, @Res() res: Response) {
        try {
            const body = req.body as any;

            console.log('📦 Webhook Mercado Pago recibido:');
            console.log(JSON.stringify(body, null, 2));

            // 🧩 Algunos eventos usan `topic`, otros `type`
            const topic = body?.topic || body?.type;
            const paymentId = body?.data?.id ?? body?.id;

            if (!paymentId) {
                console.warn('⚠️ Webhook sin ID de pago. No se procesa.');
                return res.status(200).json({ message: 'Sin ID de pago' });
            }

            // 🧩 Solo procesamos eventos de pago
            if (topic && topic !== 'payment') {
                console.log(`ℹ️ Evento ignorado (topic=${topic})`);
                return res.status(200).json({ message: 'Evento ignorado', topic });
            }

            // 🔹 Llamamos al servicio de Mercado Pago
            await this.mpService.procesarNotificacionPago(String(paymentId));

            // ✅ Siempre devolver 200 para evitar reintentos del webhook
            return res.status(200).json({ success: true, paymentId });
        } catch (error) {
            console.error('❌ Error al procesar webhook de Mercado Pago:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno procesando webhook',
            });
        }
    }


    // ======================================================
    // 🧪 Endpoint de test para verificar el webhook
    // ======================================================
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
