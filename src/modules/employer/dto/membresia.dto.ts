import { IsIn, IsInt } from 'class-validator';

export class EmpresaActivaDto {
  @IsInt()
  empresaId: number;
}

export class CambiarRolDto {
  /** `admin` es el responsable main de la empresa; `miembro`, un colaborador. */
  @IsIn(['admin', 'miembro'])
  rol: 'admin' | 'miembro';
}
