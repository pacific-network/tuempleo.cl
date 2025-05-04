import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
require("dotenv").config();


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '', // La URL del frontend, ajústala si es diferente
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'], // Métodos permitidos
    allowedHeaders: ['Content-Type', 'Authorization'], 
    credentials: true, 
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();