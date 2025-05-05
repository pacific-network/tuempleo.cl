import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Registro } from 'src/repository/register/register.entity';
import { Repository } from 'typeorm';
@Injectable()
export class UserService {
    constructor(
        @InjectRepository(Registro)
        private readonly registroRepository: Repository<Registro>,
    ) { }
    getUserById(id: number) {
        // Lógica para obtener un usuario por ID
        return { id, message: 'Usuario encontrado' };
    }

    createUser(userData: any) {
        // Lógica para crear un nuevo usuario
        return { ...userData, message: 'Usuario creado' };
    }

    async crear_nuevo_registro(data: Partial<Registro>) {
        const nuevo = this.registroRepository.create(data);
        return await this.registroRepository.save(nuevo);
    }

    async getUserByEmail(email: string): Promise<Registro | null> {
        const usuario = await this.registroRepository.findOne({
            where: { email },
        });
        return usuario || null;
    }
}
