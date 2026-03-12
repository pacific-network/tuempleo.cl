import { Controller, Post, Body, Get, Param, Query, HttpCode, HttpStatus, Res, NotFoundException } from '@nestjs/common'
import { Response } from 'express'
import { MailerService } from './mailer.service'
import * as fs from 'fs'
import * as path from 'path'

@Controller('v1/mailer')
export class MailerController {
    constructor(private readonly mailerService: MailerService) { }

    /** Enviar mail usando template existente (con personalización) */
    @Post('send')
    @HttpCode(HttpStatus.OK)
    async sendMail(@Body() body: any) {
        return this.mailerService.sendTemplateMail(body)
    }

    /** Consultar estado de un mail enviado */
    @Get('status')
    async getMailStatus(@Query('key') key: string) {
        return this.mailerService.getMailStatus(key)
    }

    /** Crear template desde URL pública con HTML */
    @Post('template')
    @HttpCode(HttpStatus.CREATED)
    async createTemplate(@Body() body: { subject: string; contentUrl: string }) {
        return this.mailerService.createTemplate(body.subject, body.contentUrl)
    }

    /** Servir template HTML raw (para que Pacific Network lo lea) */
    @Get('templates/:name')
    async getTemplate(@Param('name') name: string, @Res() res: Response) {
        const safeName = name.replace(/[^a-z0-9\-]/gi, '')
        const filePath = path.join(__dirname, 'templates', `${safeName}.html`)

        if (!fs.existsSync(filePath)) {
            throw new NotFoundException(`Template "${safeName}" no encontrado`)
        }

        const html = fs.readFileSync(filePath, 'utf-8')
        res.setHeader('Content-Type', 'text/html')
        res.send(html)
    }

    /** TEST: exportar base de correos CSV compatible con Pacific Network */
    @Get('test/export-csv')
    async exportCsv(@Res() res: Response) {
        const rows = [
            ['email', 'Nombre', 'Apellido'],
            ['pa.ramirezciani13@gmail.com', 'Paulo', 'Ramirez'],
        ]

        const csv = rows.map(r => r.join(',')).join('\n')

        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', 'attachment; filename="base_correos_test.csv"')
        res.send(csv)
    }
}
