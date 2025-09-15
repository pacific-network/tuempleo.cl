export const WEBPAY_CONFIG = {
    commerceCode: "597055555532",
    apiKey: "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C",
    environment: "INTEGRACION", // Cambiar a PRODUCCION al ir a producción
    returnUrl: "https://tuempleo.cl/api/v1/webpay/return",
    finalUrl: "https://www.tuempleo.cl/empresas/resultado-transaccion.html",
};

// export const WEBPAY_CONFIG = {
//     commerceCode: "597055555532",
//     apiKey: "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C",
//     environment: "INTEGRACION",
//     returnUrl: "http://localhost:3000/v1/webpay/return",  // backend local
//     finalUrl: "http://127.0.0.1:5500/jobox/empresas/resultado-transaccion.html",  // frontend local
//};