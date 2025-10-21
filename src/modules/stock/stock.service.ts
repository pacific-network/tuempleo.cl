import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stock } from '../../repository/stock/stock.entity';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Stock)
    private readonly stockRepo: Repository<Stock>,
  ) {}

  /**
   * ➕ Agrega créditos (usa upsert lógico: crea o suma)
   */
  async addCredits(
    empresaId: number,
    tipoAviso: 'BASICO' | 'ESTANDAR' | 'PREMIUM',
    cantidad: number,
  ) {
    try {
      let stock = await this.stockRepo.findOne({
        where: { empresa: { id: empresaId }, tipoAviso },
        relations: ['empresa'],
      });

      if (!stock) {
        // Crear nuevo registro si no existe
        stock = this.stockRepo.create({
          empresa: { id: empresaId },
          tipoAviso,
          cantidad_disponible: cantidad,
        });
      } else {
        // Si existe, sumamos los créditos
        stock.cantidad_disponible += cantidad;
      }

      await this.stockRepo.save(stock);

      console.log(
        `✅ Stock actualizado: empresa=${empresaId}, tipoAviso=${tipoAviso}, +${cantidad}`,
      );
      return stock;
    } catch (error) {
      console.error('❌ Error al actualizar stock:', error);
      throw error;
    }
  }

  /**
   * ➖ Usa un crédito del tipo de aviso
   */
  async useCredit(
    empresaId: number,
    tipoAviso: 'BASICO' | 'ESTANDAR' | 'PREMIUM',
  ) {
    const stock = await this.stockRepo.findOne({
      where: { empresa: { id: empresaId }, tipoAviso },
      lock: { mode: 'pessimistic_write' },
    });

    if (!stock || stock.cantidad_disponible <= 0) {
      throw new BadRequestException(
        `No hay créditos disponibles del tipo ${tipoAviso}`,
      );
    }

    stock.cantidad_disponible -= 1;
    await this.stockRepo.save(stock);
  }

  /**
   * 🔍 Obtiene todos los créditos disponibles por tipo de aviso
   */
  async getAvailability(empresaId: number) {
    return this.stockRepo.find({
      where: { empresa: { id: empresaId } },
      order: { tipoAviso: 'ASC' },
    });
  }
}
