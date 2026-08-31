import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { MercadoPagoService } from './mercado-pago.service';
import { Transaction, PaymentGateway } from 'src/repository/transaction/transaction.entity';
import { Empleador } from 'src/repository/employer/employer.entity';
import { StockService } from '../stock/stock.service';
import { TransactionStatus } from '../webpay+/enum/transaction-status';

// ─── Mocks ────────────────────────────────────────────────
jest.mock('./const/tipo_avisos.preferences', () => ({
  avisos: {
    BASICO: { title: 'Aviso Básico', description: 'desc', price: 80000 },
    ESTANDAR: { title: 'Aviso Estándar', description: 'desc', price: 140000 },
    PREMIUM: { title: 'Aviso Premium', description: 'desc', price: 180000 },
  },
  crearPreferenciaPago: jest.fn().mockResolvedValue({
    id: 'pref-123',
    init_point: 'https://mp.com/init',
    sandbox_init_point: 'https://mp.com/sandbox',
  }),
}));

jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn(),
  Payment: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
  })),
}));

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((dto) => ({ id: 'uuid-1', ...dto })),
  save: jest.fn((entity) => Promise.resolve(entity)),
  // El servicio lee `usuario.id_empresa` por el manager para saber a qué
  // empresa acreditar el stock cuando la persona administra varias.
  manager: { findOne: jest.fn().mockResolvedValue(null) },
});

// ─── Test Suite ───────────────────────────────────────────
describe('MercadoPagoService', () => {
  let service: MercadoPagoService;
  let txRepo: ReturnType<typeof mockRepo>;
  let empleadorRepo: ReturnType<typeof mockRepo>;
  let stockService: { processTransactionStock: jest.Mock };

  beforeEach(async () => {
    txRepo = mockRepo();
    empleadorRepo = mockRepo();
    stockService = { processTransactionStock: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MercadoPagoService,
        { provide: getRepositoryToken(Transaction), useValue: txRepo },
        { provide: getRepositoryToken(Empleador), useValue: empleadorRepo },
        { provide: StockService, useValue: stockService },
      ],
    }).compile();

    service = module.get(MercadoPagoService);
  });

  // ════════════════════════════════════════════════════════
  // CREAR PREFERENCIA Y REGISTRAR
  // ════════════════════════════════════════════════════════
  describe('crearPreferenciaYRegistrar()', () => {
    it('debe crear preferencia y registrar transacción correctamente', async () => {
      const items = [{ tipoAviso: 'BASICO' as const, cantidad: 2 }];

      const result = await service.crearPreferenciaYRegistrar(items, 1);

      expect(result.preferenceId).toBe('pref-123');
      expect(result.init_point).toBe('https://mp.com/init');
      expect(result.total).toBe(160000); // 80000 * 2
      expect(txRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 160000,
          token: 'pref-123',
          status: TransactionStatus.PENDIENTE,
          origen: PaymentGateway.MERCADOPAGO,
        }),
      );
      expect(txRepo.save).toHaveBeenCalled();
    });

    it('debe calcular total con múltiples items', async () => {
      const items = [
        { tipoAviso: 'BASICO' as const, cantidad: 1 },
        { tipoAviso: 'PREMIUM' as const, cantidad: 2 },
      ];

      const result = await service.crearPreferenciaYRegistrar(items, 1);

      expect(result.total).toBe(80000 + 180000 * 2); // 440000
    });

    it('debe rechazar items vacíos', async () => {
      await expect(service.crearPreferenciaYRegistrar([], 1)).rejects.toThrow(
        'Debes seleccionar al menos un tipo de aviso',
      );
    });

    it('debe rechazar tipo de aviso inválido', async () => {
      const items = [{ tipoAviso: 'INEXISTENTE' as any, cantidad: 1 }];

      await expect(service.crearPreferenciaYRegistrar(items, 1)).rejects.toThrow(
        'Tipo de aviso no válido',
      );
    });
  });

  // ════════════════════════════════════════════════════════
  // PROCESAR NOTIFICACIÓN (WEBHOOK)
  // ════════════════════════════════════════════════════════
  describe('procesarNotificacionPago()', () => {
    let mockPaymentGet: jest.Mock;

    beforeEach(() => {
      const { Payment } = require('mercadopago');
      mockPaymentGet = jest.fn();
      Payment.mockImplementation(() => ({ get: mockPaymentGet }));
    });

    it('debe actualizar transacción a PAGADA y procesar stock', async () => {
      const tx = {
        id: 'uuid-1',
        orderId: 'MP-001',
        sessionId: '5',
        stock_processed: false,
        status: TransactionStatus.PENDIENTE,
      };

      mockPaymentGet.mockResolvedValue({
        id: 'pay-1',
        status: 'approved',
        preference_id: 'pref-123',
      });

      txRepo.findOne.mockResolvedValue(tx);
      empleadorRepo.manager.findOne.mockResolvedValue({ id: 42, id_empresa: 10 });
      empleadorRepo.findOne.mockResolvedValue({
        empresa: { id: 10 },
      });

      await service.procesarNotificacionPago('pay-1');

      expect(tx.status).toBe(TransactionStatus.PAGADA);
      expect(stockService.processTransactionStock).toHaveBeenCalledWith('uuid-1', 10);
      expect(tx.stock_processed).toBe(true);
    });

    it('no debe procesar stock si pago no fue aprobado', async () => {
      const tx = {
        id: 'uuid-1',
        orderId: 'MP-002',
        sessionId: '5',
        stock_processed: false,
        status: TransactionStatus.PENDIENTE,
      };

      mockPaymentGet.mockResolvedValue({
        id: 'pay-2',
        status: 'rejected',
        preference_id: 'pref-456',
      });

      txRepo.findOne.mockResolvedValue(tx);

      await service.procesarNotificacionPago('pay-2');

      expect(tx.status).toBe(TransactionStatus.RECHAZADA);
      expect(stockService.processTransactionStock).not.toHaveBeenCalled();
    });

    it('no debe procesar stock si ya fue procesado', async () => {
      const tx = {
        id: 'uuid-1',
        orderId: 'MP-003',
        sessionId: '5',
        stock_processed: true,
        status: TransactionStatus.PAGADA,
      };

      mockPaymentGet.mockResolvedValue({
        id: 'pay-3',
        status: 'approved',
        preference_id: 'pref-789',
      });

      txRepo.findOne.mockResolvedValue(tx);

      await service.procesarNotificacionPago('pay-3');

      expect(stockService.processTransactionStock).not.toHaveBeenCalled();
    });

    it('debe ignorar webhook sin preference_id', async () => {
      mockPaymentGet.mockResolvedValue({
        id: 'pay-4',
        status: 'approved',
        preference_id: null,
      });

      await service.procesarNotificacionPago('pay-4');

      expect(txRepo.findOne).not.toHaveBeenCalled();
    });

    it('debe ignorar si no encuentra transacción', async () => {
      mockPaymentGet.mockResolvedValue({
        id: 'pay-5',
        status: 'approved',
        preference_id: 'pref-no-existe',
      });

      txRepo.findOne.mockResolvedValue(null);

      await service.procesarNotificacionPago('pay-5');

      expect(stockService.processTransactionStock).not.toHaveBeenCalled();
    });

    it('no debe actualizar stock si usuario no tiene empresa', async () => {
      const tx = {
        id: 'uuid-1',
        orderId: 'MP-006',
        sessionId: '5',
        stock_processed: false,
        status: TransactionStatus.PENDIENTE,
      };

      mockPaymentGet.mockResolvedValue({
        id: 'pay-6',
        status: 'approved',
        preference_id: 'pref-sin-empresa',
      });

      txRepo.findOne.mockResolvedValue(tx);
      empleadorRepo.findOne.mockResolvedValue(null);

      await service.procesarNotificacionPago('pay-6');

      expect(stockService.processTransactionStock).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════
  // DETALLE DE TRANSACCIÓN
  // ════════════════════════════════════════════════════════
  describe('getDetailMpTransaccion()', () => {
    it('debe retornar detalle si existe', async () => {
      txRepo.findOne.mockResolvedValue({
        orderId: 'MP-001',
        sessionId: '5',
        amount: 80000,
        status: TransactionStatus.PAGADA,
        response_data: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        origen: PaymentGateway.MERCADOPAGO,
      });

      const result = await service.getDetailMpTransaccion('pref-123');

      expect(result.orderId).toBe('MP-001');
      expect(result.amount).toBe(80000);
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      txRepo.findOne.mockResolvedValue(null);

      await expect(service.getDetailMpTransaccion('no-existe')).rejects.toThrow(NotFoundException);
    });
  });
});
