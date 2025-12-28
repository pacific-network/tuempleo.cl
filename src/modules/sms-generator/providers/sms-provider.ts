// src/sms/providers/pacific-sms.provider.ts

import { HttpService } from '@nestjs/axios'
import {
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common'
import { firstValueFrom } from 'rxjs'
import { SmsProvider, SmsProviderResponse } from './sms-provider.interface'

@Injectable()
export class PacificSmsProvider implements SmsProvider {
    private readonly logger = new Logger(PacificSmsProvider.name)

    private readonly apiUrl: string
    private readonly apiKey: string
    private readonly empresaServiceId: number

    constructor(private readonly http: HttpService) {
        const baseUrl = process.env.PACIFIC_BASE_URL
        const apiKey = process.env.PACIFIC_API_KEY
        const empresaServiceIdRaw = process.env.PACIFIC_EMPRESA_SERVICE_ID

        if (!baseUrl) throw new Error('PACIFIC_BASE_URL no configurada')
        if (!apiKey) throw new Error('PACIFIC_API_KEY no configurada')
        if (!empresaServiceIdRaw)
            throw new Error('PACIFIC_EMPRESA_SERVICE_ID no configurada')

        const empresaServiceId = Number(empresaServiceIdRaw)
        if (Number.isNaN(empresaServiceId)) {
            throw new Error(
                'PACIFIC_EMPRESA_SERVICE_ID debe ser un número válido',
            )
        }

        this.apiUrl = `${baseUrl}/v2/messages/send`
        this.apiKey = apiKey
        this.empresaServiceId = empresaServiceId

        this.logger.log(
            `PacificSmsProvider configurado → ${this.apiUrl}`,
        )
    }

    async sendSms(payload: {
        number: string
        content: string
    }): Promise<SmsProviderResponse> {
        try {
            this.logger.log(
                `Enviando SMS a ${payload.number} (empresa_service_id=${this.empresaServiceId})`,
            )

            const response = await firstValueFrom(
                this.http.post(
                    this.apiUrl,
                    {
                        empresa_service_id: this.empresaServiceId,
                        number: payload.number,
                        sms_content: payload.content,
                    },
                    {
                        headers: {
                            'x-api-key': this.apiKey,
                            'Content-Type': 'application/json',
                            Accept: '*/*',
                            'User-Agent': 'PostmanRuntime/7.36.1',
                            Connection: 'keep-alive',
                        },
                        timeout: 8000,
                        validateStatus: () => true, // ← necesario
                    },
                ),
            )

            this.logger.log({
                status: response.status,
                data: response.data,
            })

            // ✅ Aceptar TODO 2xx
            if (response.status < 200 || response.status >= 300) {
                throw new Error(
                    `Pacific error ${response.status}: ${JSON.stringify(
                        response.data,
                    )}`,
                )
            }

            if (!response.data?.id_sms) {
                throw new Error(
                    'Respuesta inválida del proveedor Pacific (id_sms faltante)',
                )
            }

            return {
                externalId: response.data.id_sms,
                number: response.data.number,
                status: response.data.status,
            }
        } catch (error) {
            this.logger.error('Error enviando SMS vía Pacific', {
                message: error.message,
                stack: error.stack,
            })

            throw new InternalServerErrorException(
                'Error enviando SMS vía Pacific',
            )
        }
    }
}
