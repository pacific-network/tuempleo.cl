// src/modules/company-reviews/company-reviews-by-rut.controller.ts
import { Controller, Post, Get, Param, Body, Req, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Empresa } from 'src/repository/business/business.entity';
import { CompanyReviewsService } from './company-reviews.service';
import { CreateCompanyReviewDto } from './dto/create-company-review.dto';

@Controller('v1/empresas') // <- sin :rut aquí
export class CompanyReviewsByRutController {
  constructor(
    private readonly reviews: CompanyReviewsService,
    @InjectRepository(Empresa) private readonly empresaRepo: Repository<Empresa>,
  ) {}

  @Post(':rut/reviews') // <- el :rut va en el método
  async createByRut(
    @Param('rut') rut: string,
    @Body() dto: CreateCompanyReviewDto,
    @Req() req: any,
  ) {
    const empresa = await this.empresaRepo.findOne({ where: { rut } });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    const reviewerUserId = req.user?.sub ?? null;
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip;

    // Usamos empresa.id como companyId en company_reviews
    return this.reviews.create(empresa.id, reviewerUserId, dto, ip);
  }

  @Get(':rut/reviews/summary')
  async summaryByRut(@Param('rut') rut: string) {
    const empresa = await this.empresaRepo.findOne({ where: { rut } });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');
    return this.reviews.summary(empresa.id);
  }
}
