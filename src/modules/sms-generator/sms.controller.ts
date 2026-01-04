import { Body, Controller, Post } from '@nestjs/common'
import { SmsService } from './sms.service'
import { SendIndividualSmsDto } from './dto/sms.dto'

@Controller('v1/sms')
export class SmsController {
    constructor(private readonly smsService: SmsService) { }
    @Post('individual')
    send(@Body() dto: SendIndividualSmsDto) {
        return this.smsService.sendIndividualSms(dto)
    }
}
