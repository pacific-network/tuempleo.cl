//src/config/database.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { Empresa } from 'src/repository/business/business.entity';
import { Curriculum } from 'src/repository/curriculum/curriculum.entity';
import { Planes } from 'src/repository/plans/plans.entity';
import { Postulante } from 'src/repository/postulant/postulant.entity';
import { Registro } from 'src/repository/register/register.entity';
import { Rol } from 'src/repository/role/role.entity';
import { Usuario } from 'src/repository/user/user.entity';

// Cargar variables de entorno
dotenv.config();

export const databaseConfig: TypeOrmModuleOptions = {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tuempleo',
    entities: [Registro, Rol, Usuario, Postulante, Curriculum, Planes, Empresa],
    synchronize: process.env.DB_SYNCHRONIZE === 'true',

};
