//src/repository/job_offer/job-offer.repository.ts
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { PageDto } from "src/shared/pagination/page.dto";
import { PageOptionsDto } from "src/shared/pagination/page-options.dto";
import { PageMetaDto } from "src/shared/pagination/page-meta.dto";
import { Oferta } from "./job-offer.entity";

export class jobOfferRepository extends Repository<Oferta> {

    constructor(
        @InjectRepository(Oferta)
        private readonly jobOfferRepository: Repository<Oferta>,
    ) {
        super(jobOfferRepository.target, jobOfferRepository.manager, jobOfferRepository.queryRunner);
    }

    public async getJobsOffersPriority(pageOptionsDto: PageOptionsDto): Promise<PageDto<Oferta>> {

        const queryBuilder = this.jobOfferRepository
            .createQueryBuilder('oferta')
            .innerJoin('oferta.empresa', 'empresa')
            .leftJoin('empresa.plan', 'plan')

            // EXTREMADAMENTE IMPORTANTE
            .addSelect('plan.priority', 'plan_priority')

            // SCORE PROFESIONAL
            .addSelect(`
                (
                    (IFNULL(plan.priority, 0) * 100) +
                    (oferta.priority * 10) +
                    GREATEST(0, 30 - DATEDIFF(NOW(), oferta.fecha_publicacion))
                )`,
                'score'
            )

            .where('oferta.es_activa = :activa', { activa: true })
            .andWhere('oferta.fecha_eliminacion IS NULL')

            .orderBy('score', 'DESC')       // 🔥 ORDEN PRINCIPAL
            .addOrderBy('oferta.id', 'DESC') // Desempate limpio

            .skip(pageOptionsDto.skip)
            .take(pageOptionsDto.take);

        const itemCount = await queryBuilder.getCount();
        const { entities } = await queryBuilder.getRawAndEntities();

        const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });

        return new PageDto(entities, pageMetaDto);
    }




}