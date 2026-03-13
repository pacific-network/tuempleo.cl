// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { Registro } from 'src/repository/register/register.entity';
import { Usuario } from 'src/repository/user/user.entity';
import { Rol } from 'src/repository/role/role.entity';

import { EncryptModule } from 'src/shared/encrypt/encrypt.module';
import { MailerModule } from '../mailer/mailer.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { JwtStrategy } from './strategies/jwt.strategy';
import { Postulante } from 'src/repository/postulant/postulant.entity';
import { Empleador } from 'src/repository/employer/employer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Registro, Usuario, Rol, Postulante, Empleador]),
    EncryptModule,
    MailerModule,
    PassportModule.register({ session: false }),
    // Si ya hiciste ConfigModule.forRoot({ isGlobal: true }) en AppModule, aquí basta con:
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        // ⬇️ MISMO secreto y mismo fallback que en OauthModule
        secret: config.get<string>('JWT_SECRET') || 'pacificNetwork2024',
        signOptions: { expiresIn: '3h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Aquí solo necesitas JwtStrategy; las de Google/LinkedIn las provee OauthModule
    JwtStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule { }
