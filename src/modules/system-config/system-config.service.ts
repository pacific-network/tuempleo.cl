import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from 'src/repository/system-config/system-config.entity';

export const WELCOME_PROMO_KEY = 'WELCOME_PROMO';

export interface WelcomePromoConfig {
    enabled: boolean;
    tipoAviso: 'BASICO' | 'ESTANDAR' | 'PREMIUM';
    cantidad: number;
    dias: number;
}

const WELCOME_PROMO_DEFAULT: WelcomePromoConfig = {
    enabled: true,
    tipoAviso: 'PREMIUM',
    cantidad: 3,
    dias: 30,
};

@Injectable()
export class SystemConfigService {
    constructor(
        @InjectRepository(SystemConfig)
        private readonly configRepo: Repository<SystemConfig>,
    ) { }

    /** Lee el valor crudo de una clave; null si no existe. */
    async get(clave: string): Promise<string | null> {
        const row = await this.configRepo.findOne({ where: { clave } });
        return row?.valor ?? null;
    }

    /** Crea o actualiza una clave. */
    async set(
        clave: string,
        valor: string,
        updatedBy: number | null = null,
        descripcion?: string,
    ): Promise<SystemConfig> {
        let row = await this.configRepo.findOne({ where: { clave } });
        if (!row) {
            row = this.configRepo.create({ clave, valor, descripcion: descripcion ?? null });
        } else {
            row.valor = valor;
            if (descripcion !== undefined) row.descripcion = descripcion;
        }
        row.updated_by = updatedBy;
        return this.configRepo.save(row);
    }

    /** Todas las claves de configuración (para panel admin). */
    async getAll(): Promise<SystemConfig[]> {
        return this.configRepo.find({ order: { clave: 'ASC' } });
    }

    // ─────────────────────────────────────────
    // Campaña de bienvenida
    // ─────────────────────────────────────────

    /** Config de la promo de bienvenida; retorna defaults si no está seteada. */
    async getWelcomePromo(): Promise<WelcomePromoConfig> {
        const raw = await this.get(WELCOME_PROMO_KEY);
        if (!raw) return { ...WELCOME_PROMO_DEFAULT };
        try {
            return { ...WELCOME_PROMO_DEFAULT, ...JSON.parse(raw) };
        } catch {
            return { ...WELCOME_PROMO_DEFAULT };
        }
    }

    /** Actualiza (parcialmente) la config de la promo de bienvenida. */
    async setWelcomePromo(
        partial: Partial<WelcomePromoConfig>,
        updatedBy: number | null = null,
    ): Promise<WelcomePromoConfig> {
        const actual = await this.getWelcomePromo();
        const merged: WelcomePromoConfig = { ...actual, ...partial };
        await this.set(
            WELCOME_PROMO_KEY,
            JSON.stringify(merged),
            updatedBy,
            'Campaña de bienvenida para empresas nuevas',
        );
        return merged;
    }
}
