//src/modules/forms/dto/register-business-employer.dto.ts
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { CreateBusinessDto } from '../../business/dto/create-business.dto';
import { CreateEmployerDto } from '../../employer/dto/create-employer.dto';

export class RegisterBusinessEmployerDto {
  @ValidateNested()
  @Type(() => CreateBusinessDto)
  business: CreateBusinessDto;

  @ValidateNested()
  @Type(() => CreateEmployerDto)
  employer: CreateEmployerDto;
}
