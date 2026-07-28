import { Test, TestingModule } from '@nestjs/testing';
import { EmpresaService } from './business.service';
import { Repository } from 'typeorm';
import { Empresa } from '../../repository/business/business.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateBusinessDto } from './dto/create-business.dto';
import { PromocionService } from '../promocion/promocion.service';

describe('BusinessService', () => {
    let service: EmpresaService;
    let repository: Repository<Empresa>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EmpresaService,
                {
                    provide: getRepositoryToken(Empresa),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                    },
                },
                {
                    // createBusiness otorga el regalo de bienvenida tras guardar.
                    provide: PromocionService,
                    useValue: {
                        otorgarBienvenida: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<EmpresaService>(EmpresaService);
        repository = module.get<Repository<Empresa>>(getRepositoryToken(Empresa));
    });

    it('debería crear una empresa correctamente', async () => {
        // 📦 Mock del DTO de entrada
        const dto: CreateBusinessDto = {
            rut: '12345678-9',
            razon_social: 'Tecnologías ACME SpA',
            nombre_fantasia: 'ACME Tech',
            modificado_por: 42,
            data: {
                actividades_economicas: ['Servicios TI', 'Consultoría'],
                condicion_fiscal: 'General',
                domicilios: ['Av. Providencia 123, Santiago'],
                inicio_actividades: true,
                fecha_inicio_actividades: new Date('2024-01-01'),
                empresa_menor_tamano: false,
                web_factuacion: 'https://factura.tuempresa.cl',
                pais: 'Chile',
                telefono: '+56912345678',
                descripcion: 'Empresa dedicada a servicios tecnológicos',
            },
        };

        // 🧠 Mock de retorno del repositorio
        const mockEntity: Empresa = { id: 1, ...dto } as any;

        jest.spyOn(repository, 'create').mockReturnValue(mockEntity);
        jest.spyOn(repository, 'save').mockResolvedValue(mockEntity);

        // 🧪 Ejecución
        const result = await service.createBusiness(dto);

        // ✅ Verificaciones
        expect(repository.create).toHaveBeenCalledWith(dto);
        expect(repository.save).toHaveBeenCalledWith(mockEntity);
        expect(result).toEqual(mockEntity);
    });
});
