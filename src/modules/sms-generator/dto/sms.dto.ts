// src/sms/dto/sms.dto.ts

import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator'

export enum SmsTipo {
    TRANSACCIONAL = 'TRANSACCIONAL',
    MARKETING = 'MARKETING',
    SISTEMA = 'SISTEMA',
}

export class SendIndividualSmsDto {
    @IsString()
    @IsNotEmpty()
    @Matches(/^56\d{9}$/, {
        message: 'El número debe venir en formato 569XXXXXXXX',
    })
    number: string

    @IsString()
    @IsNotEmpty()
    content: string

    @IsEnum(SmsTipo)
    tipo: SmsTipo
}
