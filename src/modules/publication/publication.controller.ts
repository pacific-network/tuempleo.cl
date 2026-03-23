import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { PublicationService, PlanKey } from './publication.service';
import {
  PublishOfferDto,
  ReservePublicationDto,
  ValidatePaidDto,
  ConfirmPublicationDto,
  UnlockViewDto,
} from './dto/publish-offer.dto';

@Controller('v1/publication')
export class PublicationController {
  constructor(private readonly service: PublicationService) {}

  // Picker + publicar
  @Get('available')
  available(@Query('employerId') employerId: string, @Query('empresaId') empresaId: string) {
    return this.service.getAvailability(Number(employerId), Number(empresaId));
  }

  @Post('ofertas')
  publish(@Body() body: PublishOfferDto) {
    return this.service.publishOffer(body);
  }

  // Paso a paso (opcional)
  @Get('policy/:planKey')
  getPolicy(@Param('planKey') planKey: PlanKey) {
    return this.service.getPolicyFor(planKey);
  }

  @Get('free/remaining')
  freeRemaining(@Query('employerId') employerId: string) {
    return this.service.getFreeRemainingThisMonth(Number(employerId));
  }

  @Post('reservations')
  reserve(@Body() body: ReservePublicationDto) {
    return this.service.reservePublication(body.employerId, body.planKey as PlanKey);
  }

  @Post('paid/validate')
  validatePaid(@Body() body: ValidatePaidDto) {
    return this.service.validatePaidAndReserve(body);
  }

  @Post('confirm')
  confirm(@Body() body: ConfirmPublicationDto) {
    return this.service.confirmPublication(body);
  }

  // Política & vistas
  @Get('offer/:ofertaId/remaining')
  remaining(@Param('ofertaId', ParseIntPipe) ofertaId: number) {
    return this.service.getOfferViewUsage(ofertaId);
  }

  @Post('offer/:ofertaId/views/unlock')
  unlock(@Param('ofertaId', ParseIntPipe) ofertaId: number, @Body() body: UnlockViewDto) {
    return this.service.unlockProfileView({ ofertaId, postulanteId: body.postulanteId });
  }

  @Get('offer/:ofertaId/policy')
  policyOfOffer(@Param('ofertaId', ParseIntPipe) ofertaId: number) {
    return this.service.getPolicySnapshotForOffer(ofertaId);
  }

  // Lista de postulantes (tope visible en FREE)
  @Get('offer/:ofertaId/postulantes')
  postulantes(@Param('ofertaId', ParseIntPipe) ofertaId: number) {
    return this.service.listPostulantes(ofertaId);
  }
}
