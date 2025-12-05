import { Module } from '@nestjs/common';
import { CvGeneratorService } from './cv-generator.service';
import { CvGeneratorController } from './cv-generator.controller';
import { Postulante } from 'src/repository/postulant/postulant.entity';
import { Usuario } from 'src/repository/user/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [TypeOrmModule.forFeature([Postulante, Usuario])],
    controllers: [CvGeneratorController],
    providers: [CvGeneratorService],
    exports: [CvGeneratorService], // exportamos para poder usarlo desde otros módulos si es necesario
})
export class CvGeneratorModule { }
