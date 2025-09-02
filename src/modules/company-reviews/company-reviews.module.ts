import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyReview } from './entities/company-review.entity';
import { CompanyReviewsService } from './company-reviews.service';
import { CompanyReviewsController } from './company-reviews.controller';
import { Empresa } from 'src/repository/business/business.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompanyReview, Empresa]),
  ],
  controllers: [CompanyReviewsController],
  providers: [CompanyReviewsService],
  exports: [CompanyReviewsService],
})
export class CompanyReviewsModule {}
