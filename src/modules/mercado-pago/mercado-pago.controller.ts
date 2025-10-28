import { Controller, Post, Body, BadRequestException, Req, UseGuards } from '@nestjs/common';
import { MercadoPagoService } from './mercado-pago.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Controller('v1/mercadopago')
export class MercadoPagoController {
    constructor(private readonly mpService: MercadoPagoService) { }

    // 🔐 Protección opcional con JWT
    @UseGuards(AuthGuard('jwt'))
    @Post('preferences')
    async createPreference(
        @Body('tipo') tipo: string,
        @Req() req: Request,
    ) {
        // ✅ Validación del tipo de aviso
        const validTypes = ['BASICA', 'ESTANDAR', 'PREMIUM'];
        if (!tipo || !validTypes.includes(tipo.toUpperCase())) {
            throw new BadRequestException(
                `Tipo de aviso inválido. Debe ser uno de: ${validTypes.join(', ')}.`,
            );
        }

        // 🔹 Obtener el ID del usuario autenticado
        const user = req.user as any;
        const userId = user?.sub ?? user?.id ?? null;

        if (!userId) {
            throw new BadRequestException('No se pudo determinar el usuario.');
        }

        // ✅ Crear preferencia y registrar transacción
        const result = await this.mpService.crearPreferenciaYRegistrar(
            tipo.toUpperCase() as 'BASICA' | 'ESTANDAR' | 'PREMIUM',
            userId,
        );

        return {
            message: 'Preferencia creada correctamente',
            ...result,
        };
    }
}
