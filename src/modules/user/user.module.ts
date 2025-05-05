import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../../repository/user/user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { Registro } from 'src/repository/register/register.entity';



@Module({
    imports: [
        TypeOrmModule.forFeature([Usuario, Registro]),
    ],
    providers: [UserService],
    controllers: [UserController],
    exports: [UserService],
})
export class UserModule { }