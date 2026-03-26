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

    private readonly baseUrl: string
    private readonly apiKey: string
    private readonly apiSecret: string

    constructor(private readonly http: HttpService) {
        const baseUrl = process.env.PACIFIC_BASE_URL
        const apiKey = process.env.PACIFIC_API_KEY
        const apiSecret = process.env.PACIFIC_API_SECRET

        if (!baseUrl) throw new Error('PACIFIC_BASE_URL no configurada')
        if (!apiKey) throw new Error('PACIFIC_API_KEY no configurada')
        if (!apiSecret) throw new Error('PACIFIC_API_SECRET no configurada')

        this.baseUrl = baseUrl
        this.apiKey = apiKey
        this.apiSecret = apiSecret

        this.logger.log(
            `PacificSmsProvider configurado → ${this.baseUrl}/sms/send`,
        )
    }

    async sendSms(payload: {
        number: string
        content: string
    }): Promise<SmsProviderResponse> {
        try {
            this.logger.log(`Enviando SMS a ${payload.number}`)

            const response = await firstValueFrom(
                this.http.post(
                    `${this.baseUrl}/sms/send`,
                    {
                        numero: payload.number,
                        mensaje: payload.content,
                    },
                    {
                        auth: {
                            username: this.apiKey,
                            password: this.apiSecret,
                        },
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        timeout: 8000,
                        validateStatus: () => true,
                    },
                ),
            )

            this.logger.log({
                status: response.status,
                data: response.data,
            })

            if (response.status < 200 || response.status >= 300) {
                throw new Error(
                    `Pacific Solutions error ${response.status}: ${JSON.stringify(
                        response.data,
                    )}`,
                )
            }

            if (!response.data?.ok || !response.data?.message_id) {
                throw new Error(
                    'Respuesta inválida del proveedor Pacific Solutions (message_id faltante)',
                )
            }

            return {
                externalId: String(response.data.message_id),
                number: payload.number,
                status: 'enviado',
            }
        } catch (error) {
            this.logger.error('Error enviando SMS vía Pacific Solutions', {
                message: error.message,
                stack: error.stack,
            })

            throw new InternalServerErrorException(
                'Error enviando SMS vía Pacific Solutions',
            )
        }
    }

    async getStatus(messageId: string): Promise<string> {
        try {
            const response = await firstValueFrom(
                this.http.get(
                    `${this.baseUrl}/sms/status/${messageId}`,
                    {
                        auth: {
                            username: this.apiKey,
                            password: this.apiSecret,
                        },
                        timeout: 8000,
                        validateStatus: () => true,
                    },
                ),
            )

            if (response.status < 200 || response.status >= 300) {
                throw new Error(
                    `Pacific Solutions status error ${response.status}: ${JSON.stringify(
                        response.data,
                    )}`,
                )
            }

            return response.data?.estado ?? 'desconocido'
        } catch (error) {
            this.logger.error('Error consultando estado SMS', {
                message: error.message,
            })
            throw new InternalServerErrorException(
                'Error consultando estado de SMS',
            )
        }
    }
}
