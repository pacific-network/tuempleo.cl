import { Injectable, NotAcceptableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Empresa } from "src/repository/business/business.entity";
import { Usuario } from "src/repository/user/user.entity";
import { Empleador } from "src/repository/employer/employer.entity";
import { CreateEmployerDto } from "../employer/dto/create-employer.dto";

@Injectable()
export class EmpleadorService {
    constructor(
        @InjectRepository(Empleador)
        private readonly empleadorRepository: Repository<Empleador>,
        @InjectRepository(Usuario)
        private readonly usuarioRepository: Repository<Usuario>,
        @InjectRepository(Empresa)
        private readonly empresaRepository: Repository<Empresa>,
    ) { }

    async createEmployerWithCompany(
        createEmployerDto: CreateEmployerDto,
        empresaId: number,
    ): Promise<Empleador> {
        const usuario = await this.usuarioRepository.findOne({
            where: { id: createEmployerDto.userId },
        });

        if (!usuario) {
            throw new NotAcceptableException('Usuario no encontrado');
        }

        const empresa = await this.empresaRepository.findOne({
            where: { id: empresaId },
        });

        if (!empresa) {
            throw new NotAcceptableException('Empresa no encontrada');
        }

        const empleador = this.empleadorRepository.create({
            usuario,
            empresa,
            data: createEmployerDto.data,
        });

        return this.empleadorRepository.save(empleador);
    }
}
