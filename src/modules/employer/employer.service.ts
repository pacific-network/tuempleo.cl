import { Injectable, NotAcceptableException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Empresa } from "src/repository/business/business.entity";
import { Usuario } from "src/repository/user/user.entity";
import { Empleador } from "src/repository/employer/employer.entity";
import { CreateEmployerDto } from "../employer/dto/create-employer.dto";
import { EmpleadorBasicInfoDto } from "./dto/basic-info.dto";
import { UpdateBusinessDto } from "../business/dto/update-business.dto";
import { UpdateEmployerDto } from "./dto/update-employer.dto";
import { PageDto } from "src/shared/pagination/page.dto";
import { PageOptionsDto } from "src/shared/pagination/page-options.dto";
import { PageMetaDto } from "src/shared/pagination/page-meta.dto";

@Injectable()
export class EmpleadorService {
    empleadorRepo: any;
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
        // 1. Buscar usuario por id
        const usuario = await this.usuarioRepository.findOne({
            where: { id: createEmployerDto.userId },
        });

        if (!usuario) {
            throw new NotAcceptableException('Usuario no encontrado');
        }

        // 2. Actualizar rut en usuario
        usuario.rut = createEmployerDto.rut;
        await this.usuarioRepository.save(usuario);

        // 3. Buscar empresa
        const empresa = await this.empresaRepository.findOne({
            where: { id: empresaId },
        });

        if (!empresa) {
            throw new NotAcceptableException('Empresa no encontrada');
        }

        // 4. Crear empleador relacionado al usuario y empresa
        const empleador = this.empleadorRepository.create({
            usuario,
            empresa,
            data: createEmployerDto.data,
        });

        // 5. Guardar y retornar
        return await this.empleadorRepository.save(empleador);
    }

    async findEmployerByUserId(userId: number): Promise<Empleador | null> {
        return this.empleadorRepository.findOne({
            where: { usuario: { id: userId } },
            relations: ['empresa', 'usuario'],
        });
    }

    async findBasicInfo(userId: number): Promise<EmpleadorBasicInfoDto> {
        const empleador = await this.empleadorRepository.findOne({
            where: { usuario: { id: userId } },
            relations: ['empresa'],
            // ¡NO pongas select si quieres acceder a relaciones!
        });

        if (!empleador) {
            throw new NotFoundException(`Empleador con usuario ID ${userId} no encontrado`);
        }

        return {
            empleador_id: empleador.id,
            empresa_id: empleador.empresa?.id || null,
        };
    }

    async BusinessEmployer(userId: number): Promise<Empresa | null> {
        const empleador = await this.empleadorRepository.findOne({
            where: { usuario: { id: userId } },
            relations: ['empresa'],
        });

        if (!empleador) {
            return null;
        }

        return empleador.empresa;
    }

    //update empresa by userId 
    async updateEmployerBusiness(userId: number, dto: UpdateBusinessDto): Promise<Empresa> {
        const empleador = await this.empleadorRepository.findOne({
            where: { usuario: { id: userId } },
            relations: ['empresa'],
        });

        if (!empleador || !empleador.empresa) {
            throw new NotFoundException('Empresa asociada al usuario no encontrada');
        }

        const empresa = empleador.empresa;

        // Solo actualizamos los campos que vinieron en el DTO
        const camposEditables = [
            'nombre_fantasia',
            'telefono',
            'domicilios',
            'descripcion',
            'web_factuacion',
            'logo_url',
        ];

        for (const campo of camposEditables) {
            if (dto[campo] !== undefined) {
                if (campo in empresa.data) {
                    empresa.data[campo] = dto[campo]; // campo dentro de empresa.data
                } else {
                    empresa[campo] = dto[campo]; // campo directamente en empresa
                }
            }
        }

        empresa.fecha_update = new Date();

        return await this.empresaRepository.save(empresa);
    }

    async updateEmployerData(userId: number, dto: UpdateEmployerDto): Promise<Empleador> {
        const empleador = await this.empleadorRepository.findOne({
            where: { usuario: { id: userId } },
        });

        if (!empleador) {
            throw new NotFoundException('Empleador no encontrado');
        }

        if (dto.data) {
            empleador.data = { ...empleador.data, ...dto.data }; // puedes reemplazar si prefieres
        }

        empleador.modificado_por = userId;
        empleador.fecha_update = new Date();

        return this.empleadorRepository.save(empleador);
    }

    async updateCompanyId(usuarioId: number, empresaId: number): Promise<void> {
        await this.usuarioRepository.update(usuarioId, { id_empresa: empresaId });
    }

    async findAllEmployers(
        empleadorId: number,
        pageOptions: PageOptionsDto
    ): Promise<PageDto<Empleador>> {
        const queryBuilder = this.empleadorRepository.createQueryBuilder('empleador')
            .leftJoinAndSelect('empleador.usuario', 'usuario')
            .leftJoinAndSelect('empleador.empresa', 'empresa')
            .where('empleador.id = :empleadorId', { empleadorId })
            .skip(pageOptions.skip)
            .take(pageOptions.take);

        const [entities, total] = await queryBuilder.getManyAndCount();

        const meta = new PageMetaDto({
            pageOptionsDto: pageOptions,
            itemCount: total,
        });

        return new PageDto(entities, meta);
    }





}
