import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
    ParseEnumPipe,
} from '@nestjs/common'

import { CatalogService } from './catalog.service'
import { EducationalInstitutionType } from '../../repository/catalog/educational-institution.entity'

@Controller('v1/catalog')
export class CatalogController {
    constructor(
        private readonly catalogService: CatalogService,
    ) { }

    // =====================
    // Regiones
    // =====================

    @Get('regions')
    getRegions() {
        return this.catalogService.getRegions()
    }

    @Get('regions-with-comunas')
    getRegionsWithComunas() {
        return this.catalogService.getRegionsWithComunas()
    }

    @Get('regions/:regionId/comunas')
    getComunasByRegion(
        @Param('regionId', ParseIntPipe) regionId: number,
    ) {
        return this.catalogService.getComunasByRegion(regionId)
    }

    // =====================
    // Instituciones Educacionales
    // =====================

    @Get('educational-institutions')
    getEducationalInstitutions() {
        return this.catalogService.getEducationalInstitutions()
    }

    @Get('educational-institutions/:tipo')
    getEducationalInstitutionsByType(
        @Param(
            'tipo',
            new ParseEnumPipe([
                'universidad',
                'instituto_profesional',
                'cft',
                'internacional',
                'otra',
            ]),
        )
        tipo: EducationalInstitutionType,
    ) {
        return this.catalogService.getEducationalInstitutionsByType(tipo)
    }

    // =====================
    // Actividades Empresa
    // =====================

    @Get('business-activities')
    getBusinessActivities() {
        return this.catalogService.getBusinessActivities()
    }

    // =====================
    // Áreas de Trabajo
    // =====================

    @Get('job-areas')
    getJobAreas() {
        return this.catalogService.getJobAreas()
    }
}
