import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class InvitarEmpleadorDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^56\d{9}$/, {
    message: 'El telefono debe venir en formato 569XXXXXXXX',
  })
  telefono: string;
}

export class ValidarCodigoDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, {
    message: 'El codigo debe ser de 6 digitos',
  })
  codigo: string;
}

export class AceptarInvitacionDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, {
    message: 'El codigo debe ser de 6 digitos',
  })
  codigo: string;

  @IsString()
  @IsNotEmpty()
  rut: string;

  @IsString()
  @IsNotEmpty()
  nombres: string;

  @IsString()
  @IsNotEmpty()
  apellidos: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
