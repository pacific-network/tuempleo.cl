// src/sms/providers/sms-provider.interface.ts

export interface SmsProviderResponse {
    externalId: string
    number: string
    status: string
}

export interface SmsProvider {
    sendSms(payload: {
        number: string
        content: string
    }): Promise<SmsProviderResponse>
}
