import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export enum ModalidadContacto {
  PRESENCIAL = 'presencial',
  TELEFONICA = 'telefonica',
  VIDEOLLAMADA = 'videollamada',
  OTRO = 'otro',
}

export class CrearEntrevistaDto {
  @IsDateString({}, { message: 'La fecha propuesta debe tener formato ISO8601.' })
  @IsNotEmpty({ message: 'Debe indicar la fecha propuesta.' })
  fecha_propuesta: string;

  @IsEnum(ModalidadContacto, {
    message: 'Modalidad de contacto no válida. Use: presencial, telefonica, videollamada u otro.',
  })
  modalidad_contacto: ModalidadContacto;

  // Dirección, teléfono o link de video que el empleador pega manualmente.
  @IsString()
  @IsNotEmpty({ message: 'Debe indicar el detalle de contacto.' })
  @MaxLength(2000)
  detalle_contacto: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mensaje?: string;

  @IsOptional()
  @IsInt({ message: 'La duración debe ser un número entero de minutos.' })
  @Min(1)
  duracion_min?: number;
}
