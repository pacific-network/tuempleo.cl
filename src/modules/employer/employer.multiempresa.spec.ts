import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EmpleadorService } from './employer.service';
import { Empleador } from 'src/repository/employer/employer.entity';
import { Usuario } from 'src/repository/user/user.entity';
import { Empresa } from 'src/repository/business/business.entity';
import { Oferta } from 'src/repository/job_offer/job-offer.entity';
import { Postulacion } from 'src/repository/applications/applications.entity';
import { StockService } from '../stock/stock.service';

// ─── Helpers ──────────────────────────────────────────────
const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
  create: jest.fn((dto) => dto),
  save: jest.fn((entity) => Promise.resolve({ id: 1, ...entity })),
});

const ACME = { id: 10, nombre_fantasia: 'ACME', razon_social: 'ACME SpA' };
const GLOBEX = { id: 20, nombre_fantasia: 'Globex', razon_social: 'Globex SpA' };

// Paulo es empleador en ACME y colaborador en Globex. Es el caso que rompía el
// modelo anterior y el que hay que sostener en todos los tests de abajo.
const PAULO = 100;
const empleadorEnAcme = { id: 1, rol_empresa: 'empleador', empresa: ACME, usuario: { id: PAULO } };
const colaboradorEnGlobex = { id: 2, rol_empresa: 'colaborador', empresa: GLOBEX, usuario: { id: PAULO } };

describe('EmpleadorService · multi-empresa', () => {
  let service: EmpleadorService;
  let empleadorRepo: ReturnType<typeof mockRepo>;
  let usuarioRepo: ReturnType<typeof mockRepo>;
  let empresaRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    empleadorRepo = mockRepo();
    usuarioRepo = mockRepo();
    empresaRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmpleadorService,
        { provide: getRepositoryToken(Empleador), useValue: empleadorRepo },
        { provide: getRepositoryToken(Usuario), useValue: usuarioRepo },
        { provide: getRepositoryToken(Empresa), useValue: empresaRepo },
        { provide: getRepositoryToken(Oferta), useValue: mockRepo() },
        { provide: getRepositoryToken(Postulacion), useValue: mockRepo() },
        { provide: StockService, useValue: {} },
      ],
    }).compile();

    service = module.get<EmpleadorService>(EmpleadorService);
  });

  // ─── Empresa activa ─────────────────────────────────────
  describe('getEmpleadorActivo', () => {
    it('devuelve la membresía de la empresa activa, no la primera', async () => {
      usuarioRepo.findOne.mockResolvedValue({ id: PAULO, id_empresa: GLOBEX.id });
      empleadorRepo.findOne.mockResolvedValue(colaboradorEnGlobex);

      const activo = await service.getEmpleadorActivo(PAULO);

      expect(activo).toBe(colaboradorEnGlobex);
      // La consulta filtra por empresa; sin eso devolvería una membresía al azar.
      expect(empleadorRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { usuario: { id: PAULO }, empresa: { id: GLOBEX.id } },
        }),
      );
    });

    it('cae a la primera membresía y la fija cuando no hay empresa activa', async () => {
      usuarioRepo.findOne.mockResolvedValue({ id: PAULO, id_empresa: null });
      empleadorRepo.find.mockResolvedValue([empleadorEnAcme, colaboradorEnGlobex]);

      const activo = await service.getEmpleadorActivo(PAULO);

      expect(activo).toBe(empleadorEnAcme);
      expect(usuarioRepo.update).toHaveBeenCalledWith(PAULO, { id_empresa: ACME.id });
    });

    it('cae a la primera si la empresa activa ya no tiene membresía', async () => {
      usuarioRepo.findOne.mockResolvedValue({ id: PAULO, id_empresa: 999 });
      empleadorRepo.findOne.mockResolvedValue(null);
      empleadorRepo.find.mockResolvedValue([empleadorEnAcme]);

      const activo = await service.getEmpleadorActivo(PAULO);

      expect(activo).toBe(empleadorEnAcme);
    });
  });

  describe('setEmpresaActiva', () => {
    it('rechaza una empresa donde no hay membresía', async () => {
      empleadorRepo.findOne.mockResolvedValue(null);

      await expect(service.setEmpresaActiva(PAULO, 999)).rejects.toThrow(
        NotFoundException,
      );
      expect(usuarioRepo.update).not.toHaveBeenCalled();
    });

    it('cambia la empresa activa cuando la membresía existe', async () => {
      empleadorRepo.findOne.mockResolvedValue(colaboradorEnGlobex);

      await service.setEmpresaActiva(PAULO, GLOBEX.id);

      expect(usuarioRepo.update).toHaveBeenCalledWith(PAULO, { id_empresa: GLOBEX.id });
    });
  });

  // ─── Alta de la segunda empresa ─────────────────────────
  describe('createEmployerWithCompany', () => {
    it('permite ser responsable de una segunda empresa', async () => {
      empleadorRepo.findOne.mockResolvedValue(null); // sin membresía en Globex
      usuarioRepo.findOne.mockResolvedValue({ id: PAULO, rut: '11111111-1' });
      empresaRepo.findOne.mockResolvedValue(GLOBEX);

      const creado = await service.createEmployerWithCompany(
        { userId: PAULO, rut: '11111111-1', empresaId: GLOBEX.id, data: {} } as any,
        GLOBEX.id,
      );

      expect(creado).toEqual(expect.objectContaining({ rol_empresa: 'empleador' }));
      // La guarda mira el par (usuario, empresa): antes rechazaba por usuario solo.
      expect(empleadorRepo.findOne).toHaveBeenCalledWith({
        where: { usuario: { id: PAULO }, empresa: { id: GLOBEX.id } },
      });
    });

    it('rechaza una segunda membresía en la misma empresa', async () => {
      empleadorRepo.findOne.mockResolvedValue(empleadorEnAcme);

      await expect(
        service.createEmployerWithCompany(
          { userId: PAULO, rut: '11111111-1', empresaId: ACME.id, data: {} } as any,
          ACME.id,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─────────────────────────────────────────────────────────
  // El requerimiento, textual:
  //   «yo como dueño de empresa puedo estar en todas, pero no me puedes
  //    limitar a una empresa solo mi rut»
  //
  // Es la razón de ser de todo lo demás en este archivo, así que se prueba
  // con su propio enunciado y no como efecto colateral de otro test.
  // ─────────────────────────────────────────────────────────
  describe('un mismo RUT no queda limitado a una empresa', () => {
    const RUT_DUENO = '11111111-1';
    const INITECH = { id: 30, nombre_fantasia: 'Initech', razon_social: 'Initech SpA' };

    it('la misma persona puede registrar tres empresas', async () => {
      usuarioRepo.findOne.mockResolvedValue({ id: PAULO, rut: RUT_DUENO });
      empleadorRepo.findOne.mockResolvedValue(null); // sin membresía previa en cada una

      for (const empresa of [ACME, GLOBEX, INITECH]) {
        empresaRepo.findOne.mockResolvedValue(empresa);

        const creado = await service.createEmployerWithCompany(
          { userId: PAULO, rut: RUT_DUENO, empresaId: empresa.id, data: {} } as any,
          empresa.id,
        );

        expect(creado).toEqual(
          expect.objectContaining({ empresa, rol_empresa: 'empleador' }),
        );
      }

      expect(empleadorRepo.save).toHaveBeenCalledTimes(3);
    });

    it('el RUT propio nunca bloquea la siguiente empresa', async () => {
      // `usuario.rut` es UNIQUE, pero eso significa "una persona, una cuenta",
      // no "una persona, una empresa". La validación excluye al propio dueño.
      usuarioRepo.findOne.mockResolvedValue({ id: PAULO, rut: RUT_DUENO });

      const propio = await service.checkRutUsuarioExists(RUT_DUENO, PAULO);
      expect(propio).toEqual({ exists: true, disponible: true });

      // Y sigue protegiendo lo que debe: el RUT de otra persona no se puede usar.
      const ajeno = await service.checkRutUsuarioExists(RUT_DUENO, 999);
      expect(ajeno).toEqual({ exists: true, disponible: false });
    });

    it('devuelve todas sus empresas, cada una con su rol', async () => {
      empleadorRepo.find.mockResolvedValue([empleadorEnAcme, colaboradorEnGlobex]);
      usuarioRepo.findOne.mockResolvedValue({ id: PAULO, id_empresa: ACME.id });
      empleadorRepo.findOne.mockResolvedValue(empleadorEnAcme);

      const { exists, membresias } = await service.checkEmpleadorExists(PAULO);

      expect(exists).toBe(true);
      expect(membresias).toEqual([
        { id: 1, empresaId: ACME.id, rol: 'empleador', nombre: 'ACME' },
        { id: 2, empresaId: GLOBEX.id, rol: 'colaborador', nombre: 'Globex' },
      ]);
    });
  });

  // ─── Invariante: una empresa nunca sin empleador ─────────
  describe('assertNoEsUltimoEmpleador', () => {
    it('bloquea al único empleador de la empresa', async () => {
      empleadorRepo.count.mockResolvedValue(1);

      await expect(service.assertNoEsUltimoEmpleador(empleadorEnAcme as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('deja pasar cuando queda otro empleador', async () => {
      empleadorRepo.count.mockResolvedValue(2);

      await expect(
        service.assertNoEsUltimoEmpleador(empleadorEnAcme as any),
      ).resolves.toBeUndefined();
    });

    it('no aplica a un colaborador', async () => {
      await expect(
        service.assertNoEsUltimoEmpleador(colaboradorEnGlobex as any),
      ).resolves.toBeUndefined();
      expect(empleadorRepo.count).not.toHaveBeenCalled();
    });
  });

  // ─── Aislamiento entre empresas ─────────────────────────
  describe('cambiarRolMembresia', () => {
    it('no deja cambiar roles en una empresa donde se es colaborador', async () => {
      // El objetivo vive en Globex; Paulo es empleador en ACME pero solo colaborador
      // en Globex. Sin validar el rol EN esa empresa, sería escalada de privilegios.
      const otroEnGlobex = { id: 3, rol_empresa: 'colaborador', empresa: GLOBEX, usuario: { id: 300 } };
      empleadorRepo.findOne
        .mockResolvedValueOnce(otroEnGlobex)       // objetivo
        .mockResolvedValueOnce(colaboradorEnGlobex); // actor en esa empresa

      await expect(
        service.cambiarRolMembresia(PAULO, otroEnGlobex.id, 'empleador'),
      ).rejects.toThrow(ConflictException);
      expect(empleadorRepo.save).not.toHaveBeenCalled();
    });

    it('no deja cambiar roles a quien no pertenece a la empresa', async () => {
      const otroEnGlobex = { id: 3, rol_empresa: 'colaborador', empresa: GLOBEX, usuario: { id: 300 } };
      empleadorRepo.findOne
        .mockResolvedValueOnce(otroEnGlobex)
        .mockResolvedValueOnce(null); // sin membresía en Globex

      await expect(
        service.cambiarRolMembresia(999, otroEnGlobex.id, 'empleador'),
      ).rejects.toThrow(ConflictException);
    });

    it('promueve a un colaborador si el actor es empleador de esa empresa', async () => {
      const otroEnAcme = { id: 4, rol_empresa: 'colaborador', empresa: ACME, usuario: { id: 400 } };
      empleadorRepo.findOne
        .mockResolvedValueOnce(otroEnAcme)
        .mockResolvedValueOnce(empleadorEnAcme);

      await service.cambiarRolMembresia(PAULO, otroEnAcme.id, 'empleador');

      expect(empleadorRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ rol_empresa: 'empleador', modificado_por: PAULO }),
      );
    });

    it('no deja que un empleador le quite el rol a otro', async () => {
      // El poder se da, no se quita: un par no baja a un par, aunque los dos
      // sean empleadores de la misma empresa.
      const otroEmpleador = { id: 5, rol_empresa: 'empleador', empresa: ACME, usuario: { id: 500 } };
      empleadorRepo.findOne
        .mockResolvedValueOnce(otroEmpleador)   // objetivo
        .mockResolvedValueOnce(empleadorEnAcme); // actor: otro empleador de ACME

      await expect(
        service.cambiarRolMembresia(PAULO, otroEmpleador.id, 'colaborador'),
      ).rejects.toThrow(ConflictException);
      expect(empleadorRepo.save).not.toHaveBeenCalled();
      // Ni siquiera llega a mirar cuántos empleadores quedan: no es el caso.
      expect(empleadorRepo.count).not.toHaveBeenCalled();
    });

    it('deja renunciar sobre la propia membresía si queda otro empleador', async () => {
      empleadorRepo.findOne
        .mockResolvedValueOnce(empleadorEnAcme)  // objetivo: él mismo
        .mockResolvedValueOnce(empleadorEnAcme); // actor: él mismo
      empleadorRepo.count.mockResolvedValue(2);

      await service.cambiarRolMembresia(PAULO, empleadorEnAcme.id, 'colaborador');

      expect(empleadorRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ rol_empresa: 'colaborador' }),
      );
    });

    it('no deja renunciar al último empleador', async () => {
      empleadorRepo.findOne
        .mockResolvedValueOnce(empleadorEnAcme)  // objetivo
        .mockResolvedValueOnce(empleadorEnAcme); // actor: él mismo
      empleadorRepo.count.mockResolvedValue(1);

      await expect(
        service.cambiarRolMembresia(PAULO, empleadorEnAcme.id, 'colaborador'),
      ).rejects.toThrow(ConflictException);
      expect(empleadorRepo.save).not.toHaveBeenCalled();
    });
  });
});
