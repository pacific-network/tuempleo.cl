import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Registro } from 'src/repository/register/register.entity';
import { Usuario } from 'src/repository/user/user.entity';
import { Empleador } from 'src/repository/employer/employer.entity';
import { Postulante } from 'src/repository/postulant/postulant.entity';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

/** Estado de un RUT frente a un rol concreto. */
export interface RutRolStatus {
    puede_registrarse: boolean;
    ya_registrado: boolean;
    motivo: string | null;
}

export interface RutStatus {
    rut: string;
    /** El RUT ya está cargado en algún usuario. */
    exists: boolean;
    /** El RUT pertenece al userId consultado (dual-rol permitido). */
    es_propio: boolean;
    perfiles: { empleador: boolean; postulante: boolean };
    empleador: RutRolStatus;
    postulante: RutRolStatus;
}

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(Registro)
        private readonly registroRepository: Repository<Registro>,
        @InjectRepository(Usuario)
        private readonly userRepository: Repository<Usuario>,
        @InjectRepository(Empleador)
        private readonly empleadorRepository: Repository<Empleador>,
        @InjectRepository(Postulante)
        private readonly postulanteRepository: Repository<Postulante>,
    ) { }

    // ---------------------------------------------------------
    // 📌 ESTADO DE UN RUT (validación para ambos onboardings)
    // ---------------------------------------------------------
    /**
     * Resuelve, para un RUT dado, si se puede usar para registrarse como empleador
     * y/o como candidato.
     *
     * Reglas:
     *  - RUT libre → sirve para ambos roles.
     *  - RUT de OTRO usuario → no sirve para ninguno (`usuario.rut` es único).
     *  - RUT propio → sirve para el rol que aún no tiene, y se bloquea el que ya
     *    tiene. Ser empleador y candidato a la vez está soportado a propósito
     *    (ver `crearPostulante`: "RUT único, permitiendo mismo usuario").
     *
     * `userId` es opcional porque el formulario de registro se usa también sin
     * sesión; sin él, un RUT existente se considera siempre ajeno.
     */
    async getRutStatus(rut: string, userId?: number): Promise<RutStatus> {
        const usuario = await this.userRepository.findOne({ where: { rut } });

        if (!usuario) {
            const libre: RutRolStatus = {
                puede_registrarse: true,
                ya_registrado: false,
                motivo: null,
            };
            return {
                rut,
                exists: false,
                es_propio: false,
                perfiles: { empleador: false, postulante: false },
                empleador: libre,
                postulante: { ...libre },
            };
        }

        const esPropio = userId !== undefined && usuario.id === userId;

        if (!esPropio) {
            const ajeno: RutRolStatus = {
                puede_registrarse: false,
                ya_registrado: false,
                motivo: 'Este RUT ya está registrado por otra cuenta',
            };
            return {
                rut,
                exists: true,
                es_propio: false,
                perfiles: { empleador: false, postulante: false },
                empleador: ajeno,
                postulante: { ...ajeno },
            };
        }

        // El RUT es del propio usuario: decide el perfil que ya tenga.
        const [empleador, postulante] = await Promise.all([
            this.empleadorRepository.findOne({ where: { usuario: { id: usuario.id } } }),
            this.postulanteRepository.findOne({ where: { usuario: { id: usuario.id } } }),
        ]);

        return {
            rut,
            exists: true,
            es_propio: true,
            perfiles: { empleador: !!empleador, postulante: !!postulante },
            empleador: {
                puede_registrarse: !empleador,
                ya_registrado: !!empleador,
                motivo: empleador ? 'Ya tienes un perfil de empleador' : null,
            },
            postulante: {
                puede_registrarse: !postulante,
                ya_registrado: !!postulante,
                motivo: postulante ? 'Ya tienes un perfil de candidato' : null,
            },
        };
    }

    // ---------------------------------------------------------
    // 📌 SUBIR FOTO DE PERFIL
    // ---------------------------------------------------------
    async uploadProfilePhoto(userId: number, file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No se recibió ningún archivo');
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new BadRequestException('Usuario no encontrado');
        }

        const uploadBase = process.env.UPLOAD_PATH || path.join(__dirname, '..', '..', 'upload');
        const uploadPath = path.join(uploadBase, 'profile-photos');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        // Eliminar foto anterior si existe
        if (user.perfil_foto) {
            const oldFile = path.join(uploadBase, user.perfil_foto.replace('/upload/', ''));
            if (fs.existsSync(oldFile)) {
                fs.unlinkSync(oldFile);
            }
        }

        const ext = path.extname(file.originalname);
        const fileName = `profile-photo-${userId}-${Date.now()}${ext}`;
        const filePath = path.join(uploadPath, fileName);
        fs.writeFileSync(filePath, file.buffer);

        const publicUrl = `/upload/profile-photos/${fileName}`;
        await this.userRepository.update({ id: userId }, { perfil_foto: publicUrl });

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
