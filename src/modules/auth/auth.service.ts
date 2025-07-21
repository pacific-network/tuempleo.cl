//src.modules/auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Registro } from '../../repository/register/register.entity';
import { Usuario } from '../../repository/user/user.entity';
import { Rol } from '../../repository/role/role.entity';
import { RegistrarUsuarioDto } from './dto/register';
import { IniciarSesionDto } from './dto/login';
import { EncryptService } from 'src/shared/encrypt/encrypt.service';
import { User } from 'src/shared/decorators/user.decorator';
import { UpdateMeDto } from './dto/update-me';
import { RegistrarUsuarioOAuthDto } from './dto/register-oauth';
import { OAuthLoginDto } from './dto/oauth-login';



@Injectable()
export class AuthService {
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

    // Registro del usuario
    async register(userData: RegistrarUsuarioDto): Promise<any> {
        try {
            const { email, password, nombre_completo } = userData;

            const existingRegistro = await this.registroRepository.findOne({ where: { email } });
            if (existingRegistro) {
                throw new UnauthorizedException('Email ya registrado');
            }

            const passwordHash = await this.encryptService.encrypt(password);

            const newRegistro = this.registroRepository.create({
                email,
                password: passwordHash,
                nombre_completo,
                es_activo: false,
            });

            await this.registroRepository.save(newRegistro);
            return { message: 'Registro exitoso. Espera la activación.' };
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw new UnauthorizedException(error.message);
            } else {
                throw new InternalServerErrorException('Error al registrar el usuario');
            }
        }
    }

    async login(loginData: IniciarSesionDto, rolId: number): Promise<any> {
        const { email, password } = loginData;

        // Buscar registro
        const registro = await this.registroRepository.findOne({ where: { email } });
        if (!registro) throw new UnauthorizedException('Usuario no encontrado');

        // Verificar password
        const passwordMatch = await this.encryptService.compare(password, registro.password);
        if (!passwordMatch) throw new UnauthorizedException('Contraseña incorrecta');

        // Activar registro
        registro.es_activo = true;
        await this.registroRepository.save(registro);

        // Buscar usuario
        let user = await this.usuarioRepository.findOne({
            where: { email },
            relations: ['rol'],
        });

        if (!user) {
            // Crear usuario con rol asignado según el login
            const rol = await this.rolRepository.findOne({ where: { id: rolId } });
            if (!rol) throw new UnauthorizedException('Rol no encontrado');

            user = this.usuarioRepository.create({
                nombres: registro.nombre_completo.split(' ')[0],
                apellidos: registro.nombre_completo.split(' ').slice(1).join(' '),
                password: registro.password,
                email: registro.email,
                rol,
            });
            await this.usuarioRepository.save(user);
        } else {
            // Si existe usuario pero tiene otro rol, actualizarlo al rol del login
            if (user.rol.id !== rolId) {
                const rol = await this.rolRepository.findOne({ where: { id: rolId } });
                if (!rol) throw new UnauthorizedException('Rol no encontrado');
                user.rol = rol;
                await this.usuarioRepository.save(user);
            }
        }

        // Crear token
        const payload = { email: user.email, sub: user.id, rolId: user.rol.id };
        const token = this.jwtService.sign(payload);

        return {
            message: 'Login exitoso',
            token,
        };
    }


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

    async findUserFullById(id: number) {
        const user = await this.usuarioRepository.findOne({ where: { id } });
        if (!user) {
            throw new UnauthorizedException('Usuario no encontrado');
        }
        return user;
    }

    async updateMe(userId: number, dto: UpdateMeDto): Promise<Usuario> {
        const user = await this.usuarioRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }

        // Encriptar la nueva contraseña si viene
        if (dto.password) {
            dto.password = this.encryptService.encrypt(dto.password);
        }

        // Actualizar solo los campos presentes
        Object.assign(user, dto);

        return this.usuarioRepository.save(user);
    }

    async registerOAuth(userData: RegistrarUsuarioOAuthDto): Promise<any> {
        try {
            const { email, nombre_completo } = userData;

            const existingRegistro = await this.registroRepository.findOne({ where: { email } });
            if (existingRegistro) {
                throw new UnauthorizedException('Email ya registrado');
            }

            const newRegistro = this.registroRepository.create({
                email,
                nombre_completo,
                es_activo: false,
            });

            await this.registroRepository.save(newRegistro);
            return { message: 'Registro vía OAuth exitoso. Espera la activación.' };
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw new UnauthorizedException(error.message);
            } else {
                throw new InternalServerErrorException('Error al registrar el usuario vía OAuth');
            }
        }
    }

    // async loginWithOAuth(oauthUser: OAuthLoginDto): Promise<{ token: string; message: string }> {
    //     const user = await this.usuarioRepository.findOne({
    //         where: { email: oauthUser.email },
    //         relations: ['rol'],
    //     });

    //     if (!user) {
    //         throw new UnauthorizedException('Usuario no registrado previamente');
    //     }

    //     if (!user.is_activo) {
    //         user.is_activo = true;
    //         await this.usuarioRepository.save(user);
    //     }

    //     const token = this.jwtService.sign({
    //         email: user.email,
    //         sub: user.id,
    //         rolId: user.rol.id,
    //     });

    //     return { message: 'Inicio de sesión exitoso', token };
    // }

    async loginOAuth(oauthData: RegistrarUsuarioOAuthDto): Promise<{ token: string; message: string }> {
        const { email } = oauthData;

        const user = await this.usuarioRepository.findOne({
            where: { email },
            relations: ['rol'],
        });

        if (!user) {
            throw new UnauthorizedException('Usuario no registrado previamente');
        }

        if (!user.is_activo) {
            user.is_activo = true;
            await this.usuarioRepository.save(user);
        }

        const token = this.jwtService.sign(
            {
                email: user.email,
                sub: user.id,
                rolId: user.rol.id,
            },
            {
                expiresIn: '1h', // Opcional, tu tiempo de expiración deseado
            }
        );

        return {
            message: 'Inicio de sesión exitoso',
            token,
        };
    }




}

