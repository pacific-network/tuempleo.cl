import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
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
import { GuardadosModule } from './modules/guardados/guardados.module';
import { ApplicationModule } from './modules/applications/application.module';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { BlockBrowserMiddleware } from './middleware/block-browser.middleware';
import { SiiModule } from './modules/api-gateway/sii.module';
import { HiringProcessModule } from './modules/hiring_process/hiring_process.module';
import { CompanyReviewsModule } from './modules/company-reviews/company-reviews.module';
import { OauthModule } from './modules/oauth/oauth.module';
import { PublicationModule } from './modules/publication/publication.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { MercadoPagoModule } from './modules/mercado-pago/mercado-pago.module';
import { QuotaModule } from './modules/quota/quota.module';
import { CvGeneratorModule } from './modules/cv-geneneator/cv-generator.module';
import { SmsModule } from './modules/sms-generator/sms.module';
import { CatalogModule } from './modules/catalog/catalog.module';



@Module({
  imports: [

    ServeStaticModule.forRoot({
      rootPath: process.env.UPLOAD_PATH || join(__dirname, '..', 'upload'), // flexible
      serveRoot: '/upload',
    }),

    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot(databaseConfig),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
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
    ApplicationModule,
    SiiModule,
    HiringProcessModule,
    OauthModule,
    GuardadosModule,
    CompanyReviewsModule,
    PublicationModule,
    TransactionsModule,
    MercadoPagoModule,
    QuotaModule,
    CvGeneratorModule,
    SmsModule,
    CatalogModule




  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BlockBrowserMiddleware).forRoutes('*');
  }
}