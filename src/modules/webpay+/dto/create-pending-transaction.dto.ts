import { IsNumber, IsArray, ValidateNested, IsString, Min, ArrayMinSize, IsIn } from 'class-validator'
import { Type, Transform } from 'class-transformer'

export class TransactionItemDto {
    // Normalizamos a MAYÚSCULAS antes de validar: el enum de stock/transaction_items
    // solo acepta 'GRATIS' | 'BASICO' | 'ESTANDAR' | 'PREMIUM'. Sin esto, un 'basico'
    // del front se guardaba crudo y nunca cuadraba con el stock (no sumaba ni descontaba).
    @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
    @IsString()
    @IsIn(['GRATIS', 'BASICO', 'ESTANDAR', 'PREMIUM'])
    tipoAviso: string

    @IsNumber()
    @Min(1)
    cantidad: number

    @IsNumber()
    @Min(0)
    precioUnitario: number

    @IsNumber()
    @Min(0)
    subtotal: number
}

export class CreatePendingTransactionDto {
    @IsNumber()
    empresaId: number

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => TransactionItemDto)
    items: TransactionItemDto[]
}
