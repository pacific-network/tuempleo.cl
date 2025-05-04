import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

export const databaseConfig: TypeOrmModuleOptions = {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'metricas_vcc',
    entities: [__dirname + '/../**/*.entity.{ts,js}'],
    synchronize: process.env.DB_SYNCHRONIZE === 'true',

};
