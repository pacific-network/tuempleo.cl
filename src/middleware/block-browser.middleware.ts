import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

@Injectable()
export class BlockBrowserMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {

    // =========================================================
    // 🔑 EXCLUSIONES ABSOLUTAS (NO SE TOCAN)
    // =========================================================

    // OAuth (Google / LinkedIn) → SIEMPRE permitir
    if (req.originalUrl.startsWith('/v1/oauth/')) {
      return next()
    }

    // Webpay return (flujo browser-based)
    if (req.originalUrl.startsWith('/v1/webpay/return')) {
      return next()
    }

    // Archivos estáticos / uploads
    if (
      req.originalUrl.startsWith('/uploads/') ||
      req.originalUrl.startsWith('/v1/uploads/')
    ) {
      return next()
    }

    // Visualización pública de CV
    if (req.originalUrl.match(/^\/v1\/curriculum\/.+\/view$/)) {
      return next()
    }

    // Descargas (CSV, archivos generados)
    if (req.originalUrl.includes('/export-csv')) {
      return next()
    }

    // =========================================================
    // 🔍 DETECCIÓN DE REQUESTS DE NAVEGADOR
    // =========================================================

    const acceptHeader = req.headers['accept'] || ''
    const isHtmlRequest = typeof acceptHeader === 'string' && acceptHeader.includes('text/html')

    const isApiRoute =
      req.originalUrl.startsWith('/api/v1/') ||
      req.originalUrl.startsWith('/v1/')

    const isBrowserRequest =
      req.method === 'GET' &&
      isHtmlRequest &&
      isApiRoute

    // =========================================================
    // 🚫 BLOQUEO CONTROLADO
    // =========================================================

    if (isBrowserRequest) {
      return res.status(403).send(`
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
      <img
        class="logo"
        src="https://tuempleo.cl/assets/img/logo/tuempleo.png"
        alt="TuEmpleo Logo"
      />
      <h1>🚫 Acceso Denegado</h1>
      <p>Tu acceso ha sido restringido temporalmente.</p>
      <p>
        Si crees que se trata de un error, contacta a
        <strong>soporte@tuempleo.cl</strong>
      </p>
    </div>
  </body>
</html>
      `)
    }

    // =========================================================
    // ✅ TODO LO DEMÁS PASA
    // =========================================================

    next()
  }
}
