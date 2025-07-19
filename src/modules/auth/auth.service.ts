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
        const payload = { email: user.email, sub: user.id, rolId: user.rol.id };
        const token = this.jwtService.sign(payload);
        return token;
    }
    //funcion para crear el usuario con oauth 
    async validateOAuthUser(oauthPayload: {
        email: string;
        name: string;
        picture: string | null;
        provider: 'google' | 'linkedin';
        oauthId: string;
    }): Promise<Usuario> {
        const { email, name, picture } = oauthPayload;

        let usuario = await this.usuarioRepository.findOne({
            where: { email },
            relations: ['rol'],
        });

        if (usuario) {
            // ✅ Marcar como activo si no lo está
            if (!usuario.is_activo) {
                usuario.is_activo = true;
                usuario = await this.usuarioRepository.save(usuario);
            }
            return usuario;
        }

        // Paso 2: Si no existe, registrarlo como nuevo (estado inactivo)
        const nombre = name.split(' ')[0];
        const apellido = name.split(' ').slice(1).join(' ') || '';

        // Crear entrada en tabla `registro` si no existe
        let registro = await this.registroRepository.findOne({ where: { email } });
        if (!registro) {
            registro = this.registroRepository.create({
                email,
                nombre_completo: name,
                es_activo: false,
            });
            await this.registroRepository.save(registro);
        }

        // Buscar rol por defecto (ej: rol_id = 3 => "pendiente")
        const rol = await this.rolRepository.findOne({ where: { id: 3 } });
        if (!rol) throw new Error('Rol predeterminado no encontrado');

        usuario = new Usuario();
        usuario.email = email;
        usuario.nombres = nombre;
        usuario.apellidos = apellido;
        usuario.password = '';
        usuario.rol = rol;
        usuario.perfil_foto = picture || null;
        usuario.id_empresa = null;
        usuario.is_activo = true; // ✅ Nuevo usuario creado también debe estar activo

        return await this.usuarioRepository.save(usuario);
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

}

