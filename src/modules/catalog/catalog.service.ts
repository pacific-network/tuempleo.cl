import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { Region } from '../../repository/catalog/region.entity'
import { Comuna } from '../../repository/catalog/commune.entity'
import { EducationalInstitutionType, InstitucionEducacional } from '../../repository/catalog/educational-institution.entity'
import { BusinessActivity } from '../../repository/catalog/company_activity'
import { WorkArea } from '../../repository/catalog/work-area.entity'

@Injectable()
export class CatalogService {
    constructor(
        @InjectRepository(Region)
        private readonly regionRepo: Repository<Region>,

        @InjectRepository(Comuna)
        private readonly comunaRepo: Repository<Comuna>,

        @InjectRepository(InstitucionEducacional)
        private readonly institucionRepo: Repository<InstitucionEducacional>,

        @InjectRepository(BusinessActivity)
        private readonly activityRepo: Repository<BusinessActivity>,

        @InjectRepository(WorkArea)
        private readonly jobAreaRepo: Repository<WorkArea>,
    ) { }

    // =====================
    // Regiones + Comunas
    // =====================
    async getRegions() {
        return this.regionRepo.find({
            where: { activo: true },
            order: { orden: 'ASC' },
        })
    }

    async getRegionsWithComunas() {
        return this.regionRepo.find({
            where: { activo: true },
            relations: ['comunas'],
            order: {
                orden: 'ASC',
                comunas: { orden: 'ASC' },
            },
        })
    }

    async getComunasByRegion(regionId: number) {
        return this.comunaRepo.find({
            where: {
                activo: true,
                region: { id: regionId },
            },
            order: { orden: 'ASC' },
        })
    }

    // =====================
    // Instituciones Educacionales
    // =====================
    async getEducationalInstitutions() {
        return this.institucionRepo.find({
            where: { activo: true },
            order: { nombre: 'ASC' },
        })
    }

    async getEducationalInstitutionsByType(
        tipo: EducationalInstitutionType,
    ) {
        return this.institucionRepo.find({
            where: {
                activo: true,
                tipo,
            },
            order: { nombre: 'ASC' },
        })
    }


    // =====================
    // Actividades Empresa
    // =====================
    async getBusinessActivities() {
        return this.activityRepo.find({
            where: { activo: true },
            order: { nombre: 'ASC' },
        })
    }

    // =====================
    // Areas de Trabajo
    // =====================
    async getWorkAreas(search?: string) {
        const qb = this.jobAreaRepo
            .createQueryBuilder('wa')
            .where('wa.activo = :activo', { activo: true })

        if (search) {
            qb.andWhere('wa.nombre LIKE :search', {
                search: `%${search}%`,
            })
        }

        return qb
            .orderBy('wa.nombre', 'ASC')
            .getMany()
    }

}
