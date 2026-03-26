import { IsNumber, IsObject, IsString, IsIn, ValidateNested, IsOptional } from 'class-validator'
import { Type } from 'class-transformer'
import { PlanKey } from '../publication.service'

export class PublishSelectionDto {
    @IsString()
    @IsIn(['FREE', 'BASICO', 'ESTANDAR', 'PREMIUM', 'free', 'basico', 'estandar', 'premium'])
    planKey: string
}

export class PublishOfertaDto {
    @IsString()
    titulo: string

    @IsOptional()
    @IsObject()
    data?: Record<string, any>
}

export class PublishOfferDto {
    @IsNumber()
    employerId: number

    @IsNumber()
    empresaId: number

    @ValidateNested()
    @Type(() => PublishSelectionDto)
    selection: PublishSelectionDto

    @ValidateNested()
    @Type(() => PublishOfertaDto)
    oferta: PublishOfertaDto
}

export class ReservePublicationDto {
    @IsNumber()
    employerId: number

    @IsString()
    @IsIn(['FREE', 'BASICO', 'ESTANDAR', 'PREMIUM'])
    planKey: string
}

export class ValidatePaidDto {
    @IsNumber()
    employerId: number

    @IsString()
    @IsIn(['FREE', 'BASICO', 'ESTANDAR', 'PREMIUM'])
    planKey: PlanKey

    @IsString()
    orderId: string
}

export class ConfirmPublicationDto {
    @IsNumber()
    reservationId: number

    @IsNumber()
    ofertaId: number
}

export class UnlockViewDto {
    @IsNumber()
    postulanteId: number
}
