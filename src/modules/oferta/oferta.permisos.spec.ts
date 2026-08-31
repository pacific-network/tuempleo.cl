import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OfertaService } from './oferta.service';

/**
 * El permiso sobre una oferta es de la empresa, no de la persona ni del rol.
 *
 * Se prueba `assertMiembroDeLaOferta` directamente, que es donde vive la regla
 * y por donde pasan modificar, cerrar, reactivar y eliminar. Instanciar el
 * service completo pediría media docena de repos que no participan de esto.
 */
describe('OfertaService · permisos sobre una oferta', () => {
  const ACME = { id: 10, nombre_fantasia: 'ACME' };
  const GLOBEX = { id: 20, nombre_fantasia: 'Globex' };

  // La creó otra persona de ACME: nadie del equipo debería quedar afuera.
  const ofertaDeAcme: any = {
    id: 500,
    empresa: ACME,
    empleador: { id: 1, empresa: ACME, usuario: { id: 111 } },
  };

  let empleadorRepo: { findOne: jest.Mock };
  let service: OfertaService;
  let assert: (userId: number, oferta: any, accion: string) => Promise<any>;

  beforeEach(() => {
    empleadorRepo = { findOne: jest.fn() };
    service = Object.create(OfertaService.prototype);
    (service as any).empleadorRepository = empleadorRepo;
    assert = (service as any).assertMiembroDeLaOferta.bind(service);
  });

  it('deja pasar a un colaborador de la empresa dueña', async () => {
    // El criterio: adentro de la empresa no se restringe por rol.
    const colaborador = { id: 6, rol_empresa: 'colaborador', empresa: ACME };
    empleadorRepo.findOne.mockResolvedValue(colaborador);

    await expect(assert(600, ofertaDeAcme, 'modificar esta oferta')).resolves.toBe(
      colaborador,
    );
    expect(empleadorRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { usuario: { id: 600 }, empresa: { id: ACME.id } },
      }),
    );
  });

  it('deja pasar a un empleador que no creó el aviso', async () => {
    const socio = { id: 5, rol_empresa: 'empleador', empresa: ACME };
    empleadorRepo.findOne.mockResolvedValue(socio);

    await expect(assert(500, ofertaDeAcme, 'cerrar esta oferta')).resolves.toBe(socio);
  });

  it('rechaza a un empleador de otra empresa', async () => {
    // Este es el hueco que tenía `eliminarOferta`: no comprobaba nada.
    empleadorRepo.findOne.mockResolvedValue(null);

    await expect(assert(900, ofertaDeAcme, 'eliminar esta oferta')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('la consulta filtra por la empresa de la oferta, no por la activa', async () => {
    // Alguien en ACME y en Globex puede tocar el aviso de ACME sin tener que
    // cambiar antes de empresa activa.
    const enAcme = { id: 1, rol_empresa: 'empleador', empresa: ACME };
    empleadorRepo.findOne.mockResolvedValue(enAcme);

    await assert(700, { ...ofertaDeAcme, empresa: GLOBEX }, 'modificar esta oferta');

    expect(empleadorRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { usuario: { id: 700 }, empresa: { id: GLOBEX.id } },
      }),
    );
  });

  it('falla si la oferta no tiene empresa asociada', async () => {
    await expect(
      assert(600, { id: 1, empresa: null }, 'modificar esta oferta'),
    ).rejects.toThrow(NotFoundException);
    expect(empleadorRepo.findOne).not.toHaveBeenCalled();
  });
});
