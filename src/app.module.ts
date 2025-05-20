import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database';
import { UserModule } from './modules/user/user.module';
import { EncryptModule } from './shared/encrypt/encrypt.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { join } from 'path';
import { RoleModule } from './modules/role/role.module';
import { PostulanteModule } from './modules/postulant/postulant.module';
import { CurriculumModule } from './modules/curriculum/curriculum.module';
import { PlansModule } from './modules/plans/plans.module';
import { BusinessModule } from './modules/business/business.module';
import { WebpayModule } from './modules/webpay+/webpay.module';
import { FormsModule } from './modules/forms/forms.module';
import { OfertaModule } from './modules/oferta/oferta.module';
import { ApplicationModule } from './modules/applications/application.module';




@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot(databaseConfig),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
      global: true
    }),

    // 🔽 Resto de módulos que dependen de JWT_SECRET o ConfigService
    EncryptModule,
    AuthModule,
    UserModule,
    RoleModule,
    PostulanteModule,
    CurriculumModule,
    PlansModule,
    BusinessModule,
    WebpayModule,
    FormsModule,
    OfertaModule,
    ApplicationModule



  ],
})
export class AppModule { }