import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Oferta } from "../../repository/job_offer/job-offer.entity";
import { Empleador } from "../../repository/employer/employer.entity";
import { Empresa } from "../../repository/business/business.entity";
import { CreateOfertaDto } from "./dto/create-oferta.dto";

@Injectable()
export class OfertaService {
    constructor(
        @InjectRepository(Oferta)
        private readonly ofertaRepository: Repository<Oferta>,
        @InjectRepository(Empleador)
        private readonly empleadorRepository: Repository<Empleador>,
        @InjectRepository(Empresa)
        private readonly empresaRepository: Repository<Empresa>,
    ) { }
    async obtenerOfertas(): Promise<Oferta[]> {
        return this.ofertaRepository.find({ relations: ['empresa', 'empleador'] });
    }

    async crearOferta(data: CreateOfertaDto): Promise<Oferta> {
        const empleador = await this.empleadorRepository.findOne({ where: { id: data.empleador_id } });
        if (!empleador) {
            throw new NotFoundException(`Empleador con ID ${data.empleador_id} no encontrado`);
        }

        const empresa = await this.empresaRepository.findOne({ where: { id: data.empresa_id } });
        if (!empresa) {
            throw new NotFoundException(`Empresa con ID ${data.empresa_id} no encontrada`);
        }

        const oferta = this.ofertaRepository.create({
            ...data,
            empresa,
            empleador,
        });

        return this.ofertaRepository.save(oferta);
    }

    async obtenerOfertaPorId(id: number): Promise<Oferta> {
        const oferta = await this.ofertaRepository.findOne({ where: { id }, relations: ['empresa', 'empleador'] });
        if (!oferta) {
            throw new NotFoundException(`Oferta con ID ${id} no encontrada`);
        }
        return oferta;
    }
}