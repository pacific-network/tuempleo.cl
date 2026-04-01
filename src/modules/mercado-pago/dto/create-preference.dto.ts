import { IsArray, IsNumber, IsString, Min, ArrayMinSize, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class MercadoPagoItemDto {
  @IsString()
  @IsIn(['BASICO', 'ESTANDAR', 'PREMIUM'])
  tipoAviso: 'BASICO' | 'ESTANDAR' | 'PREMIUM';

  @IsNumber()
  @Min(1)
  cantidad: number;
}

export class CreatePreferenceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MercadoPagoItemDto)
  items: MercadoPagoItemDto[];
}
