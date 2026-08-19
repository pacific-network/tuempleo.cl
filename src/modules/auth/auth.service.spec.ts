import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

import { AuthService } from './auth.service';
import { Registro } from 'src/repository/register/register.entity';
import {
  Usuario,
  PASSWORD_SENTINEL_OAUTH,
} from 'src/repository/user/user.entity';
import { EncryptService } from 'src/shared/encrypt/encrypt.service';
import { MailerService } from '../mailer/mailer.service';
import { LegalService } from '../legal/legal.service';

const repoMock = () => ({
  findOne: jest.fn().mockResolvedValue(null),
  create: jest.fn((v) => ({ id: 1, ...v })),
  save: jest.fn((v) => Promise.resolve(v)),
});

describe('AuthService', () => {
  let service: AuthService;
  let registroRepo: any;
  let usuarioRepo: any;
  let encrypt: any;
  let legal: any;
  let jwt: any;

  beforeEach(async () => {
    registroRepo = repoMock();
    usuarioRepo = repoMock();
    encrypt = {
      encrypt: jest.fn((v: string) => `enc(${v})`),
      compare: jest.fn().mockReturnValue(true),
    };
    legal = { recordInitialConsent: jest.fn().mockResolvedValue(undefined) };
    jwt = { sign: jest.fn().mockReturnValue('token-firmado') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Registro), useValue: registroRepo },
        { provide: getRepositoryToken(Usuario), useValue: usuarioRepo },
        { provide: JwtService, useValue: jwt },
        { provide: EncryptService, useValue: encrypt },
        { provide: MailerService, useValue: { sendMail: jest.fn() } },
        { provide: LegalService, useValue: legal },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─── Alta por OAuth ───

  describe('ensureUserFromJwt', () => {
    const googlePayload = {
      email: ' Nueva@Gmail.com ',
      given_name: 'Ana',
      family_name: 'Pérez',
      iss: 'https://accounts.google.com',
    };

    it('rechaza un token sin email', async () => {
      await expect(service.ensureUserFromJwt({ iss: 'google' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('normaliza el email antes de buscar y crear', async () => {
      await service.ensureUserFromJwt(googlePayload);

      expect(usuarioRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'nueva@gmail.com' },
      });
      expect(usuarioRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'nueva@gmail.com' }),
      );
    });

    it('marca la cuenta nueva con su proveedor', async () => {
      await service.ensureUserFromJwt(googlePayload);

      expect(usuarioRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ auth_provider: 'google' }),
      );
    });

    it('distingue LinkedIn de Google por el emisor del token', async () => {
      await service.ensureUserFromJwt({
        email: 'x@y.cl',
        iss: 'https://www.linkedin.com/oauth',
      });

      expect(usuarioRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ auth_provider: 'linkedin' }),
      );
    });

    it('usa el centinela en vez de cifrar un dummy password', async () => {
      // El dummy anterior cifraba `oauth:<email>:<timestamp>` en cada login: gasto
      // inútil y, con cifrado reversible, un dato descifrable de más en la base.
      await service.ensureUserFromJwt(googlePayload);

      expect(usuarioRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ password: PASSWORD_SENTINEL_OAUTH }),
      );
      expect(encrypt.encrypt).not.toHaveBeenCalled();
    });

    it('deja constancia del consentimiento inicial de la cuenta nueva', async () => {
      await service.ensureUserFromJwt(googlePayload);

      expect(legal.recordInitialConsent).toHaveBeenCalledWith(1);
    });

    it('no reescribe la contraseña de una cuenta local que entra por Google', async () => {
      usuarioRepo.findOne.mockResolvedValue({
        id: 9,
        email: 'nueva@gmail.com',
        nombres: 'Ana',
        apellidos: 'Pérez',
        password: 'enc(la-suya)',
        auth_provider: 'local',
        is_activo: true,
      });

      const user = await service.ensureUserFromJwt(googlePayload);

      expect(user.password).toBe('enc(la-suya)');
      expect(user.auth_provider).toBe('local');
      expect(usuarioRepo.save).not.toHaveBeenCalled();
    });

    it('completa nombre y apellido si faltaban', async () => {
      usuarioRepo.findOne.mockResolvedValue({
        id: 9,
        email: 'nueva@gmail.com',
        nombres: '',
        apellidos: '',
        password: 'enc(x)',
        auth_provider: 'local',
        is_activo: true,
      });

      const user = await service.ensureUserFromJwt(googlePayload);

      expect(user.nombres).toBe('Ana');
      expect(user.apellidos).toBe('Pérez');
      expect(usuarioRepo.save).toHaveBeenCalled();
    });

    it('reactiva una cuenta desactivada', async () => {
      usuarioRepo.findOne.mockResolvedValue({
        id: 9,
        email: 'nueva@gmail.com',
        nombres: 'Ana',
        apellidos: 'Pérez',
        password: 'enc(x)',
        auth_provider: 'local',
        is_activo: false,
      });

      const user = await service.ensureUserFromJwt(googlePayload);

      expect(user.is_activo).toBe(true);
    });

    it('no llama a recordInitialConsent para una cuenta que ya existía', async () => {
      usuarioRepo.findOne.mockResolvedValue({
        id: 9,
        email: 'nueva@gmail.com',
        nombres: 'Ana',
        apellidos: 'Pérez',
        password: 'enc(x)',
        auth_provider: 'local',
        is_activo: true,
      });

      await service.ensureUserFromJwt(googlePayload);

      expect(legal.recordInitialConsent).not.toHaveBeenCalled();
    });
  });

  // ─── Registro ───

  describe('register', () => {
    const dto = {
      email: ' Nuevo@Correo.CL ',
      password: 'clave123',
      nombre_completo: 'Juan Soto',
    } as any;

    it('rechaza un email vacío', async () => {
      await expect(service.register({ ...dto, email: '  ' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rechaza un email ya registrado', async () => {
      registroRepo.findOne.mockResolvedValue({ id: 1 });

      await expect(service.register(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('guarda el registro inactivo y con la clave cifrada', async () => {
      await service.register(dto);

      expect(registroRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'nuevo@correo.cl',
          password: 'enc(clave123)',
          es_activo: false,
        }),
      );
    });

    it('no devuelve la contraseña en la respuesta', async () => {
      const res = await service.register(dto);

      expect(JSON.stringify(res)).not.toContain('clave123');
    });
  });

  // ─── Login ───

  describe('login', () => {
    const creds = { email: 'a@b.cl', password: 'clave123' } as any;

    it('rechaza un email que no está registrado', async () => {
      registroRepo.findOne.mockResolvedValue(null);

      await expect(service.login(creds, 'postulante')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rechaza la contraseña incorrecta', async () => {
      registroRepo.findOne.mockResolvedValue({ email: 'a@b.cl', password: 'enc(otra)' });
      encrypt.compare.mockReturnValue(false);

      await expect(service.login(creds, 'postulante')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('firma el token con el contexto pedido', async () => {
      registroRepo.findOne.mockResolvedValue({
        email: 'a@b.cl',
        password: 'enc(clave123)',
        es_activo: true,
        nombre_completo: 'Ana Pérez',
      });
      usuarioRepo.findOne.mockResolvedValue({
        id: 3,
        email: 'a@b.cl',
        isAdmin: false,
        isSupervisor: false,
      });

      const res = await service.login(creds, 'empleador');

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 3, context: 'empleador' }),
      );
      expect(res.token).toBe('token-firmado');
    });

    it('no eleva privilegios cuando el usuario no los tiene', async () => {
      registroRepo.findOne.mockResolvedValue({
        email: 'a@b.cl',
        password: 'enc(clave123)',
        es_activo: true,
        nombre_completo: 'Ana',
      });
      usuarioRepo.findOne.mockResolvedValue({ id: 3, email: 'a@b.cl' });

      await service.login(creds, 'postulante');

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ isAdmin: false, isSupervisor: false }),
      );
    });

    it('activa el registro pendiente en el primer login válido', async () => {
      const registro = {
        email: 'a@b.cl',
        password: 'enc(clave123)',
        es_activo: false,
        nombre_completo: 'Ana Pérez',
      };
      registroRepo.findOne.mockResolvedValue(registro);
      usuarioRepo.findOne.mockResolvedValue({ id: 3, email: 'a@b.cl' });

      await service.login(creds, 'postulante');

      expect(registro.es_activo).toBe(true);
      expect(registroRepo.save).toHaveBeenCalledWith(registro);
    });

    it('crea el usuario la primera vez, partiendo el nombre completo', async () => {
      registroRepo.findOne.mockResolvedValue({
        email: 'a@b.cl',
        password: 'enc(clave123)',
        es_activo: true,
        nombre_completo: 'Ana María  Pérez Soto',
      });
      usuarioRepo.findOne.mockResolvedValue(null);

      await service.login(creds, 'postulante');

      expect(usuarioRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nombres: 'Ana',
          apellidos: 'María Pérez Soto',
        }),
      );
      expect(legal.recordInitialConsent).toHaveBeenCalled();
    });
  });
});
