import { IsOptional, IsString, IsEmail, MinLength } from 'class-validator';

export class UpdateMeDto {
    @IsOptional()
    @IsString()
    nombres?: string;

    @IsOptional()
    @IsString()
    apellidos?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @MinLength(6)
    @IsString()
    password?: string;
}
