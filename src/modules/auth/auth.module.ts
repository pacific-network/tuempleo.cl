//src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { EncryptModule } from 'src/shared/encrypt/encrypt.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Registro } from 'src/repository/register/register.entity';
import { Usuario } from 'src/repository/user/user.entity';
import { Rol } from 'src/repository/role/role.entity';
import { PassportModule } from '@nestjs/passport';
import { LinkedInStrategy } from '../auth/strategies/linkedin.strategy'; // Ajusta la ruta según corresponda
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
    imports: [
        TypeOrmModule.forFeature([Registro, Usuario, Rol]),
        UserModule,
        EncryptModule,
        PassportModule.register({ session: false }), // Importar PassportModule
        ConfigModule.forRoot({ isGlobal: true }), // Configura ConfigModule global si quieres
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '3h' },
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [AuthService, LinkedInStrategy, GoogleStrategy], // Registrar la estrategia aquí
    controllers: [AuthController],
    exports: [AuthService],
})
export class AuthModule { }
