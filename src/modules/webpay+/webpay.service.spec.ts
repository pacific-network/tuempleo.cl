import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { WebpayService } from './webpay.service';
import { Transaction } from 'src/repository/transaction/transaction.entity';
import { Empleador } from 'src/repository/employer/employer.entity';
import { StockService } from '../stock/stock.service';
import { TransactionStatus } from './enum/transaction-status';

// ─── Mock Webpay SDK ──────────────────────────────────────
jest.mock('transbank-sdk', () => {
  const instance = {
    create: jest.fn(),
    commit: jest.fn(),
    status: jest.fn(),
  };
  (globalThis as any).__wpMock = instance;
  return {
    WebpayPlus: {
      Transaction: jest.fn().mockReturnValue(instance),
    },
    Options: jest.fn(),
    Environment: { Integration: 'TEST', Production: 'LIVE' },
  };
});

jest.mock('./config/webpay.config', () => ({
  WEBPAY_CONFIG: {
    commerceCode: '597055555532',
    apiKey: 'test-api-key',
    environment: 'INTEGRACION',
    returnUrl: 'http://localhost:3000/v1/webpay/return',
    finalUrl: 'http://localhost:5173/payment/webpay',
  },
}));

// ─── Helpers ──────────────────────────────────────────────
const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((dto) => ({ id: 'uuid-1', ...dto })),
  save: jest.fn((entity) => Promise.resolve(entity)),
  createQueryBuilder: jest.fn(),
});

// ─── Test Suite ───────────────────────────────────────────
describe('WebpayService', () => {
  let service: WebpayService;
  let txRepo: ReturnType<typeof mockRepo>;
  let empleadorRepo: ReturnType<typeof mockRepo>;
  let stockService: { processTransactionStock: jest.Mock };

  beforeEach(async () => {
    txRepo = mockRepo();
    empleadorRepo = mockRepo();
    stockService = { processTransactionStock: jest.fn().mockResolvedValue(undefined) };

    const wp = (globalThis as any).__wpMock;
    wp.create.mockReset();
    wp.commit.mockReset();
    wp.status.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebpayService,
        { provide: getRepositoryToken(Transaction), useValue: txRepo },
        { provide: getRepositoryToken(Empleador), useValue: empleadorRepo },
        { provide: StockService, useValue: stockService },
      ],
    }).compile();

    service = module.get(WebpayService);
  });

  // ════════════════════════════════════════════════════════
  // 1. CREAR TRANSACCIÓN PENDIENTE
  // ════════════════════════════════════════════════════════
  describe('createPendingTransaction()', () => {
    const items = [
      { tipoAviso: 'BASICO', cantidad: 2, precioUnitario: 80000, subtotal: 160000 },
    ];

    it('debe crear transacción en BD y en Webpay, retornar url y token', async () => {
      (globalThis as any).__wpMock.create.mockResolvedValue({
        token: 'wp-token-123',
        url: 'https://webpay.cl/redirect',
      });

      const result = await service.createPendingTransaction(10, 1, items);

      expect(result.token).toBe('wp-token-123');
      expect(result.url).toBe('https://webpay.cl/redirect');
      expect(txRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 160000,
          status: TransactionStatus.PENDIENTE,
        }),
      );
      expect(txRepo.save).toHaveBeenCalledTimes(2); // save pendiente + save con token
    });

    it('debe calcular total desde items del backend', async () => {
      const multiItems = [
        { tipoAviso: 'BASICO', cantidad: 1, precioUnitario: 80000, subtotal: 80000 },
        { tipoAviso: 'PREMIUM', cantidad: 2, precioUnitario: 180000, subtotal: 360000 },
      ];

      (globalThis as any).__wpMock.create.mockResolvedValue({ token: 'wp-t', url: 'https://wp.cl' });

      const result = await service.createPendingTransaction(10, 1, multiItems);

      expect(txRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 440000 }),
      );
    });

    it('debe rechazar monto <= 0', async () => {
      const badItems = [{ tipoAviso: 'BASICO', cantidad: 1, precioUnitario: 0, subtotal: 0 }];

      await expect(
        service.createPendingTransaction(10, 1, badItems),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('debe lanzar InternalServerErrorException si Webpay falla', async () => {
      (globalThis as any).__wpMock.create.mockRejectedValue(new Error('Webpay timeout'));

      await expect(
        service.createPendingTransaction(10, 1, items),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ════════════════════════════════════════════════════════
  // 2. CONFIRMAR TRANSACCIÓN
  // ════════════════════════════════════════════════════════
  describe('confirmTransaction()', () => {
    it('debe confirmar pago AUTHORIZED y procesar stock', async () => {
      const tx = {
        id: 'uuid-1',
        token: 'wp-token-123',
        sessionId: '5',
        stock_processed: false,
        status: TransactionStatus.PENDIENTE,
      };

      (globalThis as any).__wpMock.commit.mockResolvedValue({ status: 'AUTHORIZED', response_code: 0 });
      txRepo.findOne.mockResolvedValue(tx);
      empleadorRepo.findOne.mockResolvedValue({ empresa: { id: 10 } });

      const result = await service.confirmTransaction('wp-token-123');

      expect(result.status).toBe('AUTHORIZED');
      expect(tx.status).toBe(TransactionStatus.PAGADA);
      expect(stockService.processTransactionStock).toHaveBeenCalledWith('uuid-1', 10);
    });

    it('no debe procesar stock si pago fue REJECTED', async () => {
      const tx = {
        id: 'uuid-2',
        token: 'wp-token-456',
        sessionId: '5',
        stock_processed: false,
        status: TransactionStatus.PENDIENTE,
      };

      (globalThis as any).__wpMock.commit.mockResolvedValue({ status: 'REJECTED' });
      txRepo.findOne.mockResolvedValue(tx);

      await service.confirmTransaction('wp-token-456');

      expect(tx.status).toBe(TransactionStatus.RECHAZADA);
      expect(stockService.processTransactionStock).not.toHaveBeenCalled();
    });

    it('no debe procesar stock si ya fue procesado', async () => {
      const tx = {
        id: 'uuid-3',
        token: 'wp-token-789',
        sessionId: '5',
        stock_processed: true,
        status: TransactionStatus.PAGADA,
      };

      (globalThis as any).__wpMock.commit.mockResolvedValue({ status: 'AUTHORIZED' });
      txRepo.findOne.mockResolvedValue(tx);

      await service.confirmTransaction('wp-token-789');

      expect(stockService.processTransactionStock).not.toHaveBeenCalled();
    });

    it('debe lanzar error si transacción no existe en BD', async () => {
      (globalThis as any).__wpMock.commit.mockResolvedValue({ status: 'AUTHORIZED' });
      txRepo.findOne.mockResolvedValue(null);

      await expect(service.confirmTransaction('wp-no-existe')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('debe lanzar InternalServerErrorException si commit de Webpay falla', async () => {
      (globalThis as any).__wpMock.commit.mockRejectedValue(new Error('Transbank error'));

      await expect(service.confirmTransaction('wp-fail')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ════════════════════════════════════════════════════════
  // 3. PROCESAR STOCK
  // ════════════════════════════════════════════════════════
  describe('processStockForTransaction()', () => {
    it('debe procesar stock y marcar transaction.stock_processed = true', async () => {
      const tx = { id: 'uuid-1', sessionId: '5', stock_processed: false } as any;

      empleadorRepo.findOne.mockResolvedValue({ empresa: { id: 10 } });

      await service.processStockForTransaction(tx);

      expect(stockService.processTransactionStock).toHaveBeenCalledWith('uuid-1', 10);
      expect(tx.stock_processed).toBe(true);
      expect(txRepo.save).toHaveBeenCalledWith(tx);
    });

    it('no debe procesar stock si usuario no tiene empresa', async () => {
      const tx = { id: 'uuid-2', sessionId: '99', stock_processed: false } as any;

      empleadorRepo.findOne.mockResolvedValue(null);

      await service.processStockForTransaction(tx);

      expect(stockService.processTransactionStock).not.toHaveBeenCalled();
      expect(tx.stock_processed).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════
  // 4. RECONCILIAR TRANSACCIONES HUÉRFANAS
  // ════════════════════════════════════════════════════════
  describe('reconcileOrphanedTransactions()', () => {
    const buildQueryBuilder = (results: any[]) => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(results),
      };
      txRepo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    };

    it('no debe hacer nada si no hay huérfanas', async () => {
      buildQueryBuilder([]);

      await service.reconcileOrphanedTransactions();

      expect((globalThis as any).__wpMock.status).not.toHaveBeenCalled();
    });

    it('debe reconciliar transacción AUTHORIZED y procesar stock', async () => {
      const tx = {
        id: 'uuid-1',
        orderId: 'WP-001',
        token: 'wp-orphan',
        sessionId: '5',
        stock_processed: false,
        status: TransactionStatus.PENDIENTE,
      };

      buildQueryBuilder([tx]);
      (globalThis as any).__wpMock.status.mockResolvedValue({ status: 'AUTHORIZED' });
      empleadorRepo.findOne.mockResolvedValue({ empresa: { id: 10 } });

      await service.reconcileOrphanedTransactions();

      expect(tx.status).toBe(TransactionStatus.PAGADA);
      expect(stockService.processTransactionStock).toHaveBeenCalledWith('uuid-1', 10);
    });

    it('debe marcar como FALLIDA si Webpay ya no reconoce el token', async () => {
      const tx = {
        id: 'uuid-2',
        orderId: 'WP-002',
        token: 'wp-expired',
        sessionId: '5',
        stock_processed: false,
        status: TransactionStatus.PENDIENTE,
      };

      buildQueryBuilder([tx]);
      (globalThis as any).__wpMock.status.mockRejectedValue(new Error('Token not found'));

      await service.reconcileOrphanedTransactions();

      expect(tx.status).toBe(TransactionStatus.FALLIDA);
      expect(txRepo.save).toHaveBeenCalledWith(tx);
    });
  });

  // ════════════════════════════════════════════════════════
  // 5. BUSCAR TRANSACCIÓN POR TOKEN
  // ════════════════════════════════════════════════════════
  describe('findTransactionByToken()', () => {
    it('debe retornar transacción si existe', async () => {
      txRepo.findOne.mockResolvedValue({ id: 'uuid-1', token: 'wp-123' });

      const result = await service.findTransactionByToken('wp-123');

      expect(result.token).toBe('wp-123');
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      txRepo.findOne.mockResolvedValue(null);

      await expect(service.findTransactionByToken('no-existe')).rejects.toThrow(NotFoundException);
    });
  });
});
