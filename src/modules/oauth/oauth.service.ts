
//src/repository/oauth/login.repository.ts
import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Registro } from '../../repository/register/register.entity';
import { Usuario } from '../../repository/user/user.entity';
import { Rol } from '../../repository/role/role.entity';
import { EncryptService } from 'src/shared/encrypt/encrypt.service';
import { RegistrarUsuarioOAuthDto } from './dto/register-oauth';


@Injectable()
export class OauthService {
    constructor(
        @InjectRepository(Registro)
        private readonly registroRepository: Repository<Registro>,
        @InjectRepository(Usuario)
        private readonly usuarioRepository: Repository<Usuario>,
        @InjectRepository(Rol)
        private readonly rolRepository: Repository<Rol>,
        private readonly jwtService: JwtService,
        private readonly encryptService: EncryptService
    ) { }


    async createTokenFromOAuth(user: any): Promise<string> {
        console.log('User en createTokenFromOAuth:', user);

        if (!user || !user.id || !user.email) {
            throw new Error('Usuario inválido para crear token');
        }
        if (!user.rol || !user.rol.id) {
            throw new Error('El usuario no tiene rol asignado');
        }

        const payload = { email: user.email, sub: user.id, rolId: user.rol.id };
        return this.jwtService.sign(payload);
    }
    async validateOAuthUser(oauthPayload: {
        email: string;
        name: string;
        picture: string | null;
        provider: 'google' | 'linkedin';
        oauthId: string;
    }): Promise<Usuario> {
        try {
            const { email, name, picture } = oauthPayload;

            // Buscar usuario con rol
            let usuario = await this.usuarioRepository.findOne({
                where: { email },
                relations: ['rol'],
            });

            if (usuario) {
                if (!usuario.is_activo) {
                    usuario.is_activo = true;
                    usuario = await this.usuarioRepository.save(usuario);
                }

                if (!usuario.rol) {
                    const rolDefault = await this.rolRepository.findOne({ where: { id: 2 } });
                    if (!rolDefault) throw new Error('Rol predeterminado no encontrado');

                    usuario.rol = rolDefault;
                    usuario = await this.usuarioRepository.save(usuario);
                }

                return usuario;
            }

            // Si no existe usuario, crear uno nuevo
            const nombre = name.split(' ')[0];
            const apellido = name.split(' ').slice(1).join(' ') || '';

            const dummyPassword = await this.encryptService.encrypt('oauth_dummy_password');

            // Crear registro si no existe
            let registro = await this.registroRepository.findOne({ where: { email } });
            if (!registro) {
                registro = this.registroRepository.create({
                    email,
                    nombre_completo: name,
                    password: dummyPassword,
                    es_activo: false,
                });
                await this.registroRepository.save(registro);
            }

            // Buscar rol predeterminado
            const rol = await this.rolRepository.findOne({ where: { id: 2 } });
            if (!rol) throw new Error('Rol predeterminado no encontrado');

            usuario = this.usuarioRepository.create({
                email,
                nombres: nombre,
                apellidos: apellido,
                password: dummyPassword,
                rol,
                perfil_foto: picture || null,
                id_empresa: null,
                is_activo: false,
            });

            const nuevoUsuario = await this.usuarioRepository.save(usuario);

            // Recargar usuario con rol
            const usuarioConRol = await this.usuarioRepository.findOne({
                where: { id: nuevoUsuario.id },
                relations: ['rol'],
            });

            if (!usuarioConRol) throw new Error('Usuario no encontrado después de crear');
            if (!usuarioConRol.rol) throw new Error('Usuario creado sin rol asignado');

            return usuarioConRol;

        } catch (error) {
            console.error('Error en validateOAuthUser:', error);
            throw new Error('Error validando o creando usuario OAuth');
        }
    }


    async loginWithOAuth({
        email,
        name,
        picture,
    }: {
        email: string;
        name: string;
        picture?: string;
    }) {
        let user = await this.usuarioRepository.findOne({ where: { email } });

        user = this.usuarioRepository.create({
            email,
            nombres: name, // Cambiado de 'nombre'
            apellidos: '', // Asigna algo válido si es obligatorio
            password: await this.encryptService.encrypt('oauth_dummy_password'),
            perfil_foto: picture || null,
            is_activo: false,
            fecha_creacion: new Date(), // Cambiado de 'created_at'
        });

        const payload = { sub: user.id, email: user.email };
        const token = this.jwtService.sign(payload);

        return { token };
    }

    async findUserByEmail(email: string): Promise<Usuario | null> {
        const user = await this.usuarioRepository.findOne({
            where: { email },
            relations: ['rol'],
        });

        if (!user) {
            throw new NotFoundException(`Usuario con email ${email} no encontrado`);
        }

        return user;
    }
    
}