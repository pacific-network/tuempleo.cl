import { IsIn } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CrearEntrevistaDto } from './crear-entrevista.dto';

// Reprogramar / editar: todos los campos opcionales.
export class ActualizarEntrevistaDto extends PartialType(CrearEntrevistaDto) {}

// Cambio de estado de la entrevista.
export class CambiarEstadoEntrevistaDto {
  @IsIn(['propuesta', 'confirmada', 'reprogramada', 'cancelada', 'completada'], {
    message: 'Estado no válido.',
  })
  estado: 'propuesta' | 'confirmada' | 'reprogramada' | 'cancelada' | 'completada';
}
