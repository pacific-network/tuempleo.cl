import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { MailerService } from './mailer.service'

@Controller('v1/mailer')
export class MailerController {
    constructor(private readonly mailerService: MailerService) { }

    @Post('send')
    @HttpCode(HttpStatus.OK)
    async sendMail(@Body() body: any) {
        return this.mailerService.sendTemplateMail(body)
    }
}
