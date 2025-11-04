import { randomBytes } from 'crypto';

/**
 * Genera un identificador único para órdenes de compra, estandarizado por pasarela.
 *
 * Ejemplo de salida:
 *  - WEBPAY: WP-1761859936322-9f3ab2
 *  - MERCADOPAGO: MP-1761859936322-a1b2c3
 *  - LOCAL: LOC-1761859936322-ab12cd
 */
export function generateOrderId(origen: 'WEBPAY' | 'MERCADOPAGO' | 'LOCAL'): string {
    const timestamp = Date.now(); // Precisión a nivel de milisegundo

    switch (origen) {
        case 'WEBPAY':
            // Compacto, único y rastreable (Transbank / Webpay)
            return `WP-${timestamp}-${randomBytes(3).toString('hex')}`;

        case 'MERCADOPAGO':
            // Mantiene consistencia de estructura y unicidad
            return `MP-${timestamp}-${randomBytes(3).toString('hex')}`;

        default:
            // Fallback para entornos locales o pruebas
            return `LOC-${timestamp}-${randomBytes(2).toString('hex')}`;
    }
}
