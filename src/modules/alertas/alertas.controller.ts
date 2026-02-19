import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AlertasService } from './alertas.service';
import { CreateAlertaDto } from './dto/create-alerta.dto';
import { AuthGuard } from '../auth/guards/auth.guards';
import { User } from 'src/shared/decorators/user.decorator';

@UseGuards(AuthGuard)
@Controller('v1/candidato/alertas')
export class AlertasController {
  constructor(private readonly alertasService: AlertasService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreateAlertaDto, @User() user: any) {
    return this.alertasService.create(user.sub, dto);
  }

  @Get()
  findAll(@User() user: any) {
    return this.alertasService.findAll(user.sub);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @User() user: any) {
    return this.alertasService.remove(user.sub, id);
  }

  @Patch(':id/toggle')
  toggle(@Param('id', ParseIntPipe) id: number, @User() user: any) {
    return this.alertasService.toggle(user.sub, id);
  }
}
