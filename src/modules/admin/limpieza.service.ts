// src/modules/admin/limpieza.service.ts
//
// Diagnóstico y limpieza de empresas huérfanas ("zombies").
//
// Contexto: el onboarding (FormsService.registerBusinessAndEmployer) crea la
// empresa y recién después el empleador. Si el segundo paso falla, el rollback
// intenta borrar la empresa — pero `createBusiness` ya le colgó una promoción de
// bienvenida y su stock, cuyas FKs son RESTRICT. El DELETE se vuelve imposible y
// la empresa queda ocupando su RUT (único), bloqueando todo reintento.
//
// Este servicio permite ver qué quedó colgado, por qué, y limpiarlo a mano.
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/** Tabla que referencia a `empresa`, con su comportamiento ante un DELETE. */
interface Dependencia {
    tabla: string;
    columna: string;
    /** true = la FK cascadea sola; false = RESTRICT, bloquea el DELETE. */
    cascade: boolean;
    /** true = su presencia significa que la empresa está en uso real. */
    bloqueaLimpieza: boolean;
    descripcion: string;
}

const DEPENDENCIAS: Dependencia[] = [
    {
        tabla: 'empleador',
        columna: 'empresa_id',
        cascade: false,
        bloqueaLimpieza: true,
        descripcion: 'Empleadores asociados. Si existe, la empresa NO es huérfana.',
    },
    {
        tabla: 'oferta',
        columna: 'empresa_id',
        cascade: false,
        bloqueaLimpieza: true,
        descripcion: 'Ofertas publicadas. Pueden tener postulaciones; nunca se borran acá.',
    },
    {
        tabla: 'promocion',
        columna: 'empresa_id',
        cascade: false,
        bloqueaLimpieza: false,
        descripcion: 'Regalo de bienvenida creado por createBusiness. Causa habitual del bloqueo.',
    },
    {
        tabla: 'stock',
        columna: 'empresa_id',
        cascade: false,
        bloqueaLimpieza: false,
        descripcion: 'Stock de avisos. Se crea junto con la promoción de bienvenida.',
    },
    {
        tabla: 'stock_gratis',
        columna: 'empresa_id',
        cascade: false,
        bloqueaLimpieza: false,
        descripcion: 'Stock gratuito asociado a la empresa.',
    },
    {
        tabla: 'shopping_cart',
        columna: 'empresa_id',
        cascade: false,
        bloqueaLimpieza: false,
        descripcion: 'Carrito de compras. En una empresa huérfana debería estar vacío.',
    },
    {
        tabla: 'invitacion_empleador',
        columna: 'empresa_id',
        cascade: false,
        bloqueaLimpieza: false,
        descripcion: 'Invitaciones pendientes a empleadores.',
    },
    {
        tabla: 'verificacion_empresa',
        columna: 'empresa_id',
        cascade: true,
        bloqueaLimpieza: false,
        descripcion: 'Intentos de verificación por SMS. Su FK ya es CASCADE.',
    },
];

@Injectable()
export class LimpiezaService {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) { }

    /**
     * Empresas sin ningún empleador asociado y con cierta antigüedad mínima.
     * El colchón de tiempo evita listar un onboarding que está ocurriendo ahora.
     */
    async listarEmpresasHuerfanas(minutosMin = 60) {
        const empresas: Array<{
            id: number;
            rut: string;
            razon_social: string;
            fecha_creacion: Date;
        }> = await this.dataSource.query(
            `SELECT e.id, e.rut, e.razon_social, e.fecha_creacion
               FROM empresa e
          LEFT JOIN empleador emp ON emp.empresa_id = e.id
              WHERE emp.id IS NULL
                AND e.fecha_creacion < DATE_SUB(NOW(), INTERVAL ? MINUTE)
           ORDER BY e.fecha_creacion DESC`,
            [minutosMin],
        );

        const detalladas = await Promise.all(
            empresas.map(async (e) => {
                const dependencias = await this.contarDependencias(e.id);
                const bloqueantes = dependencias.filter((d) => d.filas > 0 && !d.cascade);
                return {
                    ...e,
                    motivo: this.explicarMotivo(bloqueantes),
                    bloquean_delete: bloqueantes.map((d) => `${d.tabla} (${d.filas})`),
                    limpiable: dependencias
                        .filter((d) => d.filas > 0)
                        .every((d) => !d.bloqueaLimpieza),
                };
            }),
        );

        return {
            criterio: `Sin empleador asociado y creada hace más de ${minutosMin} min`,
            total: detalladas.length,
            empresas: detalladas,
        };
    }

    /** Detalle de una empresa: qué la referencia y qué pasaría al borrarla. */
    async diagnosticarEmpresa(id: number) {
        const empresa = await this.buscarEmpresa(id);
        const dependencias = await this.contarDependencias(id);

        const conFilas = dependencias.filter((d) => d.filas > 0);
        const bloqueantes = conFilas.filter((d) => !d.cascade);
        const enUso = conFilas.filter((d) => d.bloqueaLimpieza);

        return {
            empresa,
            diagnostico: {
                motivo: this.explicarMotivo(bloqueantes),
                limpiable: enUso.length === 0,
                razon_no_limpiable: enUso.length
                    ? `La empresa está en uso: ${enUso
                        .map((d) => `${d.filas} fila(s) en ${d.tabla}`)
                        .join(', ')}. No se borra desde acá.`
                    : null,
            },
            dependencias: conFilas,
            sin_referencias: dependencias
                .filter((d) => d.filas === 0)
                .map((d) => d.tabla),
        };
    }

    /**
     * Borra una empresa huérfana y sus dependencias de "nacimiento".
     * dryRun=true (default) no escribe nada: solo reporta qué se borraría.
     */
    async eliminarEmpresa(id: number, dryRun = true) {
        const empresa = await this.buscarEmpresa(id);
        const dependencias = await this.contarDependencias(id);

        const enUso = dependencias.filter((d) => d.filas > 0 && d.bloqueaLimpieza);
        if (enUso.length) {
            throw new ConflictException(
                `La empresa ${id} está en uso (${enUso
                    .map((d) => `${d.tabla}: ${d.filas}`)
                    .join(', ')}). No se puede limpiar desde este endpoint.`,
            );
        }

        // Solo hay que borrar a mano lo que no cascadea.
        const aBorrar = dependencias.filter((d) => d.filas > 0 && !d.cascade);

        if (dryRun) {
            return {
                dry_run: true,
                mensaje: 'Simulación: no se modificó nada. Repetir con ?dryRun=false para ejecutar.',
                empresa,
                se_borraria: [
                    ...aBorrar.map((d) => ({ tabla: d.tabla, filas: d.filas })),
                    { tabla: 'empresa', filas: 1 },
                ],
                cascadean_solas: dependencias
                    .filter((d) => d.filas > 0 && d.cascade)
                    .map((d) => ({ tabla: d.tabla, filas: d.filas })),
            };
        }

        const borrado: Array<{ tabla: string; filas: number }> = [];

        await this.dataSource.transaction(async (manager) => {
            for (const dep of aBorrar) {
                const res = await manager.query(
                    `DELETE FROM \`${dep.tabla}\` WHERE \`${dep.columna}\` = ?`,
                    [id],
                );
                borrado.push({ tabla: dep.tabla, filas: res.affectedRows ?? dep.filas });
            }
            const res = await manager.query(`DELETE FROM \`empresa\` WHERE id = ?`, [id]);
            borrado.push({ tabla: 'empresa', filas: res.affectedRows ?? 1 });
        });

        return {
            dry_run: false,
            mensaje: `Empresa ${id} (${empresa.rut}) eliminada. El RUT queda liberado.`,
            empresa,
            borrado,
        };
    }

    // ─────────────────────────────────────────

    private async buscarEmpresa(id: number) {
        const [empresa] = await this.dataSource.query(
            `SELECT id, rut, razon_social, nombre_fantasia, fecha_creacion
               FROM empresa WHERE id = ?`,
            [id],
        );
        if (!empresa) throw new NotFoundException(`Empresa ${id} no encontrada`);
        return empresa;
    }

    /** Cuenta, por cada tabla dependiente, cuántas filas apuntan a esta empresa. */
    private async contarDependencias(empresaId: number) {
        return Promise.all(
            DEPENDENCIAS.map(async (dep) => {
                const [row] = await this.dataSource.query(
                    `SELECT COUNT(*) AS total FROM \`${dep.tabla}\` WHERE \`${dep.columna}\` = ?`,
                    [empresaId],
                );
                return {
                    ...dep,
                    filas: Number(row?.total ?? 0),
                    // Las filas no-cascade se borran explícitamente antes que la empresa,
                    // así que el resultado es correcto se haya corrido o no
                    // `migrate:cascade-empresa` (que convierte varias de estas a CASCADE).
                    efecto_al_borrar: dep.cascade
                        ? 'Se borra en cascada automáticamente'
                        : 'Se limpia explícitamente antes de borrar la empresa',
                };
            }),
        );
    }

    private explicarMotivo(bloqueantes: Array<{ tabla: string; filas: number }>) {
        if (!bloqueantes.length) {
            return 'Sin dependencias bloqueantes: el DELETE de la empresa funcionaría directo.';
        }
        const detalle = bloqueantes.map((d) => `${d.tabla} (${d.filas})`).join(', ');
        return `El DELETE falla por FKs RESTRICT desde: ${detalle}. ` +
            'Típicamente son la promoción de bienvenida y su stock, creados por createBusiness, ' +
            'que impidieron el rollback automático del onboarding.';
    }
}
