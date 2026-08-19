import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/guards/auth.guards';
import { User } from 'src/shared/decorators/user.decorator';
import { LegalService } from './legal.service';
import { AcceptConsentDto } from './dto/accept-consent.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { Request } from 'express';

@Controller('v1/legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  // ─── Public: documentos legales vigentes ───

  @Get('documents/:type')
  async getDocument(@Param('type') type: string) {
    if (type !== 'terms' && type !== 'privacy') {
      throw new BadRequestException('Tipo debe ser "terms" o "privacy"');
    }
    return this.legalService.getCurrentDocument(type);
  }

  // ─── Consent ───

  @Post('consent')
  @UseGuards(AuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async acceptConsent(
    @User() user: any,
    @Body() dto: AcceptConsentDto,
    @Req() req: Request,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip;
    const userAgent = req.headers['user-agent'] || undefined;

    return this.legalService.recordConsent(
      user.sub,
      dto.documentType,
      dto.documentVersion,
      dto.accepted ?? true,
      ip,
      userAgent,
    );
  }

  @Get('consent/status')
  @UseGuards(AuthGuard)
  async getConsentStatus(@User() user: any) {
    return this.legalService.getConsentStatus(user.sub);
  }

  @Get('consent/history')
  @UseGuards(AuthGuard)
  async getConsentHistory(@User() user: any) {
    return this.legalService.getConsentHistory(user.sub);
  }

  // ─── Account data export ───

  @Get('account/data')
  @UseGuards(AuthGuard)
  async exportData(@User() user: any) {
    return this.legalService.exportUserData(user.sub);
  }

  // ─── Account deletion ───

  @Delete('account')
  @UseGuards(AuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  async deleteAccount(
    @User() user: any,
    @Body() dto: DeleteAccountDto,
  ) {
    return this.legalService.deleteAccount(user.sub, dto);
  }
}
