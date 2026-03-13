import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EmployerDataDto } from './create-employer.dto';

export class OnboardingMiembroDto {
  @IsString()
  @IsNotEmpty()
  nombres: string;

  @IsString()
  @IsNotEmpty()
  apellidos: string;

  @IsString()
  @IsNotEmpty()
  rut: string;

  @ValidateNested()
  @Type(() => EmployerDataDto)
  data: EmployerDataDto;
}
