import { Body, Controller, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { SmsService } from './sms.service'
import { SendIndividualSmsDto } from './dto/sms.dto'

@Controller('v1/sms')
export class SmsController {
    constructor(private readonly smsService: SmsService) { }
    @Post('individual')
    @Throttle({ default: { ttl: 60_000, limit: 3 } })
    send(@Body() dto: SendIndividualSmsDto) {
        return this.smsService.sendIndividualSms(dto)
    }
}
