import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { TypeOrmModule } from '@nestjs/typeorm'

import { SmsService } from './sms.service'
import { SmsController } from './sms.controller'
import { Sms } from '../../repository/sms/sms.entity'

@Module({
    imports: [
        HttpModule.register({
            timeout: 10000,
            maxRedirects: 3,
        }),
        TypeOrmModule.forFeature([Sms]),
    ],
    controllers: [SmsController],
    providers: [SmsService],
    exports: [SmsService],
})
export class SmsModule { }
