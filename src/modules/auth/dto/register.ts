import { IsBoolean, IsDate, IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class RegistrarUsuarioDto {
    @IsString()
    @IsNotEmpty()
    nombre_completo: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @Length(6, 20)
    @IsNotEmpty()
    password: string;


    
}

