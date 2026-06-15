// src/modules/oauth/oauth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { Registro } from 'src/repository/register/register.entity';
import { Usuario } from 'src/repository/user/user.entity';
import { Rol } from 'src/repository/role/role.entity';

import { EncryptModule } from 'src/shared/encrypt/encrypt.module';
import { OauthController } from './oauth.controller';
import { OauthService } from './oauth.service';

import { GoogleStrategy } from 'src/modules/auth/strategies/google.strategy';

import { JwtStrategy } from 'src/modules/auth/strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Registro, Usuario, Rol]),
    EncryptModule,
    PassportModule.register({ session: false }),
    ConfigModule, // si ya es global, basta con importarlo aquí
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        // Falla al arrancar si JWT_SECRET no está definido (sin fallback inseguro)
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [OauthController],
  providers: [
    OauthService,
    // Estrategias usadas durante el flujo de OAuth:
    GoogleStrategy,
    // También exponemos JwtStrategy porque este módulo expone rutas protegidas (/oauth/user-by-email):
    JwtStrategy,
  ],
  exports: [OauthService],
})
export class OauthModule { }
