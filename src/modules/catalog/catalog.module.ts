import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { CatalogController } from './catalogo.controller'
import { CatalogService } from './catalog.service'

import { Region } from '../../repository/catalog/region.entity'
import { Comuna } from '../../repository/catalog/commune.entity'
import { InstitucionEducacional } from '../../repository/catalog/educational-institution.entity'
import { BusinessActivity } from '../../repository/catalog/company_activity'
import { WorkArea } from '../../repository/catalog/work-area.entity'

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Region,
            Comuna,
            InstitucionEducacional,
            BusinessActivity,
            WorkArea,
        ]),
    ],
    controllers: [CatalogController],
    providers: [CatalogService],
    exports: [CatalogService],
})
export class CatalogModule { }
