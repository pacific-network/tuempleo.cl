import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MatchService, PESOS_MATCH } from './match.service';
import { Oferta } from '../../repository/job_offer/job-offer.entity';
import { Postulacion } from '../../repository/applications/applications.entity';
import { Postulante } from '../../repository/postulant/postulant.entity';

describe('MatchService.scoreOfertaPostulante', () => {
  let service: MatchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchService,
        { provide: getRepositoryToken(Oferta), useValue: {} },
        { provide: getRepositoryToken(Postulacion), useValue: {} },
        { provide: getRepositoryToken(Postulante), useValue: {} },
      ],
    }).compile();

    service = module.get<MatchService>(MatchService);
  });

  it('da 100 a un candidato perfectamente afín', () => {
    const oferta = {
      area_trabajo: 'Desarrollo de Software',
      nivel_experiencia: 'junior',
      modalidad: 'remoto',
      region: 'Metropolitana',
      educacion_requerida: 'Ingeniería en Informática',
      herramientas_basicas: ['JavaScript', 'SQL'],
    };
    const postulante = {
      datos_personales: { educacion: [{ titulo: 'Ingeniería en Informática' }] },
      experiencias: [{ cargo: 'Desarrollo de Software', anios: 3 }],
      preferencias: { modalidad: 'remoto', categoria_empleo: 'Desarrollo de Software' },
      herramientas: ['JavaScript', 'SQL'],
    };

    const { score, desglose } = service.scoreOfertaPostulante(oferta, postulante);
    expect(score).toBe(100);
    expect(desglose.area).toBe(PESOS_MATCH.area);
    expect(desglose.herramientas).toBe(PESOS_MATCH.herramientas);
  });

  it('ignora ubicación cuando la oferta es remota', () => {
    const oferta = { area_trabajo: 'Ventas', modalidad: 'remoto', region: 'Atacama' };
    const postulante = {
      preferencias: { modalidad: 'remoto', categoria_empleo: 'Ventas', region: 'Metropolitana' },
      experiencias: [{ cargo: 'Ventas' }],
    };
    const { desglose } = service.scoreOfertaPostulante(oferta, postulante);
    expect(desglose.ubicacion).toBe(PESOS_MATCH.ubicacion);
  });

  it('normaliza tildes y mayúsculas al comparar', () => {
    const oferta = { area_trabajo: 'Administración' };
    const postulante = { preferencias: { categoria_empleo: 'administracion' }, experiencias: [{ cargo: 'ADMINISTRACION' }] };
    const { desglose } = service.scoreOfertaPostulante(oferta, postulante);
    expect(desglose.area).toBe(PESOS_MATCH.area);
  });

  it('penaliza candidato con menor seniority del requerido', () => {
    const senior = { nivel_experiencia: 'experto' };
    const junior = { experiencias: [{ anios: 1 }] };
    const { desglose } = service.scoreOfertaPostulante(senior, junior);
    expect(desglose.experiencia).toBeLessThan(PESOS_MATCH.experiencia);
  });

  it('es defensivo ante datos nulos/vacíos', () => {
    const { score } = service.scoreOfertaPostulante(null, null);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
