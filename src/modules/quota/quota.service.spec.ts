import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';

import { QuotaService } from './quota.service';
import { CuposUsados } from 'src/repository/used_quota/used_quota.entity';
import { Empresa } from 'src/repository/business/business.entity';
import { Oferta } from 'src/repository/job_offer/job-offer.entity';
import { Usuario } from 'src/repository/user/user.entity';

const repoMock = () => ({
  findOne: jest.fn().mockResolvedValue(null),
  count: jest.fn().mockResolvedValue(0),
  create: jest.fn((v) => v),
  save: jest.fn((v) => Promise.resolve(v)),
});

describe('QuotaService', () => {
  let service: QuotaService;
  let quotaRepo: any;
  let empresaRepo: any;
  let ofertaRepo: any;
  let usuarioRepo: any;

  const dto = {
    empresa_id: 1,
    oferta_id: 2,
    usuario_id: 3,
    action: 'unlock',
  } as any;

  /** Deja el camino feliz armado; cada test rompe solo lo que quiere probar. */
  const escenarioValido = (tipoAviso = 'BASICO') => {
    empresaRepo.findOne.mockResolvedValue({ id: 1 });
    ofertaRepo.findOne.mockResolvedValue({
      id: 2,
      tipo_aviso: tipoAviso,
      empresa: { id: 1 },
    });
    usuarioRepo.findOne.mockResolvedValue({ id: 3 });
    quotaRepo.findOne.mockResolvedValue(null);
  };

  beforeEach(async () => {
    quotaRepo = repoMock();
    empresaRepo = repoMock();
    ofertaRepo = repoMock();
    usuarioRepo = repoMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotaService,
        { provide: getRepositoryToken(CuposUsados), useValue: quotaRepo },
        { provide: getRepositoryToken(Empresa), useValue: empresaRepo },
        { provide: getRepositoryToken(Oferta), useValue: ofertaRepo },
        { provide: getRepositoryToken(Usuario), useValue: usuarioRepo },
      ],
    }).compile();

    service = module.get<QuotaService>(QuotaService);
  });

  describe('consumeQuota', () => {
    it('no cobra cupo por una acción que no lo consume', async () => {
      const res = await service.consumeQuota({ ...dto, action: 'view' });

      expect(res.success).toBe(false);
      expect(res.used).toBe(0);
      expect(quotaRepo.save).not.toHaveBeenCalled();
    });

    it('rechaza una empresa inexistente', async () => {
      empresaRepo.findOne.mockResolvedValue(null);

      await expect(service.consumeQuota(dto)).rejects.toThrow(BadRequestException);
    });

    it('impide consumir cupo de una oferta de otra empresa', async () => {
      empresaRepo.findOne.mockResolvedValue({ id: 1 });
      ofertaRepo.findOne.mockResolvedValue({
        id: 2,
        tipo_aviso: 'BASICO',
        empresa: { id: 99 },
      });

      await expect(service.consumeQuota(dto)).rejects.toThrow(BadRequestException);
      expect(quotaRepo.save).not.toHaveBeenCalled();
    });

    it('registra el consumo cuando quedan cupos', async () => {
      escenarioValido('BASICO');
      quotaRepo.count.mockResolvedValue(4);

      const res = await service.consumeQuota(dto);

      expect(res.success).toBe(true);
      expect(res.used).toBe(5);
      expect(res.total).toBe(25);
      expect(quotaRepo.save).toHaveBeenCalled();
    });

    it('no vuelve a cobrar al mismo usuario en la misma oferta', async () => {
      escenarioValido();
      quotaRepo.findOne.mockResolvedValue({ id: 7 });
      quotaRepo.count.mockResolvedValue(3);

      const res: any = await service.consumeQuota(dto);

      expect(res.duplicated).toBe(true);
      expect(quotaRepo.save).not.toHaveBeenCalled();
    });

    it('bloquea el consumo cuando los cupos se agotaron', async () => {
      escenarioValido('GRATIS');
      quotaRepo.count.mockResolvedValue(10);

      await expect(service.consumeQuota(dto)).rejects.toThrow(BadRequestException);
      expect(quotaRepo.save).not.toHaveBeenCalled();
    });

    it.each([
      ['GRATIS', 10],
      ['BASICO', 25],
      ['ESTANDAR', 50],
      ['PREMIUM', 100],
    ])('respeta el tope de %s (%i cupos)', async (tipo, total) => {
      escenarioValido(tipo as string);
      quotaRepo.count.mockResolvedValue((total as number) - 1);

      const res = await service.consumeQuota(dto);

      expect(res.total).toBe(total);
      expect(res.used).toBe(total);
    });

    it('no reparte cupos ilimitados si el tipo de aviso es desconocido', async () => {
      // `cuposPorTipo[tipo_aviso]` daba `undefined` para un tipo fuera del mapa, y
      // `usados >= undefined` es false: la oferta quedaba sin tope y se podían
      // desbloquear candidatos sin límite. Un dato sucio en `oferta.tipo_aviso`
      // bastaba para regalar el producto.
      escenarioValido('LEGACY_SIN_MAPEAR');
      quotaRepo.count.mockResolvedValue(9999);

      await expect(service.consumeQuota(dto)).rejects.toThrow(BadRequestException);
      expect(quotaRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('isUnlocked', () => {
    it('informa desbloqueado cuando existe el registro de unlock', async () => {
      escenarioValido('PREMIUM');
      quotaRepo.findOne.mockResolvedValue({ id: 7, action: 'unlock' });
      quotaRepo.count.mockResolvedValue(12);

      const res = await service.isUnlocked(1, 2, 3);

      expect(res).toEqual({ isUnlocked: true, used: 12, total: 100 });
    });

    it('informa bloqueado cuando no hay registro', async () => {
      escenarioValido('BASICO');
      quotaRepo.count.mockResolvedValue(0);

      const res = await service.isUnlocked(1, 2, 3);

      expect(res.isUnlocked).toBe(false);
    });

    it('impide consultar una oferta de otra empresa', async () => {
      empresaRepo.findOne.mockResolvedValue({ id: 1 });
      ofertaRepo.findOne.mockResolvedValue({ id: 2, empresa: { id: 99 } });

      await expect(service.isUnlocked(1, 2, 3)).rejects.toThrow(BadRequestException);
    });
  });
});
