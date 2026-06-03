import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthGuard } from '../auth/guards/auth.guards';
import { CuponService } from './cupon.service';
import { CreateCuponDto } from './dto/create-cupon.dto';
import { CanjearCuponDto } from './dto/canjear-cupon.dto';
import { User } from 'src/shared/decorators/user.decorator';

@Controller()
export class CuponController {
    constructor(private readonly service: CuponService) { }

    // ─────────────────────────────────────────
    // ADMIN: gestión de cupones
    // ─────────────────────────────────────────

    @UseGuards(AdminGuard)
    @Post('v1/admin/cupones')
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    create(@Body() dto: CreateCuponDto, @User() user: any) {
        return this.service.crear(dto, user.sub);
    }

    @UseGuards(AdminGuard)
    @Get('v1/admin/cupones')
    findAll(@Query('page') page = '1', @Query('limit') limit = '20') {
        return this.service.listar(Number(page), Number(limit));
    }

    @UseGuards(AdminGuard)
    @Get('v1/admin/cupones/:id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.service.obtener(id);
    }

    @UseGuards(AdminGuard)
    @Patch('v1/admin/cupones/:id/toggle')
    toggle(@Param('id', ParseIntPipe) id: number) {
        return this.service.toggle(id);
    }

    // ─────────────────────────────────────────
    // EMPRESA: canje de cupón
    // ─────────────────────────────────────────

    @UseGuards(AuthGuard)
    @Post('v1/cupones/canjear')
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    canjear(@Body() dto: CanjearCuponDto, @User() user: any) {
        return this.service.canjear(dto.codigo, user.sub);
    }
}
