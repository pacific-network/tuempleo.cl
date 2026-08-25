import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { createHash } from 'crypto';

import { LegalDocument } from 'src/repository/legal/legal-document.entity';
import { ConsentRecord } from 'src/repository/legal/consent-record.entity';
import { AccountDeletionLog } from 'src/repository/legal/account-deletion-log.entity';
import { Usuario, AUTH_PROVIDER_LOCAL } from 'src/repository/user/user.entity';
import { Postulante } from 'src/repository/postulant/postulant.entity';
import { Empleador } from 'src/repository/employer/employer.entity';
import { Curriculum } from 'src/repository/curriculum/curriculum.entity';
import { EncryptService } from 'src/shared/encrypt/encrypt.service';
import { DeleteAccountDto } from './dto/delete-account.dto';

import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LegalService {
  constructor(
    @InjectRepository(LegalDocument)
    private readonly docRepo: Repository<LegalDocument>,

    @InjectRepository(ConsentRecord)
    private readonly consentRepo: Repository<ConsentRecord>,

    @InjectRepository(AccountDeletionLog)
    private readonly deletionLogRepo: Repository<AccountDeletionLog>,

    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,

    @InjectRepository(Postulante)
    private readonly postulanteRepo: Repository<Postulante>,

    @InjectRepository(Empleador)
    private readonly empleadorRepo: Repository<Empleador>,

    @InjectRepository(Curriculum)
    private readonly curriculumRepo: Repository<Curriculum>,

    private readonly ds: DataSource,
    private readonly encrypt: EncryptService,
  ) {}

  // ─── Documents ───

  async getCurrentDocument(type: 'terms' | 'privacy') {
    const doc = await this.docRepo.findOne({
      where: { type, is_current: true },
    });
    if (!doc) throw new NotFoundException(`No hay documento vigente de tipo "${type}"`);
    return doc;
  }

  // ─── Consent ───

  async recordConsent(
    userId: number,
    documentType: 'terms' | 'privacy',
    documentVersion: string,
    accepted: boolean,
    ip?: string,
    userAgent?: string,
  ) {
    const doc = await this.docRepo.findOne({
      where: { type: documentType, version: documentVersion },
    });
    if (!doc) {
      throw new BadRequestException(
        `No existe documento "${documentType}" version "${documentVersion}"`,
      );
    }

    const record = this.consentRepo.create({
      usuario_id: userId,
      document_type: documentType,
      document_version: documentVersion,
      accepted,
      ip_address: ip || null,
      user_agent: userAgent || null,
    });

    return this.consentRepo.save(record);
  }

  async recordInitialConsent(userId: number) {
    const currentDocs = await this.docRepo.find({ where: { is_current: true } });

    for (const doc of currentDocs) {
      const existing = await this.consentRepo.findOne({
        where: {
          usuario_id: userId,
          document_type: doc.type,
          document_version: doc.version,
        },
      });
      if (!existing) {
        await this.consentRepo.save(
          this.consentRepo.create({
            usuario_id: userId,
            document_type: doc.type,
            document_version: doc.version,
            accepted: true,
          }),
        );
      }
    }
  }

  /**
   * Estado del consentimiento por tipo de documento.
   *
   * `needsUpdate` es lo que consume `ConsentChecker` en el frontend para decidir si
   * abre el diálogo de renovación. Antes no se devolvía, así que llegaba `undefined`
   * y el diálogo no se abría nunca: publicar una versión nueva no le pedía a nadie
   * aceptarla y el sistema no notaba la diferencia.
   *
   * `version` es la última versión que el usuario aceptó (`null` si ninguna), no la
   * vigente — esa es `currentVersion`.
   */
  async getConsentStatus(userId: number) {
    const currentDocs = await this.docRepo.find({ where: { is_current: true } });

    const status: Record<
      string,
      {
        accepted: boolean;
        version: string | null;
        currentVersion: string;
        needsUpdate: boolean;
      }
    > = {};

    for (const doc of currentDocs) {
      const ultimoAceptado = await this.consentRepo.findOne({
        where: {
          usuario_id: userId,
          document_type: doc.type,
          accepted: true,
        },
        order: { created_at: 'DESC' },
      });

      const versionAceptada = ultimoAceptado?.document_version ?? null;

      status[doc.type] = {
        accepted: versionAceptada === doc.version,
        version: versionAceptada,
        currentVersion: doc.version,
        needsUpdate: versionAceptada !== doc.version,
      };
    }

    return status;
  }

  async getConsentHistory(userId: number) {
    return this.consentRepo.find({
      where: { usuario_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  // ─── Data Export ───

  async exportUserData(userId: number) {
    const user = await this.usuarioRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const postulante = await this.postulanteRepo.findOne({
      where: { usuario: { id: userId } },
    });

    const empleador = await this.empleadorRepo.findOne({
      where: { usuario: { id: userId } },
      relations: ['empresa'],
    });

    const curriculums = await this.curriculumRepo.find({
      where: { usuario: { id: userId } },
    });

    const consents = await this.consentRepo.find({
      where: { usuario_id: userId },
      order: { created_at: 'DESC' },
    });

    return {
      usuario: {
        id: user.id,
        rut: user.rut,
        nombres: user.nombres,
        apellidos: user.apellidos,
        email: user.email,
        fecha_creacion: user.fecha_creacion,
        perfil_foto: user.perfil_foto,
      },
      postulante: postulante
        ? { id: postulante.id, data: postulante.data, fecha_update: postulante.fecha_update }
        : null,
      empleador: empleador
        ? {
            id: empleador.id,
            rol_empresa: empleador.rol_empresa,
            data: empleador.data,
            empresa: empleador.empresa
              ? { rut: empleador.empresa.rut, nombre_fantasia: (empleador.empresa as any).nombre_fantasia }
              : null,
          }
        : null,
      curriculums: curriculums.map((c) => ({
        id: c.id,
        data: c.data,
        creado_en: c.creado_en,
      })),
      consentimientos: consents.map((c) => ({
        document_type: c.document_type,
        document_version: c.document_version,
        accepted: c.accepted,
        created_at: c.created_at,
      })),
      exported_at: new Date().toISOString(),
    };
  }

  // ─── Account Deletion ───

  async deleteAccount(userId: number, dto: DeleteAccountDto) {
    const user = await this.usuarioRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Las cuentas creadas por OAuth no tienen contraseña que su dueño conozca
    // (`password` guarda un centinela): exigirla las dejaría sin poder ejercer el
    // derecho de supresión. Para ellas basta la frase de confirmación, que el DTO
    // ya validó, sobre una sesión autenticada.
    const esCuentaLocal =
      !user.auth_provider || user.auth_provider === AUTH_PROVIDER_LOCAL;

    if (esCuentaLocal) {
      if (!dto.password) {
        throw new BadRequestException(
          'Debe ingresar su contrasena para eliminar la cuenta',
        );
      }
      const passwordOk = this.encrypt.compare(dto.password, user.password);
      if (!passwordOk) {
        throw new BadRequestException('Contrasena incorrecta');
      }
    }

    // Cargar relaciones
    const postulante = await this.postulanteRepo.findOne({
      where: { usuario: { id: userId } },
    });

    // Todas las membresías: una persona puede ser responsable de varias empresas
    // y al borrar la cuenta se van todas en cascada.
    const membresias = await this.empleadorRepo.find({
      where: { usuario: { id: userId } },
      relations: ['empresa'],
    });

    // Si es empleador, verificar que no tenga ofertas activas en ninguna empresa
    for (const empleador of membresias) {
      const activeOffers = await this.ds.query(
        `SELECT COUNT(*) as count FROM oferta
         WHERE empleador_id = ? AND es_activa = 1
         AND estado IN ('publicada', 'en_proceso')
         AND fecha_eliminacion IS NULL`,
        [empleador.id],
      );
      if (activeOffers[0]?.count > 0) {
        throw new ForbiddenException(
          'No puedes eliminar tu cuenta mientras tengas ofertas activas. Desactivalas primero.',
        );
      }
    }

    // Y que ninguna empresa quede sin responsable: la membresía se borra en
    // cascada con el usuario, así que sin esto la empresa queda con
    // colaboradores que no pueden invitar ni verificarla, y solo se arregla a mano.
    for (const empleador of membresias) {
      if (empleador.rol_empresa !== 'admin' || !empleador.empresa) continue;

      const mains = await this.empleadorRepo.count({
        where: { empresa: { id: empleador.empresa.id }, rol_empresa: 'admin' },
      });
      if (mains <= 1) {
        const nombre =
          empleador.empresa.nombre_fantasia ||
          empleador.empresa.razon_social ||
          `empresa ${empleador.empresa.id}`;
        throw new ForbiddenException(
          `Sos el único responsable de ${nombre}. Promové a otra persona antes de eliminar tu cuenta.`,
        );
      }
    }

    // Recopilar archivos a eliminar post-transaccion
    const filesToDelete: string[] = [];
    if (user.perfil_foto) filesToDelete.push(user.perfil_foto);

    const cvs = await this.curriculumRepo.find({
      where: { usuario: { id: userId } },
    });
    for (const cv of cvs) {
      if (cv.cv_path) filesToDelete.push(cv.cv_path);
    }

    // Hash para audit log
    const emailHash = createHash('sha256').update(user.email).digest('hex');
    const rutHash = user.rut
      ? createHash('sha256').update(user.rut).digest('hex')
      : null;

    const visitorHash = createHash('sha256')
      .update(`user:${userId}`)
      .digest('hex');

    await this.ds.transaction(async (manager) => {
      // Paso 1: Audit log
      await manager.save(AccountDeletionLog, {
        email_hash: emailHash,
        rut_hash: rutHash,
        reason: dto.reason || null,
      });

      // Paso 2: Anonimizar registros financieros
      await manager.query(
        `UPDATE mail SET toEmail = 'deleted@anonimo.cl', payload = NULL WHERE toEmail = ?`,
        [user.email],
      );

      // Paso 3: Eliminar registros sin CASCADE
      await manager.query(
        `DELETE FROM shopping_cart WHERE usuario_id = ?`,
        [userId],
      );

      await manager.query(
        `DELETE FROM company_reviews WHERE reviewer_user_id = ?`,
        [userId],
      );

      await manager.query(
        `DELETE FROM used_quota WHERE usuario_id = ?`,
        [userId],
      );

      await manager.query(
        `DELETE FROM count_visits WHERE visitor_hash = ?`,
        [visitorHash],
      );

      // Paso 4: Si es empleador, limpiar referencias de cada membresía
      for (const empleador of membresias) {
        await manager.query(
          `DELETE FROM employer_plan_ledger WHERE employer_id = ?`,
          [empleador.id],
        );

        await manager.query(
          `DELETE FROM offer_policy WHERE employer_id = ?`,
          [empleador.id],
        );

        // SET NULL en ofertas para desbloquear FK
        await manager.query(
          `UPDATE oferta SET empleador_id = NULL, eliminada_por = NULL, modificada_por = NULL
           WHERE empleador_id = ?`,
          [empleador.id],
        );

        await manager.query(
          `DELETE FROM invitacion_empleador WHERE invitado_por = ?`,
          [empleador.id],
        );
      }

      // Paso 5: Eliminar registro legacy
      await manager.query(
        `DELETE FROM registro WHERE email = ?`,
        [user.email],
      );

      // Paso 6: Eliminar consent records (antes de eliminar usuario por si cascade falla)
      await manager.query(
        `DELETE FROM consent_record WHERE usuario_id = ?`,
        [userId],
      );

      // Paso 7: Eliminar usuario (CASCADE borra: postulante, empleador, curriculum, postulacion, proceso_seleccion, trabajos_guardados, alerta_empleo)
      await manager.query(
        `DELETE FROM usuario WHERE id = ?`,
        [userId],
      );
    });

    // Post-transaccion: eliminar archivos fisicos
    const uploadDir = process.env.UPLOAD_PATH || path.join(process.cwd(), 'upload');
    for (const file of filesToDelete) {
      try {
        const filePath = file.startsWith('/')
          ? file
          : path.join(uploadDir, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // No bloquear si falla la eliminacion de archivos
      }
    }

    return { message: 'Cuenta eliminada exitosamente' };
  }
}
