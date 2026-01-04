// webpay-detail-response.dto.ts
import { TransactionStatus } from '../enum/transaction-status'
import { WebpayResponseDataDto } from './webpay-response.dto'
import { WebpayTransactionItemDto } from './webpay-transaction-item'

export class WebpayDetailResponseDto {
    id: string
    orderId: string
    sessionId: string
    amount: number
    status: TransactionStatus
    origen: 'WEBPAY'
    items: WebpayTransactionItemDto[]
    responseData: WebpayResponseDataDto
}
