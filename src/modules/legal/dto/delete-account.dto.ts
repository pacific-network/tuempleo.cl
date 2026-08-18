import { IsNotEmpty, IsOptional, IsString, Equals } from 'class-validator';

/** Frase exacta que el frontend exige escribir antes de habilitar el botón. */
export const CONFIRM_PHRASE = 'ELIMINAR MI CUENTA';

export class DeleteAccountDto {
  /**
   * Opcional a nivel de DTO porque las cuentas creadas por OAuth no tienen una
   * contraseña que el usuario conozca. `LegalService.deleteAccount` la exige
   * para las cuentas locales; sin eso, cualquiera con la sesión abierta podría
   * borrar la cuenta.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  password?: string;

  @IsString()
  @Equals(CONFIRM_PHRASE, {
    message: `Debe escribir "${CONFIRM_PHRASE}" para confirmar`,
  })
  confirmPhrase: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
