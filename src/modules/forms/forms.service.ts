import { Injectable } from '@nestjs/common';
import { RegisterBusinessEmployerDto } from './dto/register-business-employer.dto';
import { EmpresaService } from '../business/business.service';
import { EmpleadorService } from '../employer/employer.service';

@Injectable()
export class FormsService {
    constructor(
        private readonly businessService: EmpresaService,
        private readonly empleadorService: EmpleadorService,
    ) { }

    async registerBusinessAndEmployer(dto: RegisterBusinessEmployerDto) {
        // 1. Crear empresa
        const createdBusiness = await this.businessService.createBusiness(dto.business);

        // 2. Crear empleador con el ID de empresa que acabamos de crear
        const createdEmployer = await this.empleadorService.createEmployerWithCompany(
            dto.employer,
            createdBusiness.id, // <- ID necesario para empleador
        );

        return {
            business: createdBusiness,
            employer: createdEmployer,
        };
    }
}
