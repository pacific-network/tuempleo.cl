import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicationController } from './publication.controller';
import { PublicationService } from './publication.service';
import { EmployerPlanLedger } from './entities/employer-plan-ledger.entity';
import { OfferPolicy } from './entities/offer-policy.entity';
import { OfferProfileView } from './entities/offer-profile-view.entity';
import { PaymentIntent } from './entities/payment-intent.entity';
import { PaymentTxn } from './entities/payment-txn.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmployerPlanLedger,
      OfferPolicy,
      OfferProfileView,
      PaymentIntent,
      PaymentTxn,
    ]),
  ],
  controllers: [PublicationController],
  providers: [PublicationService],
  exports: [PublicationService],
})
export class PublicationModule {}
