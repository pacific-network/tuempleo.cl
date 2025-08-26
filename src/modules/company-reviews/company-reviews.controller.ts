// src/modules/company-reviews/company-reviews.controller.ts
import { Controller, Post, Get, Param, Body, Query, Req } from '@nestjs/common';
import { CompanyReviewsService } from './company-reviews.service';
import { CreateCompanyReviewDto } from './dto/create-company-review.dto';

@Controller('v1/companies/:employerUserId/reviews')
export class CompanyReviewsController {
  constructor(private readonly svc: CompanyReviewsService) {}

  @Post()
  async create(
    @Param('employerUserId') employerUserId: string,
    @Body() dto: CreateCompanyReviewDto,
    @Req() req: any,
  ) {
    const reviewerUserId = req.user?.sub ?? null;  // si usas guard de auth
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
    return this.svc.create(Number(employerUserId), reviewerUserId, dto, ip);
  }

  @Get('summary')
  summary(@Param('employerUserId') employerUserId: string) {
    return this.svc.summary(Number(employerUserId));
  }

  @Get()
  list(
    @Param('employerUserId') employerUserId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.svc.list(Number(employerUserId), Number(page), Number(limit));
  }
}
