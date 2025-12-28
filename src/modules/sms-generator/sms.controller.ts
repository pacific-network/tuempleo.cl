import { Body, Controller, Post } from '@nestjs/common'
import { SmsService } from './sms.service'

@Controller('v1/sms')
export class SmsController {
    constructor(private readonly smsService: SmsService) { }

    @Post('send')
    async sendIndividualSms(
        @Body()
        body: {
            number: string
            content: string
            tipo?: 'TRANSACCIONAL' | 'MARKETING' | 'SISTEMA'
        },
    ) {
        return this.smsService.sendIndividualSms({
            number: body.number,
            content: body.content,
            tipo: body.tipo,
        })
    }
}
