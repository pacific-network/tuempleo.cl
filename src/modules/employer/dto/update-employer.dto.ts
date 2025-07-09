// src/modules/forms/dto/update-employer.dto.ts

import { ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { EmployerDataDto } from './create-employer.dto';

export class UpdateEmployerDto {
    @IsOptional()
    @ValidateNested()
    @Type(() => EmployerDataDto)
    data?: EmployerDataDto;
}
