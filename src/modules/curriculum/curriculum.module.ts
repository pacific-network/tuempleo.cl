import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CurriculumService } from './curriculum.service';
import { CurriculumController } from './curriculum.controller';
import { CvParserService } from './cv-parser/cv-parser.service';
import { Curriculum } from 'src/repository/curriculum/curriculum.entity';
import { Postulante } from 'src/repository/postulant/postulant.entity';
import { Usuario } from 'src/repository/user/user.entity';
@Module({
  imports: [TypeOrmModule.forFeature([Curriculum, Postulante, Usuario])],
  controllers: [CurriculumController],
  providers: [CurriculumService, CvParserService],
  exports: [CurriculumService, CvParserService],
})
export class CurriculumModule { }
