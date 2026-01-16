import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common'
import { FormsService } from './forms.service'
import { RegisterBusinessEmployerDto } from './dto/register-business-employer.dto'
import { AuthGuard } from '@nestjs/passport';
@Controller('v1/formularios')
export class FormsController {
    constructor(
        private readonly formsService: FormsService,
    ) { }

    @UseGuards(AuthGuard('jwt'))
    @Post('register-employer')
    async register(
        @Req() req: any,
        @Body() dto: RegisterBusinessEmployerDto,
    ) {
        // 🔐 fuente de verdad: JWT
        const user = req.user as any;
        const userId = user.sub ?? user.userId ?? user.id

        return this.formsService.registerBusinessAndEmployer(
            dto,
            userId,
        )
    }
}
