import { IsNotEmpty, IsOptional, IsString, Equals } from 'class-validator';

export class DeleteAccountDto {
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @Equals('ELIMINAR MI CUENTA', {
    message: 'Debe escribir "ELIMINAR MI CUENTA" para confirmar',
  })
  confirmation: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
