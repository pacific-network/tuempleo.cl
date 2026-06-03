import {
    Body,
    Controller,
    Get,
    Patch,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SystemConfigService } from './system-config.service';
import { UpdateWelcomePromoDto } from './dto/update-welcome-promo.dto';
import { User } from 'src/shared/decorators/user.decorator';

@Controller()
export class SystemConfigController {
    constructor(private readonly service: SystemConfigService) { }

    // Todas las claves de configuración
    @UseGuards(AdminGuard)
    @Get('v1/admin/config')
    getAll() {
        return this.service.getAll();
    }

    // Campaña de bienvenida: estado actual
    @UseGuards(AdminGuard)
    @Get('v1/admin/config/welcome-promo')
    getWelcomePromo() {
        return this.service.getWelcomePromo();
    }

    // Campaña de bienvenida: activar/desactivar y ajustar contenido
    @UseGuards(AdminGuard)
    @Patch('v1/admin/config/welcome-promo')
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    setWelcomePromo(@Body() dto: UpdateWelcomePromoDto, @User() user: any) {
        return this.service.setWelcomePromo(dto, user.sub);
    }
}
