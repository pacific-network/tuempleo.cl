import {
    Controller,
    Get,
    Query,
    Req,
    UseGuards,
    UnauthorizedException,
    Param,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { AuthGuard } from '@nestjs/passport';
import { PageOptionsDto } from 'src/shared/pagination/page-options.dto';
import { Request } from 'express';

@Controller('v1/transactions')
export class TransactionsController {
    constructor(private readonly transactionServices: TransactionsService) { }

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async obtenerTransacciones(
        @Req() req: Request,
        @Query() pageOptions: PageOptionsDto,
        @Query('search') search?: string,
        @Query('fechaInicio') fechaInicio?: string,
        @Query('fechaFin') fechaFin?: string,


    ) {
        // ✅ Extrae el `sub` (id del usuario) desde el token JWT
        const user = req.user as any;
        if (!user) throw new UnauthorizedException('Usuario no autenticado');

        const userId = user.sub ?? user.userId ?? user.id;


        if (!userId) {
            throw new UnauthorizedException('Usuario no autenticado');
        }

        return this.transactionServices.obtenerTransacciones(
            userId,
            pageOptions,
            { search, fechaInicio, fechaFin },
        );
    }

    @Get(':id')
    @UseGuards(AuthGuard('jwt'))
    async obtenerTransaccionPorId(@Param('id') id: string) {
        return this.transactionServices.obtenerTransaccionPorId(id);
    }
}
