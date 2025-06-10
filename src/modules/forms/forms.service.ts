import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
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
        try {
            // 1. Crear empresa
            const createdBusiness = await this.businessService.createBusiness(dto.business);

            try {
                // 2. Crear empleador
                const createdEmployer = await this.empleadorService.createEmployerWithCompany(
                    dto.employer,
                    createdBusiness.id,
                );

                return {
                    business: createdBusiness,
                    employer: createdEmployer,
                };
            } catch (err) {
                // Si falla la creación del empleador, borramos la empresa creada
                await this.businessService.deleteBusinessById(createdBusiness.rut);

                if (err.code === 'ER_DUP_ENTRY') {
                    throw new ConflictException('El empleador ya existe');
                }

                throw new InternalServerErrorException('No se pudo crear el empleador');
            }
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                throw new ConflictException('La empresa ya existe');
            }

            throw new InternalServerErrorException('No se pudo registrar la empresa y el empleador');
        }
    }





}
