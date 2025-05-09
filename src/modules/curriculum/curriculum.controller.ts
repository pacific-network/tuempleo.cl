// import { Controller, Post, Get, UploadedFile, UseInterceptors, Req, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
// import { FileInterceptor } from '@nestjs/platform-express';
// import { diskStorage } from 'multer';
// import { extname } from 'path';
// import { AuthGuard } from '../auth/guards/auth.guards';
// import { CurriculumService } from './curriculum.service';
// import { Request } from 'express';

// @Controller('curriculum')
// export class CurriculumController {
//   constructor(private readonly curriculumService: CurriculumService) {}

//   @UseGuards(AuthGuard)
//   @Post('upload')
//   @UseInterceptors(
//     FileInterceptor('file', {
//       storage: diskStorage({
//         destination: './uploads/cv',
//         filename: (req, file, cb) => {
//           const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
//           cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));
//         },
//       }),
//       fileFilter: (req, file, cb) => {
//         const allowedMimeTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
//         if (allowedMimeTypes.includes(file.mimetype)) {
//           cb(null, true);
//         } else {
//           cb(new HttpException('Unsupported file type', HttpStatus.BAD_REQUEST), false);
//         }
//       },
//     }),
//   )
//   async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
//     const userId = req.user.id;
//     if (!file) {
//       throw new HttpException('File not provided', HttpStatus.BAD_REQUEST);
//     }
//     return await this.curriculumService.processAndSave(file, userId);
//   }

//   @UseGuards(AuthGuard)
//   @Get()
//   async getUserCVs(@Req() req: Request) {
//     const userId = req.user.id;
//     return await this.curriculumService.getUserCurriculums(userId);
//   }
// }
