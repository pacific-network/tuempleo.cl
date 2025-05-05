import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database';
import { UserModule } from './modules/user/user.module';
import { EncryptModule } from './shared/encrypt/encrypt.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { join } from 'path';




@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '..', '..', '.env'), // <- ruta absoluta correcta
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

  ],
})
export class AppModule { }