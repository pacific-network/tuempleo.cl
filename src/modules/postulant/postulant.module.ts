import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Postulante } from '../../repository/postulant/potulant.entity';
import { Usuario } from '../../repository/user/user.entity';
import { PostulanteService } from '../postulant/postulant.service';
import { PostulanteController } from '../postulant/postulant.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Postulante, Usuario])],
    providers: [PostulanteService],
    controllers: [PostulanteController],
    exports: [PostulanteService],
})
export class PostulanteModule { }
