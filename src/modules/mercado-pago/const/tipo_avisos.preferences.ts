// // import { MercadoPagoConfig, Preference } from 'mercadopago';
// // import * as dotenv from 'dotenv';

// // dotenv.config();

// // // Inicializar cliente Mercado Pago
// // const client = new MercadoPagoConfig({
// //     accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN as string,
// // });

// // // Crear instancia de Preference
// // const preference = new Preference(client);

// // // Función para crear una preferencia de pago según tipo de aviso
// // export const crearPreferenciaPago = async (tipoAviso: string) => {
// //     // Definir configuración según el tipo de aviso
// //     const avisos = {
// //         BASICO: {
// //             title: 'Aviso Básico',
// //             description: 'Incluye 9999 avisos por 45 días y postulaciones ilimitadas.',
// //             price: 80000,
// //         },
// //         ESTANDAR: {
// //             title: 'Aviso Estándar',
// //             description: 'Incluye 9999 avisos por 45 días y currículums ilimitados.',
// //             price: 140000,
// //         },
// //         PREMIUM: {
// //             title: 'Aviso Premium',
// //             description: 'Incluye 9999 avisos por 60 días y postulaciones ilimitadas.',
// //             price: 180000,
// //         },
// //     };

// //     const plan = avisos[tipoAviso.toUpperCase() as keyof typeof avisos];

// //     if (!plan) throw new Error(`Tipo de aviso no válido: ${tipoAviso}`);

// //     // Crear preferencia Mercado Pago
// //     const result = await preference.create({
// //         body: {
// //             items: [
// //                 {
// //                     id: '',
// //                     title: plan.title,
// //                     description: plan.description,
// //                     quantity: 1,
// //                     currency_id: 'CLP',
// //                     unit_price: plan.price,
// //                 },
// //             ],
// //             // back_urls: {
// //             //     success: 'https://www.tuempleo.cl/empresas/resultado-transaccion.html',
// //             //     failure: 'https://www.tuempleo.cl/empresas/resultado-transaccion.html',
// //             //     pending: 'https://www.tuempleo.cl/empresas/resultado-transaccion.html',
// //             // },
// //             back_urls: {
// //                 success: 'http://127.0.0.1:5501/jobox/empresas/resultado-transaccion.html',
// //                 failure: 'http://127.0.0.1:5501/jobox/empresas/resultado-transaccion.html',
// //                 pending: 'http://127.0.0.1:5501/jobox/empresas/resultado-transaccion.html',
// //             },


// //             // auto_return: 'all', // Retorna automáticamente si se aprueba el pago
// //             notification_url: 'https://tuempleo.cl/api/v1/mercadopago/webhook',
// //         },
// //     });

// //     console.log('ID:', result.id);
// //     return result;
// // };

// // // Ejemplo de uso (puedes quitar esto en producción)
// // // crearPreferenciaPago('BASICO').catch(console.error);
// import { MercadoPagoConfig, Preference } from 'mercadopago';
// import * as dotenv from 'dotenv';

// dotenv.config();

// const client = new MercadoPagoConfig({
//     accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN as string,
// });

// const preference = new Preference(client);

// export const crearPreferenciaPago = async (tipoAviso: string) => {
//     const avisos = {
//         BASICO: {
//             title: 'Aviso Básico',
//             description: 'Incluye 9999 avisos por 45 días y postulaciones ilimitadas.',
//             price: 80000,
//         },
//         ESTANDAR: {
//             title: 'Aviso Estándar',
//             description: 'Incluye 9999 avisos por 45 días y currículums ilimitados.',
//             price: 140000,
//         },
//         PREMIUM: {
//             title: 'Aviso Premium',
//             description: 'Incluye 9999 avisos por 60 días y postulaciones ilimitadas.',
//             price: 180000,
//         },
//     };

//     const plan = avisos[tipoAviso.toUpperCase() as keyof typeof avisos];
//     if (!plan) throw new Error(`Tipo de aviso no válido: ${tipoAviso}`);

//     const isProd = process.env.NODE_ENV === 'production';

//     const backUrls = isProd
//         ? {
//             success: 'https://www.tuempleo.cl/empresas/resultado-transaccion-otros.html',
//             failure: 'https://www.tuempleo.cl/empresas/resultado-transaccion-otros.html',
//             pending: 'https://www.tuempleo.cl/empresas/resultado-transaccion-otros.html',
//         }
//         : {
//             // ⚠️ URL local solo visible para ti, no para MP
//             success: 'http://127.0.0.1:5501/jobox/empresas/resultado-transaccion-otros.html',
//             failure: 'http://127.0.0.1:5501/jobox/empresas/resultado-transaccion-otros.html',
//             pending: 'http://127.0.0.1:5501/jobox/empresas/resultado-transaccion-otros.html',
//         };

//     const result = await preference.create({
//         body: {
//             items: [
//                 {
//                     id: plan.title,
//                     title: plan.title,
//                     description: plan.description,
//                     quantity: 1,
//                     currency_id: 'CLP',
//                     unit_price: plan.price,
//                 },
//             ],
//             back_urls: {
//                 success: 'https://www.tuempleo.cl/empresas/resultado-transaccion-otros.html',
//                 failure: 'https://www.tuempleo.cl/empresas/resultado-transaccion-otros.html',
//                 pending: 'https://www.tuempleo.cl/empresas/resultado-transaccion-otros.html',
//             },
//             auto_return: 'all', // Retorna automáticamente si se aprueba el pago
//             notification_url: 'https://tuempleo.cl/api/v1/mercadopago/webhook',
//         },
//     });

//     // crearPreferenciaPago('BASICO')
//     // crearPreferenciaPago('ESTANDAR')
//     // crearPreferenciaPago('PREMIUM')

//     console.log('✅ Preferencia creada:', result.id);
//     return result;


// };
import { MercadoPagoConfig, Preference } from 'mercadopago';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN as string,
});

const preference = new Preference(client);

export const crearPreferenciaPago = async (tiposAviso: string[]) => {
    // 🔹 Tipos de aviso disponibles
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

    // 🔸 Validaciones
    if (!Array.isArray(tiposAviso) || tiposAviso.length === 0) {
        throw new Error('Debes seleccionar al menos un tipo de aviso.');
    }

    if (tiposAviso.length > 3) {
        throw new Error('Solo puedes comprar hasta 3 avisos (uno de cada tipo).');
    }

    const tiposUnicos = [...new Set(tiposAviso.map(t => t.toUpperCase()))];
    if (tiposUnicos.length !== tiposAviso.length) {
        throw new Error('No puedes repetir el mismo tipo de aviso en una transacción.');
    }

    // 🔹 Construir ítems válidos
    const items = tiposUnicos.map((tipo) => {
        const plan = avisos[tipo as keyof typeof avisos];
        if (!plan) throw new Error(`Tipo de aviso no válido: ${tipo}`);
        return {
            id: tipo,
            title: plan.title,
            description: plan.description,
            quantity: 1,
            currency_id: 'CLP',
            unit_price: plan.price,
        };
    });

    const isProd = process.env.NODE_ENV === 'production';
    const backUrls = isProd
        ? {
            success: 'https://www.tuempleo.cl/empresas/resultado-transaccion.html',
            failure: 'https://www.tuempleo.cl/empresas/resultado-transaccion.html',
            pending: 'https://www.tuempleo.cl/empresas/resultado-transaccion.html',
        }
        : {
            // ⚠️ Mercado Pago no acepta localhost → usa ngrok o dominio público para pruebas
            success: 'https://www.tuempleo.cl/empresas/resultado-transaccion.html',
            failure: 'https://www.tuempleo.cl/empresas/resultado-transaccion.html',
            pending: 'https://www.tuempleo.cl/empresas/resultado-transaccion.html',
        };

    // 🔹 Crear preferencia Mercado Pago (usando los items válidos)
    const result = await preference.create({
        body: {
            items, // ✅ usamos el array generado dinámicamente
            back_urls: backUrls,
            auto_return: 'approved',
            notification_url: 'https://tuempleo.cl/api/v1/mercadopago/webhook',
        },
    });

    console.log('✅ Preferencia creada con avisos:', tiposUnicos);
    console.log('🆔 ID Mercado Pago:', result.id);

    return result;
};

// 🧪 Ejemplos de uso
// crearPreferenciaPago(['BASICO']);
// crearPreferenciaPago(['BASICO', 'ESTANDAR']);
// crearPreferenciaPago(['BASICO', 'ESTANDAR', 'PREMIUM']);
