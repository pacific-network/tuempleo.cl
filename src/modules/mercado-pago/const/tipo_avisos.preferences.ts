import { MercadoPagoConfig, Preference } from 'mercadopago';
import * as dotenv from 'dotenv';

dotenv.config();

// Inicializar cliente Mercado Pago
const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN as string,
});

// Crear instancia de Preference
const preference = new Preference(client);

// Función para crear una preferencia de pago según tipo de aviso
export const crearPreferenciaPago = async (tipoAviso: string) => {
    // Definir configuración según el tipo de aviso
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

    const plan = avisos[tipoAviso.toUpperCase() as keyof typeof avisos];

    if (!plan) throw new Error(`Tipo de aviso no válido: ${tipoAviso}`);

    // Crear preferencia Mercado Pago
    const result = await preference.create({
        body: {
            items: [
                {
                    id: '',
                    title: plan.title,
                    description: plan.description,
                    quantity: 1,
                    currency_id: 'CLP',
                    unit_price: plan.price,
                },
            ],
            back_urls: {
                success: 'https://www.tuempleo.cl/empresas/resultado-transaccion.html',
                failure: 'https://www.tuempleo.cl/empresas/resultado-transaccion.html',
                pending: 'https://www.tuempleo.cl/empresas/resultado-transaccion.html',
            },
            auto_return: 'all', // Retorna automáticamente si se aprueba el pago
        },
    });

    console.log('ID:', result.id);
    return result;
};

// Ejemplo de uso (puedes quitar esto en producción)
// crearPreferenciaPago('BASICO').catch(console.error);
