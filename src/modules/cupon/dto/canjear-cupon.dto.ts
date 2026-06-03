import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CanjearCuponDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    codigo: string;
}
