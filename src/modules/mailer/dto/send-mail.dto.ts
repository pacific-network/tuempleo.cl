import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class SendMailDto {
    @IsEmail()
    dest_email: string

    @IsNotEmpty()
    message_id: string | number

    @IsOptional()
    @IsString()
    mail_from?: string

    @IsOptional()
    @IsString()
    name_from?: string

    // Permite parámetros de personalización adicionales (@Nombre@, etc.)
    [key: string]: any
}

export class CreateTemplateDto {
    @IsString()
    @IsNotEmpty()
    subject: string

    @IsString()
    @IsNotEmpty()
    contentUrl: string
}
