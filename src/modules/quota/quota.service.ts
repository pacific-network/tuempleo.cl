import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CuposUsados } from '../../repository/used_quota/used_quota.entity';
import { Empresa } from 'src/repository/business/business.entity';
import { Oferta } from '../../repository/job_offer/job-offer.entity';
import { Planes } from '../../repository/plans/plans.entity';
import { ConsumeQuotaDto } from './dto/consume-quota.dto';
import { Usuario } from 'src/repository/user/user.entity';

/**
 * Cupos de desbloqueo de candidatos según el tipo de aviso.
 *
 * Estaba repetido en tres métodos y con distinto criterio ante un tipo desconocido:
 * dos devolvían 0 y `consumeQuota` devolvía `undefined`, con lo que la comparación
 * `usados >= undefined` daba false y la oferta quedaba sin tope. Una sola fuente,
 * con `getTotalCupos` como único acceso.
 */
const CUPOS_POR_TIPO_AVISO: Record<string, number> = {
    GRATIS: 10,
    BASICO: 25,
    ESTANDAR: 50,
    PREMIUM: 100,
};

@Injectable()
export class QuotaService {
    constructor(
        @InjectRepository(CuposUsados)
        private readonly quotaRepo: Repository<CuposUsados>,

        @InjectRepository(Empresa)
        private readonly empresaRepo: Repository<Empresa>,

        @InjectRepository(Oferta)
        private readonly ofertaRepo: Repository<Oferta>,

        @InjectRepository(Usuario)
        private readonly usuarioRepo: Repository<Usuario>,
    ) { }

    async consumeQuota(dto: ConsumeQuotaDto) {
        const { empresa_id, oferta_id, usuario_id, action } = dto;

        // 1️⃣ Acciones que consumen cupo
        const accionesQueConsumencupo = ['unlock', 'download'];
        if (!accionesQueConsumencupo.includes(action)) {
            return {
                success: false,
                message: `La acción '${action}' NO consume cupo`,
                used: 0,
            };
        }

        // 2️⃣ Validar empresa
        const empresa = await this.empresaRepo.findOne({ where: { id: empresa_id } });
        if (!empresa) throw new BadRequestException('Empresa no encontrada');

        // 3️⃣ Validar oferta
        const oferta = await this.ofertaRepo.findOne({
            where: { id: oferta_id },
            relations: ['empresa'],
        });

        if (!oferta) throw new BadRequestException('Oferta no encontrada');

        if (oferta.empresa.id !== empresa_id) {
            throw new BadRequestException('La oferta no pertenece a esta empresa');
        }

        // 4️⃣ Cupos según tipo de aviso
        const totalCupos = this.getTotalCupos(oferta.tipo_aviso);

        // 5️⃣ Validar usuario
        const usuario = await this.usuarioRepo.findOne({ where: { id: usuario_id } });
        if (!usuario)
            throw new BadRequestException('Usuario no encontrado');

        // 🚨 6️⃣ NUEVA VALIDACIÓN: evitar doble consumo por usuario
        const yaConsumido = await this.quotaRepo.findOne({
            where: { empresa_id, oferta_id, usuario_id },
        });

        if (yaConsumido) {
            return {
                success: true,
                message: `El usuario ya consumió cupo para esta oferta. No se descuenta nuevamente.`,
                used: await this.quotaRepo.count({ where: { empresa_id, oferta_id } }),
                total: totalCupos,
                duplicated: true
            };
        }

        // 7️⃣ Contar cupos usados de esta oferta
        const usados = await this.quotaRepo.count({
            where: { empresa_id, oferta_id },
        });

        if (usados >= totalCupos) {
            throw new BadRequestException(
                `No quedan cupos disponibles. (${usados}/${totalCupos})`
            );
        }

        // 8️⃣ Registrar consumo real
        const registro = this.quotaRepo.create({
            empresa_id,
            oferta_id,
            usuario_id,
            action,
            count: 1,
        });

        await this.quotaRepo.save(registro);

        return {
            success: true,
            message: `Cupo consumido exitosamente (${action})`,
            used: usados + 1,
            total: totalCupos,
        };
    }

    async isUnlocked(empresa_id: number, oferta_id: number, usuario_id: number) {
        // Validar existencia de empresa, oferta y usuario (opcional)
        const empresa = await this.empresaRepo.findOne({ where: { id: empresa_id } });
        if (!empresa) throw new BadRequestException('Empresa no encontrada');

        const oferta = await this.ofertaRepo.findOne({ where: { id: oferta_id }, relations: ['empresa'] });
        if (!oferta) throw new BadRequestException('Oferta no encontrada');
        if (oferta.empresa.id !== empresa_id)
            throw new BadRequestException('La oferta no pertenece a esta empresa');

        const usuario = await this.usuarioRepo.findOne({ where: { id: usuario_id } });
        if (!usuario) throw new BadRequestException('Usuario no encontrado');

        // Buscar si ya existe un registro de consumo "unlock"
        const registro = await this.quotaRepo.findOne({
            where: { empresa_id, oferta_id, usuario_id, action: 'unlock' },
        });

        return {
            isUnlocked: !!registro,
            used: await this.quotaRepo.count({ where: { empresa_id, oferta_id } }),
            total: oferta ? this.getTotalCupos(oferta.tipo_aviso) : 0,
        };
    }

    // ================================
    // Función auxiliar para total de cupos según tipo de aviso
    // ================================
    private getTotalCupos(tipo_aviso: string) {
        return CUPOS_POR_TIPO_AVISO[tipo_aviso] ?? 0;
    }

    async getRemainingCupos(empresa_id: number, oferta_id: number) {
        // 1️⃣ Buscar oferta
        const oferta = await this.ofertaRepo.findOne({ where: { id: oferta_id }, relations: ['empresa'] });
        if (!oferta) throw new BadRequestException('Oferta no encontrada');
        if (oferta.empresa.id !== empresa_id) throw new BadRequestException('La oferta no pertenece a esta empresa');

        // 2️⃣ Total cupos según tipo de aviso
        const totalCupos = this.getTotalCupos(oferta.tipo_aviso);

        // 3️⃣ Contar cupos usados
        const usados = await this.quotaRepo.count({ where: { empresa_id, oferta_id } });

        return {
            total: totalCupos,
            used: usados,
            remaining: totalCupos - usados
        };
    }




}

