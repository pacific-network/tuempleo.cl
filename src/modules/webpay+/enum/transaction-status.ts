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
        case 'AUTHORIZED':
        case 'APPROVED':
            return TransactionStatus.PAGADA

        case 'REJECTED':
        case 'CANCELLED':
            return TransactionStatus.RECHAZADA

        default:
            return TransactionStatus.FALLIDA
    }
}
