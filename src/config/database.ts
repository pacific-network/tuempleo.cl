import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { Registro } from 'src/repository/register/register.entity';
import { Usuario } from 'src/repository/user/user.entity';

// Cargar variables de entorno
dotenv.config();

export const databaseConfig: TypeOrmModuleOptions = {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tuempleo.cl',
    entities: [Registro, Usuario],
    synchronize: process.env.DB_SYNCHRONIZE === 'true',

};
