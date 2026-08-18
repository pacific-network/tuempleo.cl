import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { requireEnv } from './config/secrets';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as passport from 'passport';
import * as session from 'express-session'; // Importar express-session
import * as dotenv from 'dotenv';
import * as express from 'express';
import { join } from 'path';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'https://tuvacante.com',
        'https://www.tuvacante.com',
        'http://localhost:5173',
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS not allowed'), false);
    },
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cache-Control',
      'Pragma',
      'Accept',
      'Origin',
    ],
    credentials: true,
  });

  // Agregar middleware de sesión
  const isProd = process.env.NODE_ENV === 'production';
  app.use(
    session({
      secret: requireEnv('SESSION_SECRET'),
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProd, // HTTPS-only en producción
        httpOnly: true, // inaccesible desde JS (mitiga XSS robo de cookie)
        sameSite: 'lax',
      },
    }),
  );

  // Inicializar passport y passport session
  app.use(passport.initialize());
  app.use(passport.session());
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none')
    next()
  })

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true, // elimina propiedades no declaradas en el DTO (evita mass-assignment)
      forbidNonWhitelisted: true, // rechaza con 400 si llegan propiedades desconocidas
    }),
  );

  // Aplica @Exclude() de las entidades (p.ej. password) en TODAS las respuestas
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  app.use('/upload', express.static(process.env.UPLOAD_PATH || join(__dirname, '..', 'upload')));


  // swagger config
  const config = new DocumentBuilder()
    .setTitle('API TUVACANTE.COM')
    .setDescription('Backend para tuvacante.com')
    .setVersion('1.0')
    .build();

  // swagger docs
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port);
}

void bootstrap();
