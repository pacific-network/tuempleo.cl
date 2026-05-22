import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemAlert } from 'src/repository/system-alert/system-alert.entity';
import { Usuario } from 'src/repository/user/user.entity';
import { SystemAlertsController } from './system-alerts.controller';
import { SystemAlertsService } from './system-alerts.service';

@Module({
  imports: [TypeOrmModule.forFeature([SystemAlert, Usuario])],
  providers: [SystemAlertsService],
  controllers: [SystemAlertsController],
})
export class SystemAlertsModule {}
