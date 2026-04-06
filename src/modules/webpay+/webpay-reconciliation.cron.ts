import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WebpayService } from './webpay.service';

@Injectable()
export class WebpayReconciliationCron {
    constructor(private readonly webpayService: WebpayService) {}

    // Cada 5 minutos: reconciliar transacciones CREATED que no recibieron callback
    @Cron('*/5 * * * *')
    async handleReconciliation() {
        await this.webpayService.reconcileOrphanedTransactions();
    }
}
