// src/modules/company-reviews/company-reviews.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { CompanyReview } from './entities/company-review.entity';
import { CreateCompanyReviewDto } from './dto/create-company-review.dto';
import { Empresa } from 'src/repository/business/business.entity';   // <— entidad Empresa

@Injectable()
export class CompanyReviewsService {
  constructor(
    @InjectRepository(CompanyReview)
    private readonly repo: Repository<CompanyReview>,
    @InjectRepository(Empresa)
    private readonly empresasRepo: Repository<Empresa>,              // <— repo empresa
  ) {}

  private computeOverall(data: Record<string, number>) {
    const vals = Object.values(data).filter(v => Number.isFinite(v));
    if (vals.length === 0) throw new BadRequestException('Sin estrellas');
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Number(avg.toFixed(2));
  }

  /** 
   * Dado un RUT, intenta devolver la llave que usaremos como employer_user_id.
   * 1) empresa.usuario.id       (si existe relación)
   * 2) empresa.userId           (si existe campo)
   * 3) empresa.empleador.usuario.id (si existe relación)
   * 4) empresa.id               (fallback consistente: usamos companyId como key)
   */
  async resolveEmployerKeyFromRut(rut: string): Promise<number> {
    const empresa = await this.empresasRepo.findOne({
      where: { rut },
      relations: ['usuario', 'empleador', 'empleador.usuario'], // ignora las que no existan
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    const candidates = [
      (empresa as any)?.usuario?.id,
      (empresa as any)?.userId,
      (empresa as any)?.empleador?.usuario?.id,
      (empresa as any)?.empleador?.userId,
      (empresa as any)?.id, // fallback
    ].filter((x) => Number.isFinite(Number(x)));

    return Number(candidates[0]); // siempre habrá al menos empresa.id
  }

  async create(
    employerUserId: number,
    reviewerUserId: number | null,
    dto: CreateCompanyReviewDto,
    ip?: string,
  ) {
    const overall = this.computeOverall(dto.data);
    const ipHash = ip ? crypto.createHash('sha256').update(ip).digest('hex') : null;

    const review = this.repo.create({
      employerUserId,
      reviewerUserId,
      type: dto.type,
      data: dto.data,
      overall,
      comentario: dto.comentario ?? null,
      ipHash,
      isVisible: true,
    });
    return this.repo.save(review);
  }

  async summary(employerUserId: number) {
    const rows = await this.repo.find({
      select: ['overall'],
      where: { employerUserId, isVisible: true },
    });

    const total = rows.length;
    if (total === 0) {
      return { average: 0, total: 0, histogram: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
    }

    let sum = 0;
    const histogram: Record<1|2|3|4|5, number> = { 5:0, 4:0, 3:0, 2:0, 1:0 };
    for (const r of rows) {
      const ov = Number(r.overall);
      sum += ov;
      const bucket = Math.min(5, Math.max(1, Math.round(ov))) as 1|2|3|4|5;
      histogram[bucket]++;
    }
    const average = Number((sum / total).toFixed(2));
    return { average, total, histogram };
  }

  async list(employerUserId: number, page = 1, limit = 10) {
    const [items, total] = await this.repo.findAndCount({
      where: { employerUserId, isVisible: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      select: ['id','type','data','overall','comentario','createdAt'],
    });
    return { items, total, page, limit };
  }
}
