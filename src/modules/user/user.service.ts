import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Registro } from 'src/repository/register/register.entity';
import { Usuario } from 'src/repository/user/user.entity';
import { Repository } from 'typeorm';
@Injectable()
export class UserService {
    constructor(
        @InjectRepository(Registro)
        private readonly registroRepository: Repository<Registro>,
        @InjectRepository(Usuario)
        private readonly userRepository: Repository<Usuario>,
    ) { }

    async getAllUsers(): Promise<Registro[]> {
        return this.registroRepository.find();
    }

    async getUserById(id: number) {
        const user = await this.registroRepository.findOne({
            where: { id },
        });

        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        return user;
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


    // Método para obtener un usuario por su ID en base a tabla usuario
    async getUsuarioByIdFromUsers(id: number): Promise<Usuario> {
        const user = await this.userRepository.findOne({ where: { id } });

        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        return user;
    }





}
