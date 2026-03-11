import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';
import { BusinessModule } from '../business/business.module';
import { EmployerModule } from '../employer/employer.module';
import { PostulanteModule } from '../postulant/postulant.module';
import { Empresa } from 'src/repository/business/business.entity';
import { Empleador } from 'src/repository/employer/employer.entity';

@Module({
  controllers: [FormsController],
  providers: [FormsService],
  imports: [
    BusinessModule,
    EmployerModule,
    PostulanteModule,
    TypeOrmModule.forFeature([Empresa, Empleador]),
  ],
})
export class FormsModule { }
