import { Injectable } from '@nestjs/common'
import { sendTemplateMail } from './mailer.provider'

@Injectable()
export class MailerService {
    async sendTemplateMail(payload: any) {
        const { data } = await sendTemplateMail(payload)

        return {
            status: 'SENT',
            providerId: data.uuid,
        }
    }
}
