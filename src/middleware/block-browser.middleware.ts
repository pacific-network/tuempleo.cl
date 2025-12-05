// src/middleware/block-browser.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class BlockBrowserMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const isHtmlRequest = req.headers['accept']?.includes('text/html');

    // Rutas que deben permitirse (OAuth y sus callbacks)
    const exemptedRoutes = [
      '/api/v1/auth/google',
      '/api/v1/auth/google/callback',
      '/api/v1/auth/linkedin',
      '/api/v1/auth/linkedin/callback',
      '/v1/oauth/google',
      '/v1/oauth/google/callback',
      '/v1/oauth/linkedin',
      '/v1/oauth/linkedin/callback',
      '/v1/webpay/return',
      '/uploads',
      '/v1/uploads/',
      'v1/curriculum/'

    ];

    // Verifica si la URL coincide con alguna ruta exenta
    const isExempted = exemptedRoutes.some(route =>
      req.originalUrl.startsWith(route)
    ) || req.originalUrl.match(/^\/v1\/curriculum\/.+\/view$/);

    if (isExempted) {
      return next(); // no bloquear si está permitido
    }

    const looksStatic =
      req.originalUrl.startsWith('/uploads/') ||
      req.originalUrl.startsWith('/v1/uploads/');
    if (looksStatic) return next(); // no bloquear si es un archivo estático

    const isBrowserRequest =
      req.method === 'GET' &&
      isHtmlRequest &&
      (req.originalUrl.startsWith('/api/v1/') || req.originalUrl.startsWith('/v1/'));

    if (isBrowserRequest) {
      res.status(403).send(`
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Acceso Denegado</title>
            <style>
              body {
                margin: 0;
                padding: 0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f8f9fa;
                color: #333;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                text-align: center;
              }
              .container {
                max-width: 500px;
                padding: 2rem;
                border-radius: 10px;
                background-color: #fff;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
              }
              h1 {
                font-size: 2rem;
                color: #dc3545;
                margin-bottom: 1rem;
              }
              p {
                font-size: 1.1rem;
                margin-bottom: 1rem;
              }
              .logo {
                width: 80px;
                margin-bottom: 1rem;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <img class="logo" src="https://tuempleo.cl/assets/img/logo/tuempleo.png" alt="TuEmpleo Logo" />
              <h1>🚫 Acceso Denegado</h1>
              <p>Tu acceso ha sido restringido temporalmente.</p>
              <p>Si crees que se trata de un error, contacta a <strong>soporte@tuempleo.cl</strong></p>
            </div>
          </body>
        </html>
      `);
    } else {
      next();
    }
  }
}
