import {
  Body,
  Controller,
  Delete,
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
import { SystemAlertsService } from './system-alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { User } from 'src/shared/decorators/user.decorator';

@Controller()
export class SystemAlertsController {
  constructor(private readonly service: SystemAlertsService) {}

  // ─────────────────────────────────────────
  // ADMIN: CRUD de alertas
  // ─────────────────────────────────────────

  @UseGuards(AdminGuard)
  @Post('v1/admin/alertas')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreateAlertDto, @User() user: any) {
    return this.service.create(user.sub, dto);
  }

  @UseGuards(AdminGuard)
  @Get('v1/admin/alertas')
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.service.findAll(Number(page), Number(limit));
  }

  @UseGuards(AdminGuard)
  @Get('v1/admin/alertas/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @UseGuards(AdminGuard)
  @Patch('v1/admin/alertas/:id')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAlertDto,
  ) {
    return this.service.update(id, dto);
  }

  @UseGuards(AdminGuard)
  @Patch('v1/admin/alertas/:id/toggle')
  toggle(@Param('id', ParseIntPipe) id: number) {
    return this.service.toggle(id);
  }

  @UseGuards(AdminGuard)
  @Delete('v1/admin/alertas/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  // ─────────────────────────────────────────
  // USUARIO: popup al iniciar sesión
  // ─────────────────────────────────────────

  @UseGuards(AuthGuard)
  @Get('v1/alertas/activas')
  activas(@User() user: any) {
    return this.service.findActivasForUser({
      context: user?.context,
      isAdmin: user?.isAdmin,
    });
  }
}
