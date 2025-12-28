import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { firstValueFrom } from 'rxjs'

import { Sms } from '../../repository/sms/sms.entity'

type SmsTipo = 'TRANSACCIONAL' | 'MARKETING' | 'SISTEMA'

@Injectable()
export class SmsService {
    // 🔒 CONFIGURACIÓN FIJA (middleware)
    private readonly EMPRESA_SERVICE_ID = 1

    private readonly API_URL =
        'https://api.pacificnetwork.cl:3000/v2/messages/send'

    private readonly API_KEY =
        '19a1bd984b28d72d30337f639bbdb6590c49a552eecc6c68c0651c5ba4ee9a8c'

    constructor(
        private readonly http: HttpService,
        @InjectRepository(Sms)
        private readonly smsRepo: Repository<Sms>,
    ) { }

    // ===============================
    // ENVÍO SMS INDIVIDUAL
    // ===============================
    async sendIndividualSms(params: {
        number: string
        content: string
        tipo?: SmsTipo
    }) {
        const { number, content, tipo = 'TRANSACCIONAL' } = params

        try {
            const payload = {
                empresa_service_id: this.EMPRESA_SERVICE_ID,
                number,
                sms_content: content,
            }

            const response = await firstValueFrom(
                this.http.post(this.API_URL, payload, {
                    headers: {
                        'x-api-key': this.API_KEY,
                        'Content-Type': 'application/json',
                    },
                    timeout: 10000,
                }),
            )

            await this.smsRepo.save({
                number,
                content,
                externalSmsId: response.data.id_sms,
                status: response.data.status,
                tipo,
            })

            return {
                id_sms: response.data.id_sms,
                number: response.data.number,
                status: response.data.status,
            }
        } catch (error) {
            console.error(
                '[SMS ERROR]',
                error?.response?.data || error.message,
            )

            await this.smsRepo.save({
                number,
                content,
                status: 'ERROR',
                tipo,
            })

            throw new InternalServerErrorException(
                'No fue posible enviar el SMS individual',
            )
        }
    }
}
