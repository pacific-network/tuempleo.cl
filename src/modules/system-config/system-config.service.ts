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

export const CIERRE_AUTOMATICO_KEY = 'CIERRE_AUTOMATICO';

export interface CierreAutomaticoConfig {
    /** Interruptor general. Apagado, el cron no cierra ni notifica nada. */
    enabled: boolean;
    /** Días sin movimiento tras los que se cierra una postulación temprana. */
    diasInactividad: number;
    /** Días que se le dan al empleador para resolver candidatos avanzados. */
    diasGraciaAvanzados: number;
    /** Segundo interruptor, solo para el correo: se puede cerrar sin notificar. */
    notificarEmail: boolean;
    /** message_id de la plantilla Pacific Network para el candidato. */
    messageIdCandidato: string | null;
    /** message_id de la plantilla de aviso al empleador. */
    messageIdEmpleador: string | null;
    /** Techo de correos por ejecución; evita una avalancha en el primer barrido. */
    maxCorreosPorEjecucion: number;
}

const CIERRE_AUTOMATICO_DEFAULT: CierreAutomaticoConfig = {
    enabled: false,
    diasInactividad: 30,
    diasGraciaAvanzados: 5,
    notificarEmail: false,
    messageIdCandidato: null,
    messageIdEmpleador: null,
    maxCorreosPorEjecucion: 200,
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

    // ─────────────────────────────────────────
    // Cierre automático de postulaciones
    // ─────────────────────────────────────────

    /** Config del cierre automático; retorna defaults si no está seteada. */
    async getCierreAutomatico(): Promise<CierreAutomaticoConfig> {
        const raw = await this.get(CIERRE_AUTOMATICO_KEY);
        if (!raw) return { ...CIERRE_AUTOMATICO_DEFAULT };
        try {
            return { ...CIERRE_AUTOMATICO_DEFAULT, ...JSON.parse(raw) };
        } catch {
            return { ...CIERRE_AUTOMATICO_DEFAULT };
        }
    }

    /** Actualiza (parcialmente) la config del cierre automático. */
    async setCierreAutomatico(
        partial: Partial<CierreAutomaticoConfig>,
        updatedBy: number | null = null,
    ): Promise<CierreAutomaticoConfig> {
        const actual = await this.getCierreAutomatico();
        const merged: CierreAutomaticoConfig = { ...actual, ...partial };
        await this.set(
            CIERRE_AUTOMATICO_KEY,
            JSON.stringify(merged),
            updatedBy,
            'Cierre automático de postulaciones: activación, plazos y notificación',
        );
        return merged;
    }
}
