import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Rol } from 'src/repository/role/role.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Rol)
    private readonly roleRepository: Repository<Rol>,
  ) {}

  async findAll(): Promise<Rol[]> {
    return await this.roleRepository.find();
  }

  async findById(id: number): Promise<Rol | null> {
    return await this.roleRepository.findOne({ where: { id } });
  }

  async create(roleData: Partial<Rol>): Promise<Rol> {
    const newRole = this.roleRepository.create(roleData);
    return await this.roleRepository.save(newRole);
  }
}
