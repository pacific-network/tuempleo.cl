import { IsBoolean, IsEmail, IsNotEmpty, IsString, Length, Equals } from 'class-validator';

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

    @IsBoolean()
    @Equals(true, { message: 'Debe aceptar los terminos y condiciones' })
    accept_terms: boolean;

    @IsBoolean()
    @Equals(true, { message: 'Debe aceptar la politica de privacidad' })
    accept_privacy: boolean;
}

