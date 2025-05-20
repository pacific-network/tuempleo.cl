import { Body, Controller, Post } from '@nestjs/common';
import { FormsService } from './forms.service';
import { RegisterBusinessEmployerDto } from './dto/register-business-employer.dto';

@Controller('v1/formularios')
export class FormsController {
    constructor(private readonly formsService: FormsService) { }

    @Post('register-employer')
    async register(@Body() dto: RegisterBusinessEmployerDto) {
        return this.formsService.registerBusinessAndEmployer(dto);
    }
}