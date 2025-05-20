import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Empresa } from "../../repository/business/business.entity";
import { CreateBusinessDto } from "./dto/create-business.dto";
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class EmpresaService {
    constructor(
        @InjectRepository(Empresa)
        private readonly businessRepository: Repository<Empresa>,
    ) { }

    private readonly LOGOS_PATH = path.join(__dirname, '../../../logos_empresas');


    public async getAllBusinesses(): Promise<Empresa[]> {
        return this.businessRepository.find();
    }

    public async getBusinessByRut(rut: string): Promise<Empresa> {
        const business = await this.businessRepository.findOne({ where: { rut } });
        if (!business) {
            throw new Error('Empresa no encontrada');
        }
        return business;
    }

    public createBusiness(createBusinessDto: CreateBusinessDto): Promise<Empresa> {
        const planId = createBusinessDto.plan_id ?? 1;
    
        // Aquí creamos la entidad Empresa con plan como objeto { id: planId }
        const business = this.businessRepository.create({
            ...createBusinessDto,
            plan: { id: planId },   // esto es clave para relacionar ManyToOne
            data: createBusinessDto.data,  // data es JSON y viene en DTO
        });
    
        return this.businessRepository.save(business);
    }

    public async uploadBusinessLogo(rut: string, file: Express.Multer.File): Promise<Empresa> {
        const business = await this.businessRepository.findOne({ where: { rut } });

        if (!business) {
            throw new NotFoundException('Empresa no encontrada');
        }

        if (file.mimetype !== 'image/png') {
            throw new Error('El formato del archivo debe ser PNG');
        }

        const newFileName = `logo_empresa_${rut}.png`;
        const filePath = path.join(this.LOGOS_PATH, newFileName);

        // Mover el archivo subido al destino con el nombre estandarizado
        fs.renameSync(file.path, filePath);

        const logoUrl = `/logos_empresas/${newFileName}`;
        business.logo_url = logoUrl;

        return await this.businessRepository.save(business);
    }

    public async updateBusiness(rut: string, updateBusinessDto: CreateBusinessDto): Promise<Empresa> {
        const business = await this.getBusinessByRut(rut);
        if (!business) {
            throw new NotFoundException('Empresa no encontrada');
        }
        Object.assign(business, updateBusinessDto);
        return this.businessRepository.save(business);
    }


}
