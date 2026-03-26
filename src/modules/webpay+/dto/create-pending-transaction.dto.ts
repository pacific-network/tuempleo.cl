import { IsNumber, IsArray, ValidateNested, IsString, Min, ArrayMinSize } from 'class-validator'
import { Type } from 'class-transformer'

export class TransactionItemDto {
    @IsString()
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
