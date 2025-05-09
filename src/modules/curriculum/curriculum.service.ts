// import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { Curriculum } from '../../repository/curriculum/curriculum.entity';
// import { Usuario } from '../../repository/user/user.entity';
// import * as fs from 'fs';
// import * as path from 'path';
// import { File as MulterFile } from 'multer';

// @Injectable()
// export class CurriculumService {
//   constructor(
//     @InjectRepository(Curriculum)
//     private curriculumRepository: Repository<Curriculum>,

//     @InjectRepository(Usuario)
//     private userRepository: Repository<Usuario>,
//   ) {}

//   async processAndSave(file: MulterFile, userId: number) {
//     const user = await this.userRepository.findOne({ where: { id: userId } });

//     if (!user) {
//       throw new HttpException('User not found', HttpStatus.NOT_FOUND);
//     }

//     const filePath = path.join('uploads/cv', file.filename);

//     const newCV = this.curriculumRepository.create({
//       cv_file: filePath,
//     });

//     return await this.curriculumRepository.save(newCV);
//   }

//   async getUserCurriculums(userId: number) {
//     const user = await this.userRepository.findOne({ where: { id: userId } });

//     if (!user) {
//       throw new HttpException('User not found', HttpStatus.NOT_FOUND);
//     }

//     return await this.curriculumRepository.find({ where: { rut: user.rut } });
//   }
// }
