import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { CurriculumService } from './curriculum.service';

@Controller('v1/curriculums')
export class CurriculumController {
    constructor(private readonly curriculumService: CurriculumService) { }

    @Post(':rut')
    async createCurriculum(
        @Param('rut') rut: string,
        @Body('data') data: any,
        @Body('cv_file') cvFile: string
    ) {
        return this.curriculumService.createCurriculum(rut, data, cvFile);
    }

    @Get(':rut')
    async getCurriculumsByRut(@Param('rut') rut: string) {
        return this.curriculumService.getCurriculumsByRut(rut);
    }
}
