export enum TransactionStatus {
    PENDIENTE = 'PENDIENTE',
    PAGADA = 'PAGADA',
    FALLIDA = 'FALLIDA',
    RECHAZADA = 'RECHAZADA',
}

/**
 * Mapea el status que devuelve Transbank/MercadoPago a nuestros estados internos.
 *
 * Transbank devuelve: "AUTHORIZED", "FAILED", etc.
 * MercadoPago devuelve: "APPROVED", "REJECTED", "PENDING", etc.
 */
export function mapPaymentStatus(externalStatus: string): TransactionStatus {
    switch (externalStatus?.toUpperCase()) {
        // Pago acreditado (Webpay AUTHORIZED, MP APPROVED)
        case 'AUTHORIZED':
        case 'APPROVED':
            return TransactionStatus.PAGADA

        // Rechazos definitivos (no hay pago, no hay reintento)
        case 'REJECTED':
        case 'CANCELLED':
            return TransactionStatus.RECHAZADA

        // Errores técnicos o reversiones (hubo intento pero no quedó plata)
        case 'FAILED':
        case 'REFUNDED':
        case 'CHARGED_BACK':
            return TransactionStatus.FALLIDA

        // En curso: MP authorized (preautorización), pending, in_process, in_mediation
        // y Webpay INITIALIZED / CREATED. Se resuelven luego por commit/webhook/reconciliación.
        case 'PENDING':
        case 'IN_PROCESS':
        case 'IN_MEDIATION':
        case 'CREATED':
        case 'INITIALIZED':
        case 'NULLIFIED':
            return TransactionStatus.PENDIENTE

        default:
            return TransactionStatus.PENDIENTE
    }
}
