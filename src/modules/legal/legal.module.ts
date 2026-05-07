import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LegalDocument } from 'src/repository/legal/legal-document.entity';
import { ConsentRecord } from 'src/repository/legal/consent-record.entity';
import { AccountDeletionLog } from 'src/repository/legal/account-deletion-log.entity';
import { Usuario } from 'src/repository/user/user.entity';
import { Postulante } from 'src/repository/postulant/postulant.entity';
import { Empleador } from 'src/repository/employer/employer.entity';
import { Curriculum } from 'src/repository/curriculum/curriculum.entity';

import { EncryptModule } from 'src/shared/encrypt/encrypt.module';
import { LegalService } from './legal.service';
import { LegalController } from './legal.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LegalDocument,
      ConsentRecord,
      AccountDeletionLog,
      Usuario,
      Postulante,
      Empleador,
      Curriculum,
    ]),
    EncryptModule,
  ],
  controllers: [LegalController],
  providers: [LegalService],
  exports: [LegalService],
})
export class LegalModule {}
