// src/modules/webpay/dto/webpay-response-data.dto.ts

export class WebpayResponseDataDto {
    vci: string
    amount: number
    status: string
    buy_order: string
    session_id: string

    card_detail: {
        card_number: string
    }

    response_code: number
    accounting_date: string
    transaction_date: string
    payment_type_code: string
    authorization_code: string
    installments_number: number
}
