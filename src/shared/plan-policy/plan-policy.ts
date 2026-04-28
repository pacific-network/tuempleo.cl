export type PlanKey = 'FREE' | 'BASICO' | 'ESTANDAR' | 'PREMIUM';

export type TipoAviso = 'GRATIS' | 'BASICO' | 'ESTANDAR' | 'PREMIUM';

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

export const PLAN_POLICIES: Record<PlanKey, PlanPolicy> = {
  FREE: { planKey: 'FREE', price: 0, durationDays: 30, reviewHours: 48, requireSalary: true, questionPriority: null, profilesLimit: 5, profileRecommendations: false, freeMonthlyQuota: 3 },
  BASICO: { planKey: 'BASICO', price: 80000, durationDays: 45, reviewHours: 0, requireSalary: true, questionPriority: 3, profilesLimit: null, profileRecommendations: false },
  ESTANDAR: { planKey: 'ESTANDAR', price: 140000, durationDays: 45, reviewHours: 0, requireSalary: false, questionPriority: 2, profilesLimit: null, profileRecommendations: true },
  PREMIUM: { planKey: 'PREMIUM', price: 180000, durationDays: 60, reviewHours: 0, requireSalary: false, questionPriority: 1, profilesLimit: null, profileRecommendations: true },
};

export function tipoAvisoToPlanKey(tipo: TipoAviso): PlanKey {
  return tipo === 'GRATIS' ? 'FREE' : tipo;
}

export function getPolicyForTipoAviso(tipo: TipoAviso): PlanPolicy {
  return PLAN_POLICIES[tipoAvisoToPlanKey(tipo)];
}
