import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { MiembroDeEmpresaGuard } from './miembro-empresa.guard';
import { Empleador } from 'src/repository/employer/employer.entity';

const contexto = (request: any): ExecutionContext =>
  ({ switchToHttp: () => ({ getRequest: () => request }) }) as any;

describe('MiembroDeEmpresaGuard', () => {
  let guard: MiembroDeEmpresaGuard;
  let repo: { findOne: jest.Mock };

  beforeEach(async () => {
    repo = { findOne: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MiembroDeEmpresaGuard,
        { provide: getRepositoryToken(Empleador), useValue: repo },
      ],
    }).compile();
    guard = module.get(MiembroDeEmpresaGuard);
  });

  it('deja pasar a quien tiene membresía en esa empresa', async () => {
    repo.findOne.mockResolvedValue({ id: 88, rol_empresa: 'colaborador' });
    const req: any = { user: { sub: 42 }, params: { empresaId: '10' } };

    await expect(guard.canActivate(contexto(req))).resolves.toBe(true);
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { usuario: { id: 42 }, empresa: { id: 10 } },
    });
    // Queda en el request para que el handler no la vuelva a buscar.
    expect(req.membresiaEmpresa).toEqual({ id: 88, rol_empresa: 'colaborador' });
  });

  it('rechaza a quien no pertenece a la empresa pedida', async () => {
    // El caso que motivó el guard: token válido, pero la empresa es de otro.
    repo.findOne.mockResolvedValue(null);

    await expect(
      guard.canActivate(contexto({ user: { sub: 42 }, params: { empresaId: '999' } })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('vale para colaboradores, no solo para empleadores', async () => {
    repo.findOne.mockResolvedValue({ id: 91, rol_empresa: 'colaborador' });

    await expect(
      guard.canActivate(contexto({ user: { sub: 42 }, params: { empresaId: '10' } })),
    ).resolves.toBe(true);
  });

  it('rechaza si no hay usuario autenticado', async () => {
    await expect(
      guard.canActivate(contexto({ params: { empresaId: '10' } })),
    ).rejects.toThrow(ForbiddenException);
    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it('rechaza si la petición no trae empresa, en vez de dejar pasar', async () => {
    await expect(
      guard.canActivate(contexto({ user: { sub: 42 }, params: {} })),
    ).rejects.toThrow(ForbiddenException);
    expect(repo.findOne).not.toHaveBeenCalled();
  });

  describe('de dónde lee la empresa', () => {
    beforeEach(() => repo.findOne.mockResolvedValue({ id: 1 }));

    it('del path (empresaId)', async () => {
      await guard.canActivate(contexto({ user: { sub: 42 }, params: { empresaId: '10' } }));
      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuario: { id: 42 }, empresa: { id: 10 } } }),
      );
    });

    it('del query (empresa_id, como lo manda quota)', async () => {
      await guard.canActivate(contexto({ user: { sub: 42 }, query: { empresa_id: '20' } }));
      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuario: { id: 42 }, empresa: { id: 20 } } }),
      );
    });

    it('del body (empresaId, como lo manda webpay)', async () => {
      await guard.canActivate(contexto({ user: { userId: 7 }, body: { empresaId: 30 } }));
      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuario: { id: 7 }, empresa: { id: 30 } } }),
      );
    });

    it('ignora valores que no son un id', async () => {
      await expect(
        guard.canActivate(contexto({ user: { sub: 42 }, query: { empresaId: 'abc' } })),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
