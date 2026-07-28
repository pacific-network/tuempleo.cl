import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../../repository/user/user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { Registro } from 'src/repository/register/register.entity';
import { Empleador } from 'src/repository/employer/employer.entity';
import { Postulante } from 'src/repository/postulant/postulant.entity';



@Module({
    imports: [
        // Empleador y Postulante son de solo lectura acá: getRutStatus necesita saber
        // qué perfiles ya tiene el dueño del RUT para habilitar el dual-rol.
        TypeOrmModule.forFeature([Usuario, Registro, Empleador, Postulante]),
    ],
    providers: [UserService],
    controllers: [UserController],
    exports: [UserService],
})
export class UserModule { }