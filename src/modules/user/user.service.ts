import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Registro } from 'src/repository/register/register.entity';
import { Usuario } from 'src/repository/user/user.entity';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(Registro)
        private readonly registroRepository: Repository<Registro>,
        @InjectRepository(Usuario)
        private readonly userRepository: Repository<Usuario>,
    ) {}

    // ---------------------------------------------------------
    // 📌 SUBIR FOTO DE PERFIL
    // ---------------------------------------------------------
    async uploadProfilePhoto(userId: number, file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No se recibió ningún archivo');
        }

        // Ruta física donde se guardará el archivo
        const uploadDir = '';

        // Asegurar que la carpeta existe (por si acaso)
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Crear nombre único
        const ext = path.extname(file.originalname);
        const fileName = `profile-photo-${userId}-${Date.now()}${ext}`;
        const filePath = path.join(uploadDir, fileName);

        // Guardar archivo físicamente
        fs.writeFileSync(filePath, file.buffer);

        // Crear la URL pública
        const publicUrl = `/uploads/${fileName}`;

        // Actualizar registro del usuario
        await this.userRepository.update(userId, {
            perfil_foto: publicUrl,
        });

        return {
            message: 'Foto de perfil actualizada',
            url: publicUrl,
        };
    }

    // ---------------------------------------------------------
    // TUS MÉTODOS ORIGINALES (NO TOCO NADA)
    // ---------------------------------------------------------

    async getAllUsers(): Promise<Registro[]> {
        return this.registroRepository.find();
    }

    async getUserById(id: number) {
        const user = await this.registroRepository.findOne({ where: { id } });
        if (!user) throw new Error('Usuario no encontrado');
        return user;
    }

    async createUser(userData: any) {
        return { ...userData, message: 'Usuario creado' };
    }

    async crear_nuevo_registro(data: Partial<Registro>) {
        const nuevo = this.registroRepository.create(data);
        return await this.registroRepository.save(nuevo);
    }

    async getUserByEmail(email: string): Promise<Registro | null> {
        return await this.registroRepository.findOne({ where: { email } });
    }

    async getUsuarioByIdFromUsers(id: number): Promise<Usuario> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) throw new Error('Usuario no encontrado');
        return user;
    }
}
