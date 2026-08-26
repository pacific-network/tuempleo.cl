import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InvitacionService } from './invitacion.service';
import { InvitacionEmpleador } from 'src/repository/invitacion-empleador/invitacion-empleador.entity';
import { Empleador } from 'src/repository/employer/employer.entity';
import { Usuario } from 'src/repository/user/user.entity';
import { Registro } from 'src/repository/register/register.entity';
import { SmsService } from '../sms-generator/sms.service';
import { MailerService } from '../mailer/mailer.service';
import { EncryptService } from 'src/shared/encrypt/encrypt.service';

// ─── Helpers ──────────────────────────────────────────────
const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  existsBy: jest.fn(),
  create: jest.fn((dto) => dto),
  save: jest.fn((entity) => Promise.resolve({ id: 1, ...entity })),
});

const empresa = { id: 10, nombre_fantasia: 'TestCorp', razon_social: 'TestCorp SpA' };

const empleadorAdmin = {
  id: 1,
  rol_empresa: 'empleador',
  empresa,
  usuario: { id: 100, nombres: 'Paulo', email: 'admin@test.cl' },
};

const empleadorMiembro = {
  id: 2,
  rol_empresa: 'colaborador',
  empresa,
  usuario: { id: 200, nombres: 'Juan', email: 'juan@test.cl' },
};

const buildInvitacion = (overrides: any = {}) => ({
  id: 1,
  codigo: '123456',
  estado: 'pendiente',
  empresa,
  expiraEn: new Date(Date.now() + 48 * 60 * 60 * 1000),
  ...overrides,
});

// ─── Test Suite ───────────────────────────────────────────
describe('InvitacionService', () => {
  let service: InvitacionService;
  let invitacionRepo: ReturnType<typeof mockRepo>;
  let empleadorRepo: ReturnType<typeof mockRepo>;
  let usuarioRepo: ReturnType<typeof mockRepo>;
  let registroRepo: ReturnType<typeof mockRepo>;
  let jwtService: { sign: jest.Mock };
  let smsService: { sendIndividualSms: jest.Mock };
  let mailerService: { sendTemplateMail: jest.Mock };
  let encryptService: { encrypt: jest.Mock };

  beforeEach(async () => {
    invitacionRepo = mockRepo();
    empleadorRepo = mockRepo();
    usuarioRepo = mockRepo();
    registroRepo = mockRepo();
    jwtService = { sign: jest.fn().mockReturnValue('jwt-token-test') };
    smsService = { sendIndividualSms: jest.fn().mockResolvedValue(undefined) };
    mailerService = { sendTemplateMail: jest.fn().mockResolvedValue(undefined) };
    encryptService = { encrypt: jest.fn().mockReturnValue('encrypted-pw') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitacionService,
        { provide: getRepositoryToken(InvitacionEmpleador), useValue: invitacionRepo },
        { provide: getRepositoryToken(Empleador), useValue: empleadorRepo },
        { provide: getRepositoryToken(Usuario), useValue: usuarioRepo },
        { provide: getRepositoryToken(Registro), useValue: registroRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: SmsService, useValue: smsService },
        { provide: MailerService, useValue: mailerService },
        { provide: EncryptService, useValue: encryptService },
      ],
    }).compile();

    service = module.get(InvitacionService);
  });

  // ════════════════════════════════════════════════════════
  // 1. INVITAR
  // ════════════════════════════════════════════════════════
  describe('invitar()', () => {
    // Se invita a la empresa activa: `invitar` resuelve la membresía por
    // `usuario.id_empresa` para no elegir una empresa al azar cuando la
    // persona está en varias.
    beforeEach(() => {
      usuarioRepo.findOne.mockResolvedValue({ id: 100, id_empresa: empresa.id });
    });

    it('debe crear invitación y enviar email, sin SMS (lo manda el frontend)', async () => {
      empleadorRepo.findOne.mockResolvedValue(empleadorAdmin);
      invitacionRepo.find.mockResolvedValue([]);
      invitacionRepo.existsBy.mockResolvedValue(false);

      const result = await service.invitar(100, '56912345678', 'invitado@test.cl');

      expect(result.codigo).toMatch(/^\d{6}$/);
      expect(result.expiraEn).toBeInstanceOf(Date);
      expect(invitacionRepo.save).toHaveBeenCalled();
      expect(smsService.sendIndividualSms).not.toHaveBeenCalled();
      expect(mailerService.sendTemplateMail).toHaveBeenCalledWith(
        expect.objectContaining({ dest_email: 'invitado@test.cl' }),
      );
    });

    it('debe enviar solo email si no hay teléfono', async () => {
      empleadorRepo.findOne.mockResolvedValue(empleadorAdmin);
      invitacionRepo.find.mockResolvedValue([]);
      invitacionRepo.existsBy.mockResolvedValue(false);

      await service.invitar(100, undefined, 'invitado@test.cl');

      expect(smsService.sendIndividualSms).not.toHaveBeenCalled();
      expect(mailerService.sendTemplateMail).toHaveBeenCalled();
    });

    it('no envia nada desde el backend si solo hay telefono', async () => {
      // El codigo se crea igual; el SMS lo despacha el frontend.
      empleadorRepo.findOne.mockResolvedValue(empleadorAdmin);
      invitacionRepo.find.mockResolvedValue([]);
      invitacionRepo.existsBy.mockResolvedValue(false);

      const result = await service.invitar(100, '56912345678');

      expect(result.codigo).toMatch(/^\d{6}$/);
      expect(invitacionRepo.save).toHaveBeenCalled();
      expect(smsService.sendIndividualSms).not.toHaveBeenCalled();
      expect(mailerService.sendTemplateMail).not.toHaveBeenCalled();
    });

    it('debe rechazar si empleador no es admin', async () => {
      empleadorRepo.findOne.mockResolvedValue(empleadorMiembro);

      await expect(service.invitar(200, '56912345678')).rejects.toThrow(ForbiddenException);
    });

    it('debe rechazar si no se proporciona ni teléfono ni email', async () => {
      empleadorRepo.findOne.mockResolvedValue(empleadorAdmin);

      await expect(service.invitar(100)).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar NotFoundException si empleador no existe', async () => {
      empleadorRepo.findOne.mockResolvedValue(null);

      await expect(service.invitar(999, '56912345678')).rejects.toThrow(NotFoundException);
    });

    it('debe expirar invitaciones pendientes anteriores del mismo email/empresa', async () => {
      const invPendiente = { id: 5, estado: 'pendiente' };
      empleadorRepo.findOne.mockResolvedValue(empleadorAdmin);
      invitacionRepo.find.mockResolvedValue([invPendiente]);
      invitacionRepo.existsBy.mockResolvedValue(false);

      await service.invitar(100, undefined, 'invitado@test.cl');

      expect(invPendiente.estado).toBe('expirada');
      expect(invitacionRepo.save).toHaveBeenCalledWith([invPendiente]);
    });
  });

  // ════════════════════════════════════════════════════════
  // 2. VALIDAR CÓDIGO
  // ════════════════════════════════════════════════════════
  describe('validarCodigo()', () => {
    it('debe retornar empresa si código es válido y no expirado', async () => {
      invitacionRepo.findOne.mockResolvedValue(buildInvitacion());

      const result = await service.validarCodigo('123456');

      expect(result.valido).toBe(true);
      expect(result.empresa).toBe('TestCorp');
      expect(result.empresa_id).toBe(10);
    });

    it('debe lanzar NotFoundException si código no existe', async () => {
      invitacionRepo.findOne.mockResolvedValue(null);

      await expect(service.validarCodigo('000000')).rejects.toThrow(NotFoundException);
    });

    it('debe marcar como expirada y lanzar BadRequestException si código expiró', async () => {
      const invExpirada = buildInvitacion({
        expiraEn: new Date(Date.now() - 1000), // ya expiró
      });
      invitacionRepo.findOne.mockResolvedValue(invExpirada);

      await expect(service.validarCodigo('123456')).rejects.toThrow(BadRequestException);
      expect(invExpirada.estado).toBe('expirada');
      expect(invitacionRepo.save).toHaveBeenCalledWith(invExpirada);
    });
  });

  // ════════════════════════════════════════════════════════
  // 3. ACEPTAR INVITACIÓN
  // ════════════════════════════════════════════════════════
  describe('aceptarInvitacion()', () => {
    const dto = { codigo: '123456', email: 'nuevo@test.cl', password: 'SecurePass1!' };

    it('debe crear usuario, empleador, registro y retornar JWT', async () => {
      invitacionRepo.findOne.mockResolvedValue(buildInvitacion());
      usuarioRepo.findOne.mockResolvedValue(null); // email no existe
      usuarioRepo.save.mockResolvedValue({ id: 50, email: dto.email });

      const result = await service.aceptarInvitacion(dto);

      // Registro creado
      expect(registroRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: dto.email, password: 'encrypted-pw' }),
      );
      expect(registroRepo.save).toHaveBeenCalled();

      // Usuario creado con empresa de la invitación
      expect(usuarioRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: dto.email,
          id_empresa: 10,
        }),
      );
      expect(usuarioRepo.save).toHaveBeenCalled();

      // Empleador creado como miembro
      expect(empleadorRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ rol_empresa: 'colaborador' }),
      );
      expect(empleadorRepo.save).toHaveBeenCalled();

      // JWT generado
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ email: dto.email, context: 'empleador', isAdmin: false }),
      );
      expect(result.token).toBe('jwt-token-test');
      expect(result.empresa_id).toBe(10);
    });

    it('debe rechazar si el código no existe o ya fue usado', async () => {
      invitacionRepo.findOne.mockResolvedValue(null);

      await expect(service.aceptarInvitacion(dto)).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar si el código expiró', async () => {
      invitacionRepo.findOne.mockResolvedValue(
        buildInvitacion({ expiraEn: new Date(Date.now() - 1000) }),
      );

      await expect(service.aceptarInvitacion(dto)).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si el email ya está registrado', async () => {
      invitacionRepo.findOne.mockResolvedValue(buildInvitacion());
      usuarioRepo.findOne.mockResolvedValue({ id: 99, email: dto.email }); // ya existe

      await expect(service.aceptarInvitacion(dto)).rejects.toThrow(BadRequestException);
    });

    it('debe marcar la invitación como aceptada', async () => {
      const invitacion = buildInvitacion();
      invitacionRepo.findOne.mockResolvedValue(invitacion);
      usuarioRepo.findOne.mockResolvedValue(null);
      usuarioRepo.save.mockResolvedValue({ id: 50, email: dto.email });

      await service.aceptarInvitacion(dto);

      expect(invitacion.estado).toBe('aceptada');
    });
  });
});
