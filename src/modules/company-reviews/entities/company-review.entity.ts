// src/modules/company-reviews/entities/company-review.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export type ReviewType = 'trabajo' | 'postulacion';

@Entity('company_reviews')
@Index(['employerUserId'])
export class CompanyReview {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true, name: 'id' })
  id: number;

  @Column({ type: 'int', unsigned: true, name: 'employer_user_id' })
  employerUserId: number;

  @Column({ type: 'int', unsigned: true, name: 'reviewer_user_id', nullable: true })
  reviewerUserId: number | null;

  @Column({ type: 'enum', enum: ['trabajo', 'postulacion'], name: 'type' })
  type: ReviewType;

  @Column({ type: 'json', name: 'data' })
  data: Record<string, number>;

  @Column({ type: 'decimal', precision: 3, scale: 2, name: 'overall' })
  overall: number;

  @Column({ type: 'text', name: 'comentario', nullable: true })
  comentario: string | null;

  @Column({ type: 'boolean', name: 'is_visible', default: () => '1' })
  isVisible: boolean;

  @Column({ type: 'varchar', length: 128, name: 'ip_hash', nullable: true })
  ipHash: string | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
