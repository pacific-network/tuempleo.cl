import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyReview } from './entities/company-review.entity';
import { CompanyReviewsService } from './company-reviews.service';
import { CompanyReviewsController } from './company-reviews.controller';
import { CompanyReviewsByRutController } from './company-reviews-by-rut.controller';
import { Empresa } from 'src/repository/business/business.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompanyReview, Empresa]), // <-- agrega Empresa
  ],
  controllers: [
    CompanyReviewsController,        // /v1/companies/:companyId/reviews
    CompanyReviewsByRutController,   // /v1/empresas/:rut/reviews
  ],
  providers: [CompanyReviewsService],
  exports: [CompanyReviewsService],
})
export class CompanyReviewsModule {}
