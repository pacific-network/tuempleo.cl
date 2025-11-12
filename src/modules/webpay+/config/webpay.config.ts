// export const WEBPAY_CONFIG = {
//     commerceCode: "597055555532",
//     apiKey: "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C",
//     environment: "INTEGRACION", // Cambiar a PRODUCCION al ir a producción
//     returnUrl: "https://tuempleo.cl/api/v1/webpay/return",
//     finalUrl: "https://www.tuempleo.cl/empresas/resultado-transaccion.html",
// };

// // export const WEBPAY_CONFIG = {
// //     commerceCode: "597055555532",
// //     apiKey: "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C",
// //     environment: "INTEGRACION",
// //     returnUrl: "http://localhost:3000/v1/webpay/return",  // backend local
// //     finalUrl: "http://127.0.0.1:5501/jobox/empresas/resultado-transaccion.html",  // frontend local
// // };
import * as dotenv from 'dotenv';
dotenv.config();

export const WEBPAY_CONFIG = {
    commerceCode: process.env.WEBPAY_COMMERCE_CODE as string,
    apiKey: process.env.WEBPAY_API_KEY as string,
    environment: process.env.WEBPAY_ENVIRONMENT || 'INTEGRACION',
    returnUrl: process.env.WEBPAY_RETURN_URL as string,
    finalUrl: process.env.WEBPAY_FINAL_URL as string,
};
