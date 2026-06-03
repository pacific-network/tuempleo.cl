import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { Promocion } from 'src/repository/promocion/promocion.entity';
import { SystemConfigService } from '../system-config/system-config.service';

@Injectable()
export class PromocionService {
    constructor(
        @InjectRepository(Promocion)
        private readonly promoRepo: Repository<Promocion>,
        private readonly systemConfigService: SystemConfigService,
    ) { }

    /**
     * 🎁 Regalo de bienvenida para empresas nuevas.
     * El contenido (tipo/cantidad/días) y el on-off vienen de la config global
     * (clave WELCOME_PROMO), administrable desde el panel admin.
     * Idempotente: si la empresa ya tiene una promo de bienvenida, no crea otra.
     */
    async otorgarBienvenida(empresaId: number): Promise<Promocion | null> {
        const cfg = await this.systemConfigService.getWelcomePromo();
        // Campaña desactivada por el admin → no se otorga nada.
        if (!cfg.enabled) return null;

        const yaTiene = await this.promoRepo.findOne({
            where: { empresa: { id: empresaId }, origen: 'AUTO_REGISTRO' },
        });
        if (yaTiene) return null;

        const inicio = new Date();
        const fin = new Date(inicio);
        fin.setDate(fin.getDate() + cfg.dias);

        const promo = this.promoRepo.create({
            empresa: { id: empresaId } as any,
            tipoAviso: cfg.tipoAviso,
            cantidad: cfg.cantidad,
            cantidad_usada: 0,
            fecha_inicio: inicio,
            fecha_fin: fin,
            origen: 'AUTO_REGISTRO',
            otorgada_por: null,
            motivo: 'Regalo de bienvenida',
        });

        return this.promoRepo.save(promo);
    }

    /**
     * ➖ Consume 1 cupo de una promo vigente del tipo dado, si existe.
     * Vigente = dentro de [fecha_inicio, fecha_fin] y con saldo (cantidad - cantidad_usada > 0).
     * FIFO: usa primero la que vence antes.
     * @returns la Promocion consumida; null si no había promo aplicable.
     */
    async consumirSiVigente(
        empresaId: number,
        tipoAviso: 'BASICO' | 'ESTANDAR' | 'PREMIUM',
    ): Promise<Promocion | null> {
        const ahora = new Date();

        const candidatas = await this.promoRepo.find({
            where: {
                empresa: { id: empresaId },
                tipoAviso,
                fecha_inicio: LessThanOrEqual(ahora),
                fecha_fin: MoreThan(ahora),
            },
            order: { fecha_fin: 'ASC' },
        });

        const promo = candidatas.find(
            (p) => p.cantidad - p.cantidad_usada > 0,
        );
        if (!promo) return null;

        promo.cantidad_usada += 1;
        return this.promoRepo.save(promo);
    }

    /**
     * 🔍 Promociones vigentes con saldo (para mostrar en disponibilidad).
     */
    async getVigentes(empresaId: number): Promise<Promocion[]> {
        const ahora = new Date();

        const promos = await this.promoRepo.find({
            where: {
                empresa: { id: empresaId },
                fecha_inicio: LessThanOrEqual(ahora),
                fecha_fin: MoreThan(ahora),
            },
            order: { fecha_fin: 'ASC' },
        });

        return promos.filter((p) => p.cantidad - p.cantidad_usada > 0);
    }
}
