import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Oferta } from "../../repository/job_offer/job-offer.entity";
import { Empleador } from "../../repository/employer/employer.entity";
import { Empresa } from "../../repository/business/business.entity";
import { CreateOfertaDto } from "./dto/create-oferta.dto";
import { PageOptionsDto } from "src/shared/pagination/page-options.dto";
import { PageDto } from "src/shared/pagination/page.dto";
import { PageMetaDto } from "src/shared/pagination/page-meta.dto";

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


    // async obtenerOfertasPorEmpleador(empleadorId: number): Promise<Oferta[]> {
    //     const empleador = await this.empleadorRepository.findOne({ where: { id: empleadorId } });
    //     if (!empleador) {
    //         throw new NotFoundException(`Empleador con ID ${empleadorId} no encontrado`);
    //     }
    //     return this.ofertaRepository.find({
    //         where: { empleador: { id: empleadorId } },
    //         relations: ['empresa', 'empleador'],
    //     });
    // }

    async obtenerOfertasPorEmpleador(
        empleadorId: number,
        pageOptions: PageOptionsDto
    ): Promise<PageDto<Oferta>> {
        const queryBuilder = this.ofertaRepository.createQueryBuilder('oferta')
            .leftJoinAndSelect('oferta.empresa', 'empresa')
            .leftJoinAndSelect('oferta.empleador', 'empleador')
            .where('empleador.id = :empleadorId', { empleadorId })
            .skip(pageOptions.skip)
            .take(pageOptions.take);

        const [entities, itemCount] = await queryBuilder.getManyAndCount();

        const meta = new PageMetaDto({
            pageOptionsDto: pageOptions,
            itemCount,
        });

        return new PageDto(entities, meta);
    }

    async eliminarOferta(id: number, usuarioId: number): Promise<{ message: string }> {
        const oferta = await this.ofertaRepository.findOne({
            where: { id },
            relations: ['empleador', 'empresa'],
        });
        if (!oferta) {
            throw new NotFoundException(`Oferta con ID ${id} no encontrada`);
        }
        const empleador = await this.empleadorRepository.findOne({
            where: { usuario: { id: usuarioId } },
            relations: ['usuario'],
        });

        if (!empleador) {
            throw new NotFoundException(`Empleador con usuario ID ${usuarioId} no encontrado`);
        }
        oferta.eliminada_por = empleador;
        await this.ofertaRepository.save(oferta);

        await this.ofertaRepository.softDelete(id);
        return { message: `Oferta con ID ${id} eliminada correctamente` };
    }




}