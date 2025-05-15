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

    async getAllUsers(): Promise<Registro[]> {
        return this.registroRepository.find();
    }

    async getUserById(id: number) {
        const user = this.registroRepository.findOne({
            where: { id }
        });
        if (!user) {
            throw new Error('Usuario no encontrado');
        }
        return this.registroRepository.findOne({
            where: { id },
        });
    }

    async createUser(userData: any) {
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
