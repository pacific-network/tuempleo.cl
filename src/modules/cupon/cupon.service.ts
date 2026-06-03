import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Cupon } from 'src/repository/cupon/cupon.entity';
import { CuponCanje } from 'src/repository/cupon/cupon-canje.entity';
import { Promocion } from 'src/repository/promocion/promocion.entity';
import { Empleador } from 'src/repository/employer/employer.entity';
import { CreateCuponDto } from './dto/create-cupon.dto';

@Injectable()
export class CuponService {
    constructor(
        @InjectRepository(Cupon)
        private readonly cuponRepo: Repository<Cupon>,
        @InjectRepository(CuponCanje)
        private readonly canjeRepo: Repository<CuponCanje>,
        @InjectRepository(Empleador)
        private readonly empleadorRepo: Repository<Empleador>,
        private readonly dataSource: DataSource,
    ) { }

    // ─────────────────────────────────────────
    // ADMIN
    // ─────────────────────────────────────────

    async crear(dto: CreateCuponDto, adminId: number): Promise<Cupon> {
        const codigo = dto.codigo
            ? dto.codigo.trim().toUpperCase()
            : await this.generarCodigoUnico();

        const existente = await this.cuponRepo.findOne({ where: { codigo } });
        if (existente) {
            throw new ConflictException(`Ya existe un cupón con el código ${codigo}`);
        }

        const cupon = this.cuponRepo.create({
            codigo,
            nombre: dto.nombre,
            lineas: dto.lineas,
            dias_vigencia: dto.dias_vigencia ?? 30,
            fecha_expiracion: dto.fecha_expiracion ? new Date(dto.fecha_expiracion) : null,
            max_usos: dto.max_usos ?? null,
            usos_actuales: 0,
            activo: dto.activo ?? true,
            created_by: adminId ?? null,
        });

        return this.cuponRepo.save(cupon);
    }

    async listar(page = 1, limit = 20) {
        const [items, total] = await this.cuponRepo.findAndCount({
            order: { created_at: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async obtener(id: number): Promise<Cupon> {
        const cupon = await this.cuponRepo.findOne({ where: { id } });
        if (!cupon) throw new NotFoundException('Cupón no encontrado');
        return cupon;
    }

    async toggle(id: number): Promise<Cupon> {
        const cupon = await this.obtener(id);
        cupon.activo = !cupon.activo;
        return this.cuponRepo.save(cupon);
    }

    // ─────────────────────────────────────────
    // CANJE (empresa)
    // ─────────────────────────────────────────

    async canjear(codigoInput: string, userId: number) {
        // 1️⃣ Resolver empresa del empleador autenticado.
        const empleador = await this.empleadorRepo.findOne({
            where: { usuario: { id: userId } },
            relations: ['empresa'],
        });
        if (!empleador?.empresa) {
            throw new ForbiddenException('El usuario no está asociado a una empresa');
        }
        const empresaId = empleador.empresa.id;

        // 2️⃣ Buscar y validar el cupón.
        const codigo = codigoInput.trim().toUpperCase();
        const cupon = await this.cuponRepo.findOne({ where: { codigo } });
        if (!cupon) throw new NotFoundException('Cupón no encontrado');
        if (!cupon.activo) throw new BadRequestException('El cupón no está activo');

        const ahora = new Date();
        if (cupon.fecha_expiracion && cupon.fecha_expiracion < ahora) {
            throw new BadRequestException('El cupón está vencido');
        }
        if (cupon.max_usos !== null && cupon.usos_actuales >= cupon.max_usos) {
            throw new BadRequestException('El cupón ya alcanzó su límite de usos');
        }

        const yaCanjeado = await this.canjeRepo.findOne({
            where: { cupon_id: cupon.id, empresa_id: empresaId },
        });
        if (yaCanjeado) {
            throw new BadRequestException('Tu empresa ya canjeó este cupón');
        }

        // 3️⃣ Canje atómico: registrar canje + incrementar usos + crear promos.
        const inicio = new Date();
        const fin = new Date(inicio);
        fin.setDate(fin.getDate() + cupon.dias_vigencia);

        const promosCreadas = await this.dataSource.transaction(async (manager) => {
            // Registrar el canje primero: el índice único (cupon_id, empresa_id)
            // bloquea cualquier doble canje concurrente.
            try {
                await manager.getRepository(CuponCanje).save(
                    manager.getRepository(CuponCanje).create({
                        cupon_id: cupon.id,
                        empresa_id: empresaId,
                        usuario_id: userId,
                    }),
                );
            } catch (e: any) {
                if (e?.code === 'ER_DUP_ENTRY') {
                    throw new BadRequestException('Tu empresa ya canjeó este cupón');
                }
                throw e;
            }

            // Tope de usos con guardia concurrente: solo incrementa si hay cupo.
            if (cupon.max_usos !== null) {
                const res = await manager
                    .createQueryBuilder()
                    .update(Cupon)
                    .set({ usos_actuales: () => 'usos_actuales + 1' })
                    .where('id = :id', { id: cupon.id })
                    .andWhere('usos_actuales < :max', { max: cupon.max_usos })
                    .execute();
                if (!res.affected) {
                    throw new BadRequestException('El cupón ya alcanzó su límite de usos');
                }
            } else {
                await manager
                    .createQueryBuilder()
                    .update(Cupon)
                    .set({ usos_actuales: () => 'usos_actuales + 1' })
                    .where('id = :id', { id: cupon.id })
                    .execute();
            }

            const promoRepo = manager.getRepository(Promocion);
            const creadas: Promocion[] = [];
            for (const linea of cupon.lineas) {
                const promo = promoRepo.create({
                    empresa: { id: empresaId } as any,
                    tipoAviso: linea.tipoAviso,
                    cantidad: linea.cantidad,
                    cantidad_usada: 0,
                    fecha_inicio: inicio,
                    fecha_fin: fin,
                    origen: 'CUPON',
                    otorgada_por: null,
                    motivo: `Canje cupón ${cupon.codigo}`,
                    cupon_id: cupon.id,
                });
                creadas.push(await promoRepo.save(promo));
            }
            return creadas;
        });

        return {
            canjeado: true,
            cupon: { id: cupon.id, codigo: cupon.codigo, nombre: cupon.nombre },
            empresaId,
            vigencia: { inicio, fin },
            promociones: promosCreadas.map((p) => ({
                id: p.id,
                tipoAviso: p.tipoAviso,
                cantidad: p.cantidad,
            })),
        };
    }

    // ─────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────

    /** Genera un código tipo PROMO-XXXX-XXXX único en la tabla. */
    private async generarCodigoUnico(): Promise<string> {
        for (let i = 0; i < 10; i++) {
            const codigo = `PROMO-${this.bloque()}-${this.bloque()}`;
            const existe = await this.cuponRepo.findOne({ where: { codigo } });
            if (!existe) return codigo;
        }
        throw new ConflictException('No se pudo generar un código único, reintenta');
    }

    private bloque(): string {
        const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin O/0/I/1
        const bytes = randomBytes(4);
        let out = '';
        for (let i = 0; i < 4; i++) out += ALFABETO[bytes[i] % ALFABETO.length];
        return out;
    }
}
