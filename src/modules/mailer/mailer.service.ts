import { Injectable } from '@nestjs/common'
import { sendTemplateMail, createTemplateFromUrl, checkMailStatus } from './mailer.provider'

@Injectable()
export class MailerService {
    async sendTemplateMail(payload: any) {
        const result = await sendTemplateMail(payload)

        return {
            status: 'SENT',
            providerId: result.uuid,
        }
    }

    async createTemplate(subject: string, contentUrl: string) {
        return createTemplateFromUrl(subject, contentUrl)
    }

    async getMailStatus(key: string) {
        return checkMailStatus(key)
    }
}
