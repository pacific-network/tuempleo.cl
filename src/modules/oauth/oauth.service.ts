
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


    // src/repository/oauth/login.repository.ts
    async validateOAuthUser(oauthPayload: {
        email: string;
        name: string;
        picture: string | null;
        provider: 'google' | 'linkedin';
        oauthId: string;
    }): Promise<{ usuario: Usuario; token: string; requiereEmpresa: boolean }> {
        try {
            const { email, name, picture } = oauthPayload;

            let usuario = await this.usuarioRepository.findOne({
                where: { email },
                relations: ['rol'],
            });

            if (usuario) {
                let updated = false;

                if (!usuario.is_activo) {
                    usuario.is_activo = true;
                    updated = true;
                }

                if (!usuario.rol) {
                    const rolDefault = await this.rolRepository.findOne({ where: { id: 2 } });
                    if (!rolDefault) throw new Error('Rol predeterminado no encontrado');
                    usuario.rol = rolDefault;
                    updated = true;
                }

                if (updated) usuario = await this.usuarioRepository.save(usuario);

                const token = this.jwtService.sign({
                    email: usuario.email,
                    sub: usuario.id,
                    rolId: usuario.rol.id,
                });

                return {
                    usuario,
                    token,
                    requiereEmpresa: !usuario.id_empresa,
                };
            }

            // Si no existe usuario, crear uno nuevo
            const [nombre, ...restoApellido] = name.split(' ');
            const apellido = restoApellido.join(' ') || '';

            const dummyPassword = await this.encryptService.encrypt('oauth_dummy_password');

            // Crear registro en tabla Registro si no existe
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

            const rol = await this.rolRepository.findOne({ where: { id: 2 } });
            if (!rol) throw new Error('Rol predeterminado no encontrado');

            const nuevoUsuario = this.usuarioRepository.create({
                email,
                nombres: nombre,
                apellidos: apellido,
                password: dummyPassword,
                rol,
                perfil_foto: picture || null,
                is_activo: true,
                fecha_creacion: new Date(),
                id_empresa: null, // se asociará después
            });

            const savedUsuario = await this.usuarioRepository.save(nuevoUsuario);

            const token = this.jwtService.sign({
                email: savedUsuario.email,
                sub: savedUsuario.id,
                rolId: savedUsuario.rol.id,
            });

            return {
                usuario: savedUsuario,
                token,
                requiereEmpresa: true,
            };

        } catch (error) {
            console.error('Error en validateOAuthUser:', error);
            throw new InternalServerErrorException('Error validando o creando usuario OAuth');
        }
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