import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Empresa } from "../../repository/business/business.entity";
import { CreateBusinessDto } from "./dto/create-business.dto";
import { PromocionService } from "../promocion/promocion.service";
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class EmpresaService {
    constructor(
        @InjectRepository(Empresa)
        private readonly businessRepository: Repository<Empresa>,
        private readonly promocionService: PromocionService,
    ) { }

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

    public async getBusinessById(id: number): Promise<Empresa> {
        const business = await this.businessRepository.findOne({ where: { id }, relations: ['plan'] });
        if (!business) throw new NotFoundException('Empresa no encontrada');
        return business;
    }

    public async checkRutExists(rut: string): Promise<{ exists: boolean; empresa?: { id: number; razon_social: string; nombre_fantasia: string } }> {
        const empresa = await this.businessRepository.findOne({ where: { rut } });
        if (!empresa) return { exists: false };
        return {
            exists: true,
            empresa: { id: empresa.id, razon_social: empresa.razon_social, nombre_fantasia: empresa.nombre_fantasia },
        };
    }

    public async createBusiness(createBusinessDto: CreateBusinessDto): Promise<Empresa> {

        // Aquí creamos la entidad Empresa con plan como objeto { id: planId }
        const business = this.businessRepository.create({
            ...createBusinessDto,
            // esto es clave para relacionar ManyToOne
            data: createBusinessDto.data,  // data es JSON y viene en DTO
        });

        const saved = await this.businessRepository.save(business);

        // 🎁 Regalo de bienvenida: 3 avisos PREMIUM por 30 días (idempotente)
        await this.promocionService.otorgarBienvenida(saved.id);

        return saved;
    }

    public async uploadBusinessLogo(rut: string, file: Express.Multer.File): Promise<Empresa> {
        const business = await this.businessRepository.findOne({ where: { rut } });
        if (!business) {
            throw new NotFoundException('Empresa no encontrada');
        }

        // Eliminar logo anterior si existe
        if (business.logo_url) {
            const uploadBase = process.env.UPLOAD_PATH || path.join(__dirname, '..', '..', '..', 'upload');
            const oldFile = path.join(uploadBase, business.logo_url.replace('/upload/', ''));
            if (fs.existsSync(oldFile)) {
                fs.unlinkSync(oldFile);
            }
        }

        const logoUrl = `/upload/logos/${file.filename}`;
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

    public async deleteBusinessById(rut: string): Promise<void> {
        let result: { affected?: number | null };
        try {
            result = await this.businessRepository.delete({ rut });
        } catch (error) {
            // No enmascarar el error real: típicamente es una FK apuntando a la empresa
            // (p. ej. la promoción de bienvenida creada en createBusiness).
            console.error('❌ [BUSINESS] Falló el DELETE de empresa', { rut }, error);
            throw error;
        }
        if (!result.affected) {
            throw new NotFoundException('Empresa no encontrada');
        }
    }





}
