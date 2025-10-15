import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, Repository } from 'typeorm';
import { EmployerPlanLedger } from './entities/employer-plan-ledger.entity';
import { OfferPolicy } from './entities/offer-policy.entity';
import { OfferProfileView } from './entities/offer-profile-view.entity';
import { PaymentIntent } from './entities/payment-intent.entity';
import { PaymentTxn } from './entities/payment-txn.entity';

export type PlanKey = 'FREE' | 'BASICA' | 'ESTANDAR' | 'PREMIUM';

export interface PlanPolicy {
  planKey: PlanKey;
  price: number;
  durationDays: number;
  reviewHours: number;
  requireSalary: boolean;
  questionPriority: 1 | 2 | 3 | null;
  profilesLimit: number | null;
  profileRecommendations: boolean;
  freeMonthlyQuota?: number;
}

@Injectable()
export class PublicationService {
  constructor(
    @InjectRepository(EmployerPlanLedger) private readonly ledgerRepo: Repository<EmployerPlanLedger>,
    @InjectRepository(OfferPolicy) private readonly policyRepo: Repository<OfferPolicy>,
    @InjectRepository(OfferProfileView) private readonly viewRepo: Repository<OfferProfileView>,
    @InjectRepository(PaymentIntent) private readonly intentRepo: Repository<PaymentIntent>,
    @InjectRepository(PaymentTxn) private readonly txnRepo: Repository<PaymentTxn>,
  ) {}

  // ===== Catálogo =====
  getPolicyFor(planKey: PlanKey): PlanPolicy {
    const map: Record<PlanKey, PlanPolicy> = {
      FREE:     { planKey: 'FREE',     price: 0,      durationDays: 30, reviewHours: 48, requireSalary: true,  questionPriority: null, profilesLimit: 5,        profileRecommendations: false, freeMonthlyQuota: 3 },
      BASICA:   { planKey: 'BASICA',   price: 80000,  durationDays: 45, reviewHours: 0,  requireSalary: true,  questionPriority: 3,    profilesLimit: null,     profileRecommendations: false },
      ESTANDAR: { planKey: 'ESTANDAR', price: 140000, durationDays: 45, reviewHours: 0,  requireSalary: false, questionPriority: 2,    profilesLimit: null,     profileRecommendations: true  },
      PREMIUM:  { planKey: 'PREMIUM',  price: 180000, durationDays: 60, reviewHours: 0,  requireSalary: false, questionPriority: 1,    profilesLimit: null,     profileRecommendations: true  },
    };
    return map[planKey];
  }

  // ===== Helpers =====
  private async getEmpresaIdByEmployer(employerId: number): Promise<number> {
    const rows = await this.ledgerRepo.query('SELECT empresa_id FROM empleador WHERE id = ? LIMIT 1', [employerId]);
    const empresa = rows?.[0]?.empresa_id;
    if (!empresa) throw new BadRequestException('Employer sin empresa asociada.');
    return Number(empresa);
  }

  private async getEmployersByEmpresa(empresaId: number): Promise<number[]> {
    const rows = await this.ledgerRepo.query('SELECT id FROM empleador WHERE empresa_id = ?', [empresaId]);
    return rows.map((r: any) => Number(r.id));
  }

  private async getUsuarioIdByEmployer(employerId: number): Promise<number | null> {
    const rows = await this.ledgerRepo.query('SELECT usuario_id FROM empleador WHERE id = ? LIMIT 1', [employerId]);
    return rows?.[0]?.usuario_id ?? null;
  }

  private async getUsuariosIdsByEmpresa(empresaId: number): Promise<number[]> {
    const rows = await this.ledgerRepo.query('SELECT usuario_id FROM empleador WHERE empresa_id = ? AND usuario_id IS NOT NULL', [empresaId]);
    return rows.map((r: any) => Number(r.usuario_id)).filter(Boolean);
  }

  private normalizePlanName(nombre?: string): PlanKey | null {
    const n = (nombre||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toUpperCase();
    if (n.includes('BASICA')) return 'BASICA';
    if (n.includes('ESTANDAR')) return 'ESTANDAR';
    if (n.includes('PREMIUM')) return 'PREMIUM';
    if (n.includes('FREE') || n.includes('GRATIS')) return 'FREE';
    return null;
  }

  // ===== Disponibilidad para el picker =====
  async getAvailability(employerId: number, empresaId: number) {
    if (!employerId || !empresaId) throw new BadRequestException('employerId/empresaId requeridos');

    // FREE por EMPRESA y mes (3)
    const freeRows = await this.ledgerRepo.query(
      `SELECT COUNT(*) AS c
         FROM offer_policy op
         JOIN oferta o ON o.id=op.oferta_id
        WHERE op.plan_key='FREE'
          AND o.empresa_id=?
          AND YEAR(o.fecha_publicacion)=YEAR(CURRENT_DATE())
          AND MONTH(o.fecha_publicacion)=MONTH(CURRENT_DATE())`,
      [empresaId]
    );
    const FREE = Math.max(0, 3 - Number(freeRows?.[0]?.c || 0));

    // Ledgers RESERVADOS (tickets internos no usados)
    const ledgers = await this.ledgerRepo.find({
      where: { employerId, ofertaId: IsNull(), status: In(['RESERVED']) },
    });
    const PAID = { BASICA: { ledgerIds: [] as number[] }, ESTANDAR: { ledgerIds: [] as number[] }, PREMIUM: { ledgerIds: [] as number[] } };
    ledgers.forEach(l => { const k = l.planKey as PlanKey; if (PAID[k]) PAID[k].ledgerIds.push(l.id); });

    // Órdenes AUTHORIZED conocidas y no usadas (desde employer_plan_ledger)
    const usedRows = await this.ledgerRepo.query(
      `SELECT COALESCE(order_id, buy_order) AS oid FROM employer_plan_ledger WHERE (order_id IS NOT NULL OR buy_order IS NOT NULL)`,
    );
    const used = new Set<string>(usedRows.map((r: any) => String(r.oid)).filter(Boolean));

    // AUTHORIZED en payment_intents (preferido)
    const intents = await this.ledgerRepo.query(
      `SELECT pi.orderId, p.nombre AS plan_name
         FROM payment_intents pi
         LEFT JOIN planes p ON p.id = pi.plan_id
        WHERE pi.empresa_id = ? AND pi.status='AUTHORIZED'`,
      [empresaId],
    );
    const AUTHORIZED: Record<'BASICA'|'ESTANDAR'|'PREMIUM', string[]> = { BASICA:[], ESTANDAR:[], PREMIUM:[] };
    intents.forEach((it: any) => {
      const k = this.normalizePlanName(it.plan_name);
      const oid = String(it.orderId || '');
      if (k && oid && !used.has(oid) && k !== 'FREE') AUTHORIZED[k].push(oid);
    });

    // Fallback: AUTHORIZED en transactions por usuarios de la empresa (usa orderId/sessionId)
    const haveAuth = AUTHORIZED.BASICA.length + AUTHORIZED.ESTANDAR.length + AUTHORIZED.PREMIUM.length > 0;
    if (!haveAuth) {
      const usuarios = await this.getUsuariosIdsByEmpresa(empresaId);
      const also = await this.getUsuarioIdByEmployer(employerId);
      if (also && !usuarios.includes(also)) usuarios.push(also);

      if (usuarios.length) {
        // mapear precios -> plan
        const prices = await this.ledgerRepo.query(`SELECT nombre, precio FROM planes`);
        const priceToKey = new Map<number, PlanKey>();
        prices.forEach((p: any)=>{ const k = this.normalizePlanName(p.nombre); if (k && k !== 'FREE') priceToKey.set(Number(p.precio), k); });

        const ph = usuarios.map(()=> '?').join(',');
        const tx = await this.txnRepo.query(
          `SELECT orderId, amount, status, sessionId
             FROM transactions
            WHERE status='AUTHORIZED' AND sessionId IN (${ph})`,
          usuarios,
        );
        tx.forEach((t: any) => {
          const k = priceToKey.get(Number(t.amount));
          const oid = String(t.orderId || '');
          if (k && oid && !used.has(oid)) AUTHORIZED[k].push(oid);
        });
      }
    }

    return { FREE, PAID, AUTHORIZED };
  }

  // ===== Cupo FREE por employer (compat) =====
  async getFreeRemainingThisMonth(employerId: number) {
    const empresaId = await this.getEmpresaIdByEmployer(employerId);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const employers = await this.getEmployersByEmpresa(empresaId);
    if (!employers.length) return { quota: 3, used: 0, remaining: 3 };

    const used = await this.ledgerRepo.count({
      where: { planKey: 'FREE', status: 'CONFIRMED', employerId: In(employers), createdAt: Between(start, end) },
    });
    return { quota: 3, used, remaining: Math.max(3 - used, 0) };
  }

  // ===== Reservas & validación pagos (opcional) =====
  async reservePublication(employerId: number, planKey: PlanKey) {
    if (!employerId) throw new BadRequestException('employerId requerido');
    if (!planKey) throw new BadRequestException('planKey requerido');

    if (planKey === 'FREE') {
      const { remaining } = await this.getFreeRemainingThisMonth(employerId);
      if (remaining <= 0) throw new BadRequestException('Ya utilizaste tus 3 publicaciones gratuitas de este mes.');
    }

    const saved = await this.ledgerRepo.save(this.ledgerRepo.create({
      employerId, planKey, qty: 1, status: 'RESERVED', ofertaId: null, orderId: null, buyOrder: null,
    }));
    return { reservationId: saved.id, policy: this.getPolicyFor(planKey) };
  }

  async validatePaidAndReserve(dto: { employerId: number; planKey: PlanKey; orderId: string }) {
    const { employerId, planKey, orderId } = dto;
    if (planKey === 'FREE') throw new BadRequestException('Para FREE usa /reservations');

    const empresaOwner = await this.getEmpresaIdByEmployer(employerId);

    const intent = await this.intentRepo.findOne({ where: { orderId, status: 'AUTHORIZED' } });
    if (!intent) throw new BadRequestException('Orden no autorizada o inexistente.');
    if (Number(intent.empresaId) !== Number(empresaOwner)) {
      throw new BadRequestException('La orden no corresponde a la empresa del empleador.');
    }

    const reused = await this.ledgerRepo.findOne({ where: [{ orderId }, { buyOrder: orderId }] as any });
    if (reused) throw new BadRequestException('Esta orden ya fue utilizada.');

    const saved = await this.ledgerRepo.save(this.ledgerRepo.create({
      employerId, planKey, qty: 1, status: 'RESERVED', ofertaId: null, orderId, buyOrder: orderId,
    }));
    return { reservationId: saved.id, policy: this.getPolicyFor(planKey) };
  }

  // ===== Confirmación =====
  async confirmPublication(params: { reservationId: number; ofertaId: number }) {
    const { reservationId, ofertaId } = params;
    const ledger = await this.ledgerRepo.findOne({ where: { id: reservationId } });
    if (!ledger) throw new NotFoundException('Reserva no encontrada');
    if (ledger.status === 'CONFIRMED') return { ok: true, alreadyConfirmed: true };

    const ownerEmployerId = await this.getOfferOwnerEmployer(ofertaId);
    const empresaOwner = await this.getEmpresaIdByEmployer(ownerEmployerId);

    if (ledger.planKey !== 'FREE') {
      let ok = false;

      if (ledger.orderId || ledger.buyOrder) {
        const oid = String(ledger.orderId ?? ledger.buyOrder ?? '');

        const intent = await this.intentRepo.findOne({ where: { orderId: oid, status: 'AUTHORIZED' } });
        if (intent) {
          if (Number(intent.empresaId) !== Number(empresaOwner)) throw new BadRequestException('La orden no pertenece a la empresa dueña de la oferta.');
          ok = true;
        } else {
          // Fallback: buscar en transactions (orderId/sessionId)
          const usuarios = await this.getUsuariosIdsByEmpresa(empresaOwner);
          if (usuarios.length) {
            const ph = usuarios.map(()=>'?').join(',');
            const tx = await this.txnRepo.query(
              `SELECT orderId, status, sessionId FROM transactions
                WHERE orderId = ? AND status='AUTHORIZED' AND sessionId IN (${ph}) LIMIT 1`,
              [oid, ...usuarios],
            );
            if (tx?.length) ok = true;
          }
        }
      }
      if (!ok) throw new BadRequestException('No se pudo validar la orden asociada.');
    }

    // Confirmar ledger
    ledger.status = 'CONFIRMED';
    (ledger as any).ofertaId = ofertaId;
    await this.ledgerRepo.save(ledger);

    // Snapshot de política
    const policyCfg = this.getPolicyFor(ledger.planKey as PlanKey);
    await this.policyRepo.save(
      this.policyRepo.create({
        ofertaId,
        employerId: ownerEmployerId,
        planKey: policyCfg.planKey,
        policyJson: {
          durationDays: policyCfg.durationDays,
          reviewHours: policyCfg.reviewHours,
          requireSalary: policyCfg.requireSalary,
          questionPriority: policyCfg.questionPriority,
          profilesLimit: policyCfg.profilesLimit,
          profileRecommendations: policyCfg.profileRecommendations,
        },
      }),
    );

    // Aplicar flags visibles
    const now = new Date();
    const reviewUntil = policyCfg.reviewHours > 0 ? new Date(now.getTime() + policyCfg.reviewHours * 3600_000) : null;
    const expiresAt = new Date(now.getTime() + policyCfg.durationDays * 24 * 3600_000);

    await this.ledgerRepo.query(
      `UPDATE oferta
         SET review_until = ?,
             expires_at = ?,
             preguntas_habilitadas = ?,
             prioridad_busqueda = ?,
             recomendacion_perfiles = ?,
             restricciones_json = ?
       WHERE id = ?`,
      [
        reviewUntil,
        expiresAt,
        policyCfg.questionPriority !== null ? 1 : 0,
        policyCfg.questionPriority,
        policyCfg.profileRecommendations ? 1 : 0,
        JSON.stringify({ requireSalary: policyCfg.requireSalary }),
        ofertaId,
      ],
    );

    return { ok: true };
  }

  // ===== Publicación directa (orquesta FREE/ledger/order) =====
  async publishOffer(body: any) {
    const employerId = Number(body?.employerId);
    const empresaId  = Number(body?.empresaId);
    const selection  = body?.selection || {};
    const oferta     = body?.oferta || {};
    const planKey = String(selection?.planKey || '').toUpperCase() as PlanKey;

    if (!employerId || !empresaId) throw new BadRequestException('employerId/empresaId requeridos');
    if (!['FREE','BASICA','ESTANDAR','PREMIUM'].includes(planKey)) throw new BadRequestException('Plan inválido');
    if (!oferta?.titulo) throw new BadRequestException('Falta título');

    // FREE por empresa
    if (planKey === 'FREE') {
      const avail = await this.getAvailability(employerId, empresaId);
      if (avail.FREE <= 0) throw new ForbiddenException('No te quedan avisos gratis este mes');
    }

    const ledgerId = selection?.ledgerId ? Number(selection.ledgerId) : null;
    const orderId  = selection?.orderId ? String(selection.orderId) : null;
    if (planKey !== 'FREE' && !ledgerId && !orderId) {
      throw new BadRequestException('Falta ledgerId u orderId autorizado');
    }

    // Validaciones para pagados
    if (planKey !== 'FREE' && orderId) {
      // intenta validar por payment_intents
      const intent = await this.intentRepo.findOne({ where: { orderId, status: 'AUTHORIZED' } });
      if (intent) {
        const planRow = await this.ledgerRepo.query(`SELECT nombre FROM planes WHERE id = ? LIMIT 1`, [intent.planId]);
        const mapped = this.normalizePlanName(planRow?.[0]?.nombre);
        if (mapped !== planKey) throw new ForbiddenException('El tipo de plan de la orden no coincide');
        if (Number(intent.empresaId) !== empresaId) throw new ForbiddenException('La orden no corresponde a tu empresa');
      } else {
        // fallback: transactions (orderId/sessionId)
        const usuarios = await this.getUsuariosIdsByEmpresa(empresaId);
        const also = await this.getUsuarioIdByEmployer(employerId);
        if (also && !usuarios.includes(also)) usuarios.push(also);
        if (!usuarios.length) throw new ForbiddenException('No hay usuarios asociados a la empresa para validar la orden');

        const prices = await this.ledgerRepo.query(`SELECT nombre, precio FROM planes`);
        const priceToKey = new Map<number, PlanKey>();
        prices.forEach((p: any)=>{ const k = this.normalizePlanName(p.nombre); if (k && k !== 'FREE') priceToKey.set(Number(p.precio), k); });

        const ph = usuarios.map(()=>'?').join(',');
        const tx = await this.txnRepo.query(
          `SELECT orderId, amount, status, sessionId
             FROM transactions
            WHERE status='AUTHORIZED' AND orderId = ? AND sessionId IN (${ph})
            LIMIT 1`,
          [orderId, ...usuarios],
        );
        if (!tx?.length) throw new ForbiddenException('Orden no autorizada o no pertenece a tu empresa');
        const k = priceToKey.get(Number(tx[0].amount));
        if (k !== planKey) throw new ForbiddenException('El tipo de plan de la orden no coincide (tx)');
      }
    }

    if (planKey !== 'FREE' && ledgerId) {
      const ok = await this.ledgerRepo.findOne({ where: { id: ledgerId, employerId, planKey, ofertaId: IsNull() } });
      if (!ok) throw new ForbiddenException('Ledger inválido o ya usado');
    }

    // Crear oferta
    const rules = this.getPolicyFor(planKey);
    const now = new Date();
    const expires = new Date(now.getTime() + rules.durationDays*24*3600*1000);
    const reviewUntil = rules.reviewHours ? new Date(now.getTime() + rules.reviewHours*3600*1000) : null;

    const res = await this.ledgerRepo.query(
      `INSERT INTO oferta
       (titulo, fecha_publicacion, duracion_publicacion, es_activa, fecha_cierre, data,
        empresa_id, empleador_id, status, review_until, expires_at, preguntas_habilitadas,
        prioridad_busqueda, recomendacion_perfiles, restricciones_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        String(oferta.titulo).slice(0,255),
        now, rules.durationDays, 1, expires,
        JSON.stringify(oferta.data||{}),
        empresaId, employerId,
        'published',
        reviewUntil, expires,
        rules.questionPriority !== null ? 1 : 0,
        rules.questionPriority,
        rules.profileRecommendations ? 1 : 0,
        JSON.stringify({ requireSalary: rules.requireSalary }),
      ],
    );
    const ofertaId = Number(res.insertId);

    // Snapshot policy
    await this.policyRepo.save(
      this.policyRepo.create({
        ofertaId, employerId, planKey, policyJson: {
          durationDays: rules.durationDays,
          reviewHours: rules.reviewHours,
          requireSalary: rules.requireSalary,
          questionPriority: rules.questionPriority,
          profilesLimit: rules.profilesLimit,
          profileRecommendations: rules.profileRecommendations,
        },
      }),
    );

    // Consumir cupo
    if (planKey === 'FREE') {
      await this.ledgerRepo.save(this.ledgerRepo.create({
        employerId, planKey: 'FREE', qty: 1, status: 'CONFIRMED', ofertaId, orderId: null, buyOrder: null,
      }));
    } else if (ledgerId) {
      await this.ledgerRepo.update({ id: ledgerId }, { ofertaId, status: 'CONFIRMED' });
    } else if (orderId) {
      await this.ledgerRepo.query(`UPDATE payment_intents SET oferta_id=? WHERE orderId=?`, [ofertaId, orderId]);
      await this.ledgerRepo.save(this.ledgerRepo.create({
        employerId, planKey, qty: 1, status: 'CONFIRMED', ofertaId, orderId, buyOrder: orderId,
      }));
    }

    return { ok: true, ofertaId };
  }

  // ===== Política / vistas =====
  async getOfferViewUsage(ofertaId: number) {
    const owner = await this.getOfferOwnerEmployer(ofertaId);
    const policy = await this.policyRepo.findOne({ where: { ofertaId } });
    if (!policy) throw new NotFoundException('Policy no encontrada');
    if (Number(policy.employerId) !== owner) {
      policy.employerId = owner;
      await this.policyRepo.save(policy);
    }
    const limit = policy.policyJson?.profilesLimit ?? null;

    const rows = await this.viewRepo.query(
      'SELECT COUNT(*) AS used FROM offer_profile_view WHERE oferta_id = ? AND employer_id = ?',
      [ofertaId, owner],
    );
    const used = Number(rows?.[0]?.used ?? 0);
    if (limit === null) return { used, remaining: null, limit: null, unlimited: true };
    return { used, remaining: Math.max(limit - used, 0), limit, unlimited: false };
  }

  async unlockProfileView(params: { ofertaId: number; postulanteId: number }) {
    const { ofertaId, postulanteId } = params;
    const owner = await this.getOfferOwnerEmployer(ofertaId);
    const pol = await this.policyRepo.findOne({ where: { ofertaId } });
    if (!pol) throw new NotFoundException('Policy no encontrada');
    const limit = pol.policyJson?.profilesLimit ?? null;

    const usedRow = await this.viewRepo.query(
      'SELECT COUNT(*) AS used FROM offer_profile_view WHERE oferta_id = ? AND employer_id = ?',
      [ofertaId, owner],
    );
    const used = Number(usedRow?.[0]?.used ?? 0);
    if (limit !== null && used >= limit) return { allowed: false, reason: 'LIMIT_REACHED', usage: { used, remaining: 0, limit } };

    await this.viewRepo.query(
      'INSERT IGNORE INTO offer_profile_view (oferta_id, employer_id, postulante_id) VALUES (?, ?, ?)',
      [ofertaId, owner, postulanteId],
    );

    if (limit === null) return { allowed: true, usage: { unlimited: true } };

    const afterRow = await this.viewRepo.query(
      'SELECT COUNT(*) AS used FROM offer_profile_view WHERE oferta_id = ? AND employer_id = ?',
      [ofertaId, owner],
    );
    const usedAfter = Number(afterRow?.[0]?.used ?? 0);
    return { allowed: true, usage: { used: usedAfter, remaining: Math.max(limit - usedAfter, 0), limit } };
  }

  async getPolicySnapshotForOffer(ofertaId: number) {
    const owner = await this.getOfferOwnerEmployer(ofertaId);
    let policy = await this.policyRepo.findOne({ where: { ofertaId } });
    if (!policy) throw new NotFoundException('Policy no encontrada');
    if (Number(policy.employerId) !== owner) {
      policy.employerId = owner;
      policy = await this.policyRepo.save(policy);
    }

    const rows = await this.ledgerRepo.query(
      `SELECT review_until, expires_at, preguntas_habilitadas, prioridad_busqueda, recomendacion_perfiles, restricciones_json
         FROM oferta WHERE id = ? LIMIT 1`,
      [ofertaId],
    );
    const meta = rows?.[0] ?? {};
    return {
      ofertaId,
      employerId: owner,
      planKey: policy.planKey,
      policy: policy.policyJson,
      ofertaMeta: {
        reviewUntil: meta?.review_until ?? null,
        expiresAt: meta?.expires_at ?? null,
        preguntasHabilitadas: !!meta?.preguntas_habilitadas,
        prioridadBusqueda: meta?.prioridad_busqueda ?? null,
        recomendacionPerfiles: !!meta?.recomendacion_perfiles,
        restricciones: meta?.restricciones_json ?? null,
      },
    };
  }

  // ===== Postulantes con tope (para FREE) =====
  async listPostulantes(ofertaId: number) {
    const pol = await this.policyRepo.findOne({ where: { ofertaId } });
    if (!pol) throw new NotFoundException('Policy no encontrada');
    const limit = pol.policyJson?.profilesLimit ?? null;

    const totalRow = await this.ledgerRepo.query(
      `SELECT COUNT(*) as c FROM postulacion WHERE oferta_id=?`, [ofertaId],
    );
    const total = Number(totalRow?.[0]?.c || 0);

    const lim = limit === null ? 18446744073709551615n : Number(limit);
    const visibles = await this.ledgerRepo.query(
      `SELECT id, fecha_postulacion, postulante_id
         FROM postulacion
        WHERE oferta_id=?
        ORDER BY fecha_postulacion ASC
        LIMIT ?`,
      [ofertaId, lim],
    );
    return { total, visibleLimit: limit, visibles };
  }

  private async getOfferOwnerEmployer(ofertaId: number): Promise<number> {
    const rows = await this.ledgerRepo.query('SELECT empleador_id FROM oferta WHERE id = ? LIMIT 1', [ofertaId]);
    const owner = rows?.[0]?.empleador_id;
    if (!owner) throw new NotFoundException('Oferta no encontrada.');
    return Number(owner);
  }
}
