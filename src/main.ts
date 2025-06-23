import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as passport from 'passport';
require('dotenv').config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'https://tuempleo.cl',
        'https://www.tuempleo.cl',
        'https://104.21.14.12',
        'https://172.67.133.188',
        'http://127.0.0.1:5500',
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS not allowed'), false);
    },
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // swagger config
  const config = new DocumentBuilder()
    .setTitle('API TUEMPLEO.CL')
    .setDescription('Backend para tuempleo.cl')
    .setVersion('1.0')
    .build();

  // swagger docs
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port);

}

void bootstrap();
