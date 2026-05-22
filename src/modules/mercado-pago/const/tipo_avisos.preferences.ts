import { MercadoPagoConfig, Preference } from 'mercadopago';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN as string,
});

const preference = new Preference(client);

const avisos = {
    BASICO: {
        title: 'Aviso Básico',
        description: 'Incluye 9999 avisos por 45 días y postulaciones ilimitadas.',
        price: 80000,
    },
    ESTANDAR: {
        title: 'Aviso Estándar',
        description: 'Incluye 9999 avisos por 45 días y currículums ilimitados.',
        price: 140000,
    },
    PREMIUM: {
        title: 'Aviso Premium',
        description: 'Incluye 9999 avisos por 60 días y postulaciones ilimitadas.',
        price: 180000,
    },
};

export type MpItem = { tipoAviso: 'BASICO' | 'ESTANDAR' | 'PREMIUM'; cantidad: number };

export const crearPreferenciaPago = async (
    itemsCarrito: MpItem[],
    externalReference?: string,
) => {
    if (!Array.isArray(itemsCarrito) || itemsCarrito.length === 0) {
        throw new Error('Debes seleccionar al menos un tipo de aviso.');
    }

    const items = itemsCarrito.map((item) => {
        const plan = avisos[item.tipoAviso];
        if (!plan) throw new Error(`Tipo de aviso no válido: ${item.tipoAviso}`);
        return {
            id: item.tipoAviso,
            title: plan.title,
            description: plan.description,
            quantity: item.cantidad,
            currency_id: 'CLP',
            unit_price: plan.price,
        };
    });

    // Igual que Webpay: back_urls apuntan al backend para procesar stock
    // sincronamente; el backend redirige al frontend al terminar.
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const backUrl =
        process.env.MERCADO_PAGO_RETURN_URL ||
        `${frontendUrl}/payment/mercadopago`;
    const isPublicBackUrl = /^https:\/\//i.test(backUrl);

    const body: any = {
        items,
        back_urls: {
            success: backUrl,
            failure: backUrl,
            pending: backUrl,
        },
    };

    // external_reference deja un puntero a nuestra transacción aunque el
    // payment object no incluya preference_id (caso frecuente en MP).
    if (externalReference) {
        body.external_reference = externalReference;
    }

    // Mercado Pago no acepta auto_return con back_urls en localhost / http
    if (isPublicBackUrl) {
        body.auto_return = 'approved';
    }

    if (process.env.MERCADO_PAGO_NOTIFICATION_URL) {
        body.notification_url = process.env.MERCADO_PAGO_NOTIFICATION_URL;
    }

    const result = await preference.create({ body });

    console.log('✅ Preferencia creada con items:', itemsCarrito);
    console.log('🆔 ID Mercado Pago:', result.id);

    return result;
};

export { avisos };
