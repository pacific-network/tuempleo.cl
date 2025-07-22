import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RegistrarUsuarioOAuthDto {
    @IsString()
    @IsNotEmpty()
    nombre_completo: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;
}