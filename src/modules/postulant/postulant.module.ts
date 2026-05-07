import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Postulante } from '../../repository/postulant/postulant.entity';
import { Usuario } from '../../repository/user/user.entity';
import { PostulanteService } from '../postulant/postulant.service';
import { PostulanteController } from '../postulant/postulant.controller';
import { CurriculumModule } from '../curriculum/curriculum.module';

@Module({
    imports: [TypeOrmModule.forFeature([Postulante, Usuario]), CurriculumModule],
    providers: [PostulanteService],
    controllers: [PostulanteController],
    exports: [PostulanteService],
})
export class PostulanteModule { }
