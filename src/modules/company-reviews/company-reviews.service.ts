// src/modules/company-reviews/company-reviews.service.ts
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { CompanyReview } from './entities/company-review.entity';
import { CreateCompanyReviewDto } from './dto/create-company-review.dto';
import { Empresa } from 'src/repository/business/business.entity';

@Injectable()
export class CompanyReviewsService {
  constructor(
    @InjectRepository(CompanyReview)
    private readonly repo: Repository<CompanyReview>,
    @InjectRepository(Empresa)
    private readonly empresasRepo: Repository<Empresa>,
  ) {}

  private computeOverall(data: Record<string, number>) {
    const vals = Object.values(data).filter(v => Number.isFinite(v));
    if (vals.length === 0) throw new BadRequestException('Sin estrellas');
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Number(avg.toFixed(2));
  }

  async create(
    employerUserId: number,                 // aquí recibes empresa.id desde el controller (como antes)
    reviewerUserId: number | null,
    dto: CreateCompanyReviewDto,
    ip?: string,
  ) {
    if (!Number.isFinite(reviewerUserId)) {
      throw new UnauthorizedException('Debes iniciar sesión para calificar.');
    }

    // Evita duplicados app-side (además del índice único en DB)
    const already = await this.repo.findOne({
      where: { employerUserId, reviewerUserId: Number(reviewerUserId) },
      select: ['id'],
    });
    if (already) {
      throw new BadRequestException('Ya calificaste esta empresa.');
    }

    const overall = this.computeOverall(dto.data);
    const ipHash = ip ? crypto.createHash('sha256').update(ip).digest('hex') : null;

    try {
      const review = this.repo.create({
        employerUserId,
        reviewerUserId: Number(reviewerUserId),
        type: dto.type,
        data: dto.data,
        overall,
        motivo: dto.motivo,
        motivoExtra: dto.motivo === 'otro' ? (dto.motivo_extra || null) : null,
        comentario: dto.comentario ?? null,
        ipHash,
        isVisible: true,
      });
      return await this.repo.save(review);
    } catch (err: any) {
      if (err?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Ya calificaste esta empresa.');
      }
      throw err;
    }
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
      select: ['id','type','data','overall','motivo','motivoExtra','comentario','createdAt'],
    });
    return { items, total, page, limit };
  }
}
