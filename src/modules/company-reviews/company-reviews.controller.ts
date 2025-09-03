// src/modules/company-reviews/company-reviews.controller.ts
import {
  Controller, Post, Get, Param, Body, Query, Req, NotFoundException, UseGuards, UnauthorizedException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '@nestjs/passport'; // <-- importa el guard

import { CompanyReviewsService } from './company-reviews.service';
import { CreateCompanyReviewDto } from './dto/create-company-review.dto';
import { Empresa } from 'src/repository/business/business.entity';

@Controller('v1')
export class CompanyReviewsController {
  constructor(
    private readonly reviewsService: CompanyReviewsService,
    @InjectRepository(Empresa)
    private readonly empresaRepo: Repository<Empresa>,
  ) {}

  // POST /v1/empresas/:rut/reviews
  @UseGuards(AuthGuard('jwt')) // <-- protege la ruta
  @Post('empresas/:rut/reviews')
  async createByRut(
    @Param('rut') rut: string,
    @Body() dto: CreateCompanyReviewDto,
    @Req() req: any,
  ) {
    const empresa = await this.empresaRepo.findOne({ where: { rut } });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    // algunos JWT exponen userId, otros sub
    const reviewerUserId = Number(req.user?.userId ?? req.user?.sub);
    if (!Number.isFinite(reviewerUserId)) {
      throw new UnauthorizedException('Debes iniciar sesión para calificar.');
    }

    const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
    return this.reviewsService.create(empresa.id, reviewerUserId, dto, ip);
  }

  // GET /v1/empresas/:rut/reviews/summary
  @Get('empresas/:rut/reviews/summary')
  async summaryByRut(@Param('rut') rut: string) {
    const empresa = await this.empresaRepo.findOne({ where: { rut } });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');
    return this.reviewsService.summary(empresa.id);
  }

  // GET /v1/empresas/:rut/reviews
  @Get('empresas/:rut/reviews')
  async listByRut(
    @Param('rut') rut: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const empresa = await this.empresaRepo.findOne({ where: { rut } });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');
    return this.reviewsService.list(empresa.id, Number(page), Number(limit));
  }

  // POST /v1/companies/:employerUserId/reviews
  @UseGuards(AuthGuard('jwt')) // <-- protege la ruta
  @Post('companies/:employerUserId/reviews')
  async createByEmployerId(
    @Param('employerUserId') employerUserId: string,
    @Body() dto: CreateCompanyReviewDto,
    @Req() req: any,
  ) {
    const reviewerUserId = Number(req.user?.userId ?? req.user?.sub);
    if (!Number.isFinite(reviewerUserId)) {
      throw new UnauthorizedException('Debes iniciar sesión para calificar.');
    }

    const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
    return this.reviewsService.create(Number(employerUserId), reviewerUserId, dto, ip);
  }

  @Get('companies/:employerUserId/reviews/summary')
  summaryByEmployerId(@Param('employerUserId') employerUserId: string) {
    return this.reviewsService.summary(Number(employerUserId));
  }

  @Get('companies/:employerUserId/reviews')
  listByEmployerId(
    @Param('employerUserId') employerUserId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.reviewsService.list(Number(employerUserId), Number(page), Number(limit));
  }
}
