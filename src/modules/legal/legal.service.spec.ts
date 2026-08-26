import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { LegalService } from './legal.service';
import { LegalDocument } from 'src/repository/legal/legal-document.entity';
import { ConsentRecord } from 'src/repository/legal/consent-record.entity';
import { AccountDeletionLog } from 'src/repository/legal/account-deletion-log.entity';
import { Usuario } from 'src/repository/user/user.entity';
import { Postulante } from 'src/repository/postulant/postulant.entity';
import { Empleador } from 'src/repository/employer/employer.entity';
import { Curriculum } from 'src/repository/curriculum/curriculum.entity';
import { EncryptService } from 'src/shared/encrypt/encrypt.service';
import { CONFIRM_PHRASE } from './dto/delete-account.dto';

const repoMock = () => ({
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  count: jest.fn().mockResolvedValue(0),
  create: jest.fn((v) => v),
  save: jest.fn((v) => Promise.resolve(v)),
});

describe('LegalService', () => {
  let service: LegalService;
  let docRepo: any;
  let consentRepo: any;
  let usuarioRepo: any;
  let postulanteRepo: any;
  let empleadorRepo: any;
  let curriculumRepo: any;
  let encrypt: any;
  let ds: any;

  beforeEach(async () => {
    docRepo = repoMock();
    consentRepo = repoMock();
    usuarioRepo = repoMock();
    postulanteRepo = repoMock();
    empleadorRepo = repoMock();
    curriculumRepo = repoMock();

    encrypt = { compare: jest.fn().mockReturnValue(true) };

    ds = {
      query: jest.fn().mockResolvedValue([{ count: 0 }]),
      transaction: jest.fn(async (cb: any) =>
        cb({ save: jest.fn(), query: jest.fn().mockResolvedValue([]) }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LegalService,
        { provide: getRepositoryToken(LegalDocument), useValue: docRepo },
        { provide: getRepositoryToken(ConsentRecord), useValue: consentRepo },
        { provide: getRepositoryToken(AccountDeletionLog), useValue: repoMock() },
        { provide: getRepositoryToken(Usuario), useValue: usuarioRepo },
        { provide: getRepositoryToken(Postulante), useValue: postulanteRepo },
        { provide: getRepositoryToken(Empleador), useValue: empleadorRepo },
        { provide: getRepositoryToken(Curriculum), useValue: curriculumRepo },
        { provide: DataSource, useValue: ds },
        { provide: EncryptService, useValue: encrypt },
      ],
    }).compile();

    service = module.get<LegalService>(LegalService);
  });

  // ─── Documentos ───

  describe('getCurrentDocument', () => {
    it('devuelve el documento vigente', async () => {
      docRepo.findOne.mockResolvedValue({ type: 'terms', version: '1.1' });

      await expect(service.getCurrentDocument('terms')).resolves.toEqual({
        type: 'terms',
        version: '1.1',
      });
    });

    it('falla si no hay ninguno vigente', async () => {
      docRepo.findOne.mockResolvedValue(null);

      await expect(service.getCurrentDocument('privacy')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── Estado del consentimiento ───

  describe('getConsentStatus', () => {
    beforeEach(() => {
      docRepo.find.mockResolvedValue([
        { type: 'terms', version: '2.0' },
        { type: 'privacy', version: '2.0' },
      ]);
    });

    it('marca needsUpdate cuando el usuario aceptó una versión anterior', async () => {
      consentRepo.findOne.mockResolvedValue({ document_version: '1.1' });

      const status = await service.getConsentStatus(1);

      expect(status.terms).toEqual({
        accepted: false,
        version: '1.1',
        currentVersion: '2.0',
        needsUpdate: true,
      });
    });

    it('no pide renovación cuando ya aceptó la vigente', async () => {
      consentRepo.findOne.mockResolvedValue({ document_version: '2.0' });

      const status = await service.getConsentStatus(1);

      expect(status.privacy.needsUpdate).toBe(false);
      expect(status.privacy.accepted).toBe(true);
    });

    it('trata al usuario sin ningún consentimiento como pendiente', async () => {
      consentRepo.findOne.mockResolvedValue(null);

      const status = await service.getConsentStatus(1);

      expect(status.terms.version).toBeNull();
      expect(status.terms.needsUpdate).toBe(true);
    });
  });

  // ─── Registro del consentimiento ───

  describe('recordConsent', () => {
    it('guarda IP y user agent como prueba del consentimiento', async () => {
      docRepo.findOne.mockResolvedValue({ type: 'terms', version: '2.0' });

      await service.recordConsent(7, 'terms', '2.0', true, '1.2.3.4', 'Firefox');

      expect(consentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          usuario_id: 7,
          document_version: '2.0',
          accepted: true,
          ip_address: '1.2.3.4',
          user_agent: 'Firefox',
        }),
      );
    });

    it('rechaza una versión que no existe en la tabla', async () => {
      docRepo.findOne.mockResolvedValue(null);

      await expect(
        service.recordConsent(7, 'terms', '9.9', true),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Eliminación de cuenta ───

  describe('deleteAccount', () => {
    const dto = { password: 'secreta', confirmPhrase: CONFIRM_PHRASE };

    it('elimina la cuenta local cuando la contraseña es correcta', async () => {
      usuarioRepo.findOne.mockResolvedValue({
        id: 1,
        email: 'a@b.cl',
        auth_provider: 'local',
        password: 'cifrada',
      });
      encrypt.compare.mockReturnValue(true);

      await expect(service.deleteAccount(1, dto as any)).resolves.toEqual({
        message: 'Cuenta eliminada exitosamente',
      });
      expect(ds.transaction).toHaveBeenCalled();
    });

    it('rechaza la contraseña incorrecta de una cuenta local', async () => {
      usuarioRepo.findOne.mockResolvedValue({
        id: 1,
        email: 'a@b.cl',
        auth_provider: 'local',
        password: 'cifrada',
      });
      encrypt.compare.mockReturnValue(false);

      await expect(service.deleteAccount(1, dto as any)).rejects.toThrow(
        BadRequestException,
      );
      expect(ds.transaction).not.toHaveBeenCalled();
    });

    it('exige contraseña a la cuenta local que no la envía', async () => {
      usuarioRepo.findOne.mockResolvedValue({
        id: 1,
        email: 'a@b.cl',
        auth_provider: 'local',
        password: 'cifrada',
      });

      await expect(
        service.deleteAccount(1, { confirmPhrase: CONFIRM_PHRASE } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('elimina la cuenta OAuth sin pedir contraseña', async () => {
      // El caso que estaba roto: quien entró por Google nunca conoció su clave,
      // así que exigirla lo dejaba sin poder ejercer el derecho de supresión.
      usuarioRepo.findOne.mockResolvedValue({
        id: 2,
        email: 'g@b.cl',
        auth_provider: 'google',
        password: '!oauth',
      });

      await expect(
        service.deleteAccount(2, { confirmPhrase: CONFIRM_PHRASE } as any),
      ).resolves.toEqual({ message: 'Cuenta eliminada exitosamente' });

      expect(encrypt.compare).not.toHaveBeenCalled();
    });

    it('trata como local a la cuenta antigua sin auth_provider', async () => {
      // Filas anteriores a la migración: el default no está aplicado en memoria.
      usuarioRepo.findOne.mockResolvedValue({
        id: 3,
        email: 'viejo@b.cl',
        password: 'cifrada',
      });
      encrypt.compare.mockReturnValue(false);

      await expect(service.deleteAccount(3, dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('falla si el usuario no existe', async () => {
      usuarioRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteAccount(99, dto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('bloquea al empleador con ofertas activas', async () => {
      usuarioRepo.findOne.mockResolvedValue({
        id: 4,
        email: 'e@b.cl',
        auth_provider: 'local',
        password: 'cifrada',
      });
      empleadorRepo.find.mockResolvedValue([{ id: 40, rol_empresa: 'colaborador' }]);
      ds.query.mockResolvedValue([{ count: 3 }]);

      await expect(service.deleteAccount(4, dto as any)).rejects.toThrow(
        ForbiddenException,
      );
      expect(ds.transaction).not.toHaveBeenCalled();
    });

    it('deja borrar al único miembro y da de baja la empresa', async () => {
      // Sin colaboradores no hay a quién promover: pedirlo sería un callejón
      // sin salida que impide ejercer el derecho de supresión.
      usuarioRepo.findOne.mockResolvedValue({
        id: 4, email: 'e@b.cl', auth_provider: 'local', password: 'cifrada',
      });
      empleadorRepo.find.mockResolvedValue([
        { id: 40, rol_empresa: 'empleador', empresa: { id: 10, nombre_fantasia: 'ACME' } },
      ]);
      // 1 empleador, 1 miembro en total.
      empleadorRepo.count.mockResolvedValue(1);
      ds.query.mockResolvedValue([{ count: 0 }]);

      await service.deleteAccount(4, dto as any);

      expect(ds.transaction).toHaveBeenCalled();
    });

    it('bloquea al único empleador cuando hay colaboradores', async () => {
      usuarioRepo.findOne.mockResolvedValue({
        id: 4,
        email: 'e@b.cl',
        auth_provider: 'local',
        password: 'cifrada',
      });
      empleadorRepo.find.mockResolvedValue([
        {
          id: 40,
          rol_empresa: 'empleador',
          empresa: { id: 10, nombre_fantasia: 'ACME' },
        },
      ]);
      empleadorRepo.count
        .mockResolvedValueOnce(1)  // empleadores: solo él
        .mockResolvedValueOnce(2); // miembros: hay un colaborador
      ds.query.mockResolvedValue([{ count: 0 }]); // sin ofertas activas

      await expect(service.deleteAccount(4, dto as any)).rejects.toThrow(
        ForbiddenException,
      );
      expect(ds.transaction).not.toHaveBeenCalled();
    });

    it('deja borrar si la empresa tiene otro empleador', async () => {
      usuarioRepo.findOne.mockResolvedValue({
        id: 4,
        email: 'e@b.cl',
        auth_provider: 'local',
        password: 'cifrada',
      });
      empleadorRepo.find.mockResolvedValue([
        {
          id: 40,
          rol_empresa: 'empleador',
          empresa: { id: 10, nombre_fantasia: 'ACME' },
        },
      ]);
      empleadorRepo.count.mockResolvedValue(2); // queda otro empleador
      ds.query.mockResolvedValue([{ count: 0 }]);

      await service.deleteAccount(4, dto as any);

      expect(ds.transaction).toHaveBeenCalled();
    });
  });

  // ─── Portabilidad ───

  describe('exportUserData', () => {
    it('entrega los datos del titular en un objeto estructurado', async () => {
      usuarioRepo.findOne.mockResolvedValue({
        id: 5,
        rut: '11111111-1',
        nombres: 'Ana',
        apellidos: 'Pérez',
        email: 'ana@b.cl',
        fecha_creacion: new Date('2026-01-01'),
        perfil_foto: null,
      });
      curriculumRepo.find.mockResolvedValue([{ id: 1, data: {}, creado_en: new Date() }]);
      consentRepo.find.mockResolvedValue([
        { document_type: 'terms', document_version: '1.1', accepted: true, created_at: new Date() },
      ]);

      const data = await service.exportUserData(5);

      expect(data.usuario.email).toBe('ana@b.cl');
      expect(data.curriculums).toHaveLength(1);
      expect(data.consentimientos).toHaveLength(1);
      expect(data.exported_at).toBeDefined();
    });

    it('no expone la contraseña en la exportación', async () => {
      usuarioRepo.findOne.mockResolvedValue({
        id: 5,
        email: 'ana@b.cl',
        password: 'cifrada',
        nombres: 'Ana',
        apellidos: 'Pérez',
      });

      const data = await service.exportUserData(5);

      expect(JSON.stringify(data)).not.toContain('cifrada');
    });

    it('falla si el usuario no existe', async () => {
      usuarioRepo.findOne.mockResolvedValue(null);

      await expect(service.exportUserData(99)).rejects.toThrow(NotFoundException);
    });
  });
});
