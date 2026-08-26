import { IsIn, IsInt } from 'class-validator';

export class EmpresaActivaDto {
  @IsInt()
  empresaId: number;
}

export class CambiarRolDto {
  /** `empleador` maneja la empresa e invita; `colaborador` solo pertenece. */
  @IsIn(['empleador', 'colaborador'])
  rol: 'empleador' | 'colaborador';
}
