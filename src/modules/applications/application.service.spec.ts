import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { PostulacionService } from './application.service';
import { Postulacion } from '../../repository/applications/applications.entity';
import { Postulante } from '../../repository/postulant/postulant.entity';
import { Oferta } from '../../repository/job_offer/job-offer.entity';

const repoMock = () => ({
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  create: jest.fn((v) => v),
  save: jest.fn((v) => Promise.resolve({ id: 100, ...v })),
  createQueryBuilder: jest.fn(),
});

describe('PostulacionService', () => {
  let service: PostulacionService;
  let postulacionRepo: any;
  let postulanteRepo: any;
  let ofertaRepo: any;

  beforeEach(async () => {
    postulacionRepo = repoMock();
    postulanteRepo = repoMock();
    ofertaRepo = repoMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostulacionService,
        { provide: getRepositoryToken(Postulacion), useValue: postulacionRepo },
        { provide: getRepositoryToken(Postulante), useValue: postulanteRepo },
        { provide: getRepositoryToken(Oferta), useValue: ofertaRepo },
      ],
    }).compile();

    service = module.get<PostulacionService>(PostulacionService);
  });

  describe('crearPostulacion', () => {
    const dto = { postulante_id: 1, oferta_id: 2 } as any;

    it('falla si el postulante no existe', async () => {
      postulanteRepo.findOne.mockResolvedValue(null);

      await expect(service.crearPostulacion(dto)).rejects.toThrow(NotFoundException);
      expect(postulacionRepo.save).not.toHaveBeenCalled();
    });

    it('falla si la oferta no existe', async () => {
      postulanteRepo.findOne.mockResolvedValue({ id: 1 });
      ofertaRepo.findOne.mockResolvedValue(null);

      await expect(service.crearPostulacion(dto)).rejects.toThrow(NotFoundException);
    });

    it('impide postular dos veces a la misma oferta', async () => {
      postulanteRepo.findOne.mockResolvedValue({ id: 1 });
      ofertaRepo.findOne.mockResolvedValue({ id: 2 });
      postulacionRepo.findOne.mockResolvedValue({ id: 50 });

      await expect(service.crearPostulacion(dto)).rejects.toThrow(ConflictException);
      expect(postulacionRepo.save).not.toHaveBeenCalled();
    });

    it('crea la postulación en estado enviada', async () => {
      const postulante = { id: 1 };
      const oferta = { id: 2 };
      postulanteRepo.findOne.mockResolvedValue(postulante);
      ofertaRepo.findOne.mockResolvedValue(oferta);
      postulacionRepo.findOne.mockResolvedValue(null);

      const res = await service.crearPostulacion(dto);

      expect(postulacionRepo.create).toHaveBeenCalledWith({
        postulante,
        oferta,
        estado: 'enviada',
      });
      expect(res.id).toBe(100);
    });
  });

  describe('obtenerPostulacionesPorUsuario', () => {
    it('falla si el usuario no tiene perfil de postulante', async () => {
      postulanteRepo.findOne.mockResolvedValue(null);

      await expect(service.obtenerPostulacionesPorUsuario(7)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devuelve las postulaciones de la más reciente a la más antigua', async () => {
      postulanteRepo.findOne.mockResolvedValue({ id: 5 });

      await service.obtenerPostulacionesPorUsuario(7);

      expect(postulacionRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { postulante: { id: 5 } },
          order: { fechaPostulacion: 'DESC' },
        }),
      );
    });
  });

  describe('obtenerPostulacionesPorOferta', () => {
    it('falla si la oferta no existe', async () => {
      ofertaRepo.findOne.mockResolvedValue(null);

      await expect(service.obtenerPostulacionesPorOferta(2)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devuelve lista vacía cuando la oferta no tiene postulantes', async () => {
      ofertaRepo.findOne.mockResolvedValue({ id: 2 });
      postulacionRepo.find.mockResolvedValue([]);

      await expect(service.obtenerPostulacionesPorOferta(2)).resolves.toEqual([]);
    });

    it('devuelve todas cuando no se filtra por keywords', async () => {
      const postulaciones = [{ id: 1 }, { id: 2 }];
      ofertaRepo.findOne.mockResolvedValue({ id: 2 });
      postulacionRepo.find.mockResolvedValue(postulaciones);

      await expect(service.obtenerPostulacionesPorOferta(2, '   ')).resolves.toBe(
        postulaciones,
      );
    });
  });
});
