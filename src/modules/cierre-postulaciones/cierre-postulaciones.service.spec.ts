import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import {
  CierrePostulacionesService,
  TAMANO_LOTE,
  TEXTO_MOTIVO,
} from './cierre-postulaciones.service';
import { Postulacion } from '../../repository/applications/applications.entity';
import { Oferta } from '../../repository/job_offer/job-offer.entity';
import { MailerService } from '../mailer/mailer.service';
import {
  CierreAutomaticoConfig,
  SystemConfigService,
} from '../system-config/system-config.service';

const CONFIG_BASE: CierreAutomaticoConfig = {
  enabled: true,
  diasInactividad: 30,
  diasGraciaAvanzados: 5,
  notificarEmail: false,
  messageIdCandidato: null,
  messageIdEmpleador: null,
  maxCorreosPorEjecucion: 200,
};

/** QueryBuilder chainable: cualquier método encadena, los terminales se fijan. */
function fakeQb(terminales: Record<string, unknown> = {}) {
  const qb: any = new Proxy(
    {},
    {
      get(target: any, prop: string) {
        if (prop in terminales) {
          const valor = terminales[prop];
          return jest.fn(async () => valor);
        }
        if (prop in target) return target[prop];
        target[prop] = jest.fn(() => qb);
        return target[prop];
      },
    },
  );
  return qb;
}

describe('CierrePostulacionesService', () => {
  let service: CierrePostulacionesService;
  let postulacionRepo: { createQueryBuilder: jest.Mock };
  let ofertaRepo: { findOne: jest.Mock; save: jest.Mock; createQueryBuilder: jest.Mock };
  let systemConfig: { getCierreAutomatico: jest.Mock };
  let mailer: { sendTemplateMail: jest.Mock };

  const construir = async (config: Partial<CierreAutomaticoConfig> = {}) => {
    postulacionRepo = { createQueryBuilder: jest.fn() };
    ofertaRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (o) => o),
      createQueryBuilder: jest.fn(() => fakeQb({ getMany: [] })),
    };
    systemConfig = {
      getCierreAutomatico: jest.fn(async () => ({ ...CONFIG_BASE, ...config })),
    };
    mailer = { sendTemplateMail: jest.fn(async () => ({ status: 'SENT' })) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CierrePostulacionesService,
        { provide: getRepositoryToken(Postulacion), useValue: postulacionRepo },
        { provide: getRepositoryToken(Oferta), useValue: ofertaRepo },
        { provide: SystemConfigService, useValue: systemConfig },
        { provide: MailerService, useValue: mailer },
      ],
    }).compile();

    service = module.get(CierrePostulacionesService);
  };

  describe('cerrarPorOferta', () => {
    it('no toca nada si el cierre automático está desactivado', async () => {
      await construir({ enabled: false });

      const resumen = await service.cerrarPorOferta(1);

      expect(resumen.cerradasPorOferta).toBe(0);
      expect(ofertaRepo.findOne).not.toHaveBeenCalled();
      expect(postulacionRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('ignora ofertas que siguen vigentes: sin estado terminal no hay motivo', async () => {
      await construir();
      ofertaRepo.findOne.mockResolvedValue({ id: 7, estado: 'publicada' });

      const resumen = await service.cerrarPorOferta(7);

      expect(resumen.cerradasPorOferta).toBe(0);
      expect(postulacionRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('cierra las postulaciones tempranas de una oferta expirada', async () => {
      await construir();
      ofertaRepo.findOne.mockResolvedValue({
        id: 7,
        estado: 'expirada',
        aviso_cierre_pendientes_at: null,
      });
      postulacionRepo.createQueryBuilder
        .mockReturnValueOnce(fakeQb({ execute: { affected: 3 } })) // update tempranos
        .mockReturnValueOnce(fakeQb({ getCount: 0 })); // avanzados

      const resumen = await service.cerrarPorOferta(7);

      expect(resumen.cerradasPorOferta).toBe(3);
      // Sin avanzados no se abre periodo de gracia.
      expect(ofertaRepo.save).not.toHaveBeenCalled();
    });

    it('abre el periodo de gracia cuando quedan candidatos avanzados', async () => {
      await construir();
      const oferta = {
        id: 9,
        estado: 'completada',
        aviso_cierre_pendientes_at: null,
      };
      ofertaRepo.findOne.mockResolvedValue(oferta);
      postulacionRepo.createQueryBuilder
        .mockReturnValueOnce(fakeQb({ execute: { affected: 5 } }))
        .mockReturnValueOnce(fakeQb({ getCount: 2 }));

      const resumen = await service.cerrarPorOferta(9);

      expect(resumen.cerradasPorOferta).toBe(5);
      expect(oferta.aviso_cierre_pendientes_at).toBeInstanceOf(Date);
      expect(ofertaRepo.save).toHaveBeenCalledWith(oferta);
    });

    it('no reinicia el periodo de gracia si ya estaba abierto', async () => {
      await construir();
      const abierto = new Date('2026-08-01T10:00:00Z');
      ofertaRepo.findOne.mockResolvedValue({
        id: 11,
        estado: 'expirada',
        aviso_cierre_pendientes_at: abierto,
      });
      postulacionRepo.createQueryBuilder
        .mockReturnValueOnce(fakeQb({ execute: { affected: 1 } }))
        .mockReturnValueOnce(fakeQb({ getCount: 4 }));

      await service.cerrarPorOferta(11);

      expect(ofertaRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('notificarCierresPendientes', () => {
    it('no envía nada con el flag de correo apagado', async () => {
      await construir();

      const resultado = await service.notificarCierresPendientes({
        ...CONFIG_BASE,
        notificarEmail: false,
        messageIdCandidato: '123',
      });

      expect(resultado.correosEnviados).toBe(0);
      expect(mailer.sendTemplateMail).not.toHaveBeenCalled();
    });

    it('no envía nada si falta el message_id de la plantilla', async () => {
      await construir();

      const resultado = await service.notificarCierresPendientes({
        ...CONFIG_BASE,
        notificarEmail: true,
        messageIdCandidato: null,
      });

      expect(resultado.correosEnviados).toBe(0);
      expect(mailer.sendTemplateMail).not.toHaveBeenCalled();
    });

    it('avisa al candidato con el motivo real y sella la notificación', async () => {
      await construir();
      const pendiente = {
        id: 42,
        cierreMotivo: 'vacante_completada',
        postulante: { usuario: { email: 'ana@example.cl', nombres: 'Ana' } },
        oferta: { titulo: 'Cajera', empresa: { nombre_fantasia: 'Retail Sur' } },
      };
      postulacionRepo.createQueryBuilder
        .mockReturnValueOnce(fakeQb({ getMany: [pendiente] })) // pendientes
        .mockReturnValueOnce(fakeQb({ execute: { affected: 1 } })); // sello

      const resultado = await service.notificarCierresPendientes({
        ...CONFIG_BASE,
        notificarEmail: true,
        messageIdCandidato: '9001',
      });

      expect(resultado.correosEnviados).toBe(1);
      expect(mailer.sendTemplateMail).toHaveBeenCalledWith(
        expect.objectContaining({
          dest_email: 'ana@example.cl',
          message_id: '9001',
          Nombre: 'Ana',
          TituloOferta: 'Cajera',
          NombreEmpresa: 'Retail Sur',
          Motivo: TEXTO_MOTIVO.vacante_completada,
        }),
      );
    });

    it('cuenta el fallo y no sella, para reintentar en el próximo barrido', async () => {
      await construir();
      const pendiente = {
        id: 43,
        cierreMotivo: 'inactividad',
        postulante: { usuario: { email: 'luis@example.cl', nombres: 'Luis' } },
        oferta: { titulo: 'Bodeguero', empresa: { nombre_fantasia: 'Log SpA' } },
      };
      postulacionRepo.createQueryBuilder.mockReturnValueOnce(
        fakeQb({ getMany: [pendiente] }),
      );
      mailer.sendTemplateMail.mockRejectedValue(new Error('proveedor caído'));

      const resultado = await service.notificarCierresPendientes({
        ...CONFIG_BASE,
        notificarEmail: true,
        messageIdCandidato: '9001',
      });

      expect(resultado.correosFallidos).toBe(1);
      expect(resultado.correosEnviados).toBe(0);
      // Solo se pidió el QB de lectura: no hubo sello.
      expect(postulacionRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
    });

    it('sella sin reintentar cuando el candidato no tiene correo', async () => {
      await construir();
      const pendiente = {
        id: 44,
        cierreMotivo: 'oferta_expirada',
        postulante: { usuario: { email: null, nombres: 'Sin Mail' } },
        oferta: { titulo: 'Vendedor', empresa: { nombre_fantasia: 'X' } },
      };
      postulacionRepo.createQueryBuilder
        .mockReturnValueOnce(fakeQb({ getMany: [pendiente] }))
        .mockReturnValueOnce(fakeQb({ execute: { affected: 1 } }));

      const resultado = await service.notificarCierresPendientes({
        ...CONFIG_BASE,
        notificarEmail: true,
        messageIdCandidato: '9001',
      });

      expect(resultado.correosEnviados).toBe(0);
      expect(resultado.correosFallidos).toBe(0);
      expect(mailer.sendTemplateMail).not.toHaveBeenCalled();
      expect(postulacionRepo.createQueryBuilder).toHaveBeenCalledTimes(2);
    });
  });

  describe('cierre en lotes', () => {
    it('sigue cerrando mientras un lote llegue completo', async () => {
      await construir();
      // 500 (lote lleno) + 500 (lleno) + 120 (último) = 1120 en 3 UPDATE.
      postulacionRepo.createQueryBuilder
        .mockReturnValueOnce(fakeQb({ execute: { affected: TAMANO_LOTE } }))
        .mockReturnValueOnce(fakeQb({ execute: { affected: TAMANO_LOTE } }))
        .mockReturnValueOnce(fakeQb({ execute: { affected: 120 } }));

      const total = await service.barrerInactividad(CONFIG_BASE);

      expect(total).toBe(TAMANO_LOTE * 2 + 120);
      expect(postulacionRepo.createQueryBuilder).toHaveBeenCalledTimes(3);
    });

    it('se detiene en el primer lote incompleto', async () => {
      await construir();
      postulacionRepo.createQueryBuilder.mockReturnValue(
        fakeQb({ execute: { affected: 3 } }),
      );

      const total = await service.barrerInactividad(CONFIG_BASE);

      expect(total).toBe(3);
      expect(postulacionRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
    });

    it('no itera cuando no hay nada que cerrar', async () => {
      await construir();
      postulacionRepo.createQueryBuilder.mockReturnValue(
        fakeQb({ execute: { affected: 0 } }),
      );

      const total = await service.barrerInactividad(CONFIG_BASE);

      expect(total).toBe(0);
      expect(postulacionRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
    });
  });

  describe('barrerGraciaAvanzados', () => {
    it('cierra los avanzados de ofertas cuyo plazo venció', async () => {
      await construir();
      ofertaRepo.createQueryBuilder.mockReturnValue(
        fakeQb({
          getMany: [
            { id: 1, estado: 'expirada' },
            { id: 2, estado: 'completada' },
            { id: 3, estado: 'publicada' }, // sin motivo: se ignora
          ],
        }),
      );
      postulacionRepo.createQueryBuilder
        .mockReturnValueOnce(fakeQb({ execute: { affected: 2 } }))
        .mockReturnValueOnce(fakeQb({ execute: { affected: 1 } }));

      const total = await service.barrerGraciaAvanzados(CONFIG_BASE);

      expect(total).toBe(3);
      expect(postulacionRepo.createQueryBuilder).toHaveBeenCalledTimes(2);
    });
  });

  describe('ejecutarBarrido', () => {
    it('no hace nada con el interruptor general apagado', async () => {
      await construir({ enabled: false });

      const resumen = await service.ejecutarBarrido();

      expect(resumen.cerradasPorInactividad).toBe(0);
      expect(resumen.cerradasTrasGracia).toBe(0);
      expect(postulacionRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('suma inactividad y gracia en el resumen', async () => {
      await construir();
      postulacionRepo.createQueryBuilder.mockReturnValue(
        fakeQb({ execute: { affected: 4 } }),
      );
      ofertaRepo.createQueryBuilder.mockReturnValue(
        fakeQb({ getMany: [{ id: 1, estado: 'expirada' }] }),
      );

      const resumen = await service.ejecutarBarrido();

      expect(resumen.cerradasPorInactividad).toBe(4);
      expect(resumen.cerradasTrasGracia).toBe(4);
      expect(resumen.correosEnviados).toBe(0);
    });
  });
});
