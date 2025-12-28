import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { TypeOrmModule } from '@nestjs/typeorm'

import { SmsService } from './sms.service'
import { SmsController } from './sms.controller'
import { Sms } from '../../repository/sms/sms.entity'
import { PacificSmsProvider } from './providers/sms-provider'

@Module({
    imports: [
        HttpModule.register({
            timeout: 10000,
            maxRedirects: 3,
        }),
        TypeOrmModule.forFeature([Sms]),
    ],
    controllers: [SmsController],
    providers: [
        SmsService,

        // 🔌 Provider real
        PacificSmsProvider,

        // 🧠 Alias por contrato
        {
            provide: 'SmsProvider',
            useExisting: PacificSmsProvider,
        },
    ],
    exports: [SmsService],
})
export class SmsModule { }
