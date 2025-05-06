import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { Rol } from 'src/repository/role/role.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Rol])],
    controllers: [RoleController],
    providers: [RoleService],
})
export class RoleModule { }
