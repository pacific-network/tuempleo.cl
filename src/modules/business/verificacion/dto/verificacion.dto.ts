import { IsNotEmpty, IsString, Matches, Length } from 'class-validator';

export class SolicitarVerificacionDto {
  // Formato exigido por el proveedor SMS (Pacific): 56 + 9 dígitos.
  @IsString()
  @IsNotEmpty()
  @Matches(/^56\d{9}$/, {
    message: 'El número debe venir en formato 569XXXXXXXX',
  })
  telefono: string;
}

export class ConfirmarVerificacionDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'El código debe tener 6 dígitos.' })
  codigo: string;
}
