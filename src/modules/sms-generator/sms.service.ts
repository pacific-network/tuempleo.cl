// src/sms/services/sms.service.ts

import {
    Inject,
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { Sms } from '../../repository/sms/sms.entity'
import { SendIndividualSmsDto } from './dto/sms.dto'
import { SmsProvider } from './providers/sms-provider.interface'

@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name)

    constructor(
        @InjectRepository(Sms)
        private readonly smsRepo: Repository<Sms>,

        // ✅ contrato, no implementación
        @Inject('SmsProvider')
        private readonly smsProvider: SmsProvider,
    ) { }

    async sendIndividualSms(dto: SendIndividualSmsDto) {
        const result = await this.smsProvider.sendSms({
            number: dto.number,
            content: dto.content,
        })

        // 👇 respuesta inmediata y correcta
        const response = {
            id_sms: result.externalId,
            number: result.number,
            status: result.status,
        }

        // 👇 todo lo demás es secundario
        try {
            await this.smsRepo.save({
                number: dto.number,
                content: dto.content,
                externalSmsId: result.externalId,
                status: result.status,
                tipo: dto.tipo,
                provider: 'PACIFIC',
            })
        } catch (err) {
            this.logger.error(
                'SMS enviado pero fallo persistencia',
                err,
            )
            // NO throw
        }

        return response
    }

}
