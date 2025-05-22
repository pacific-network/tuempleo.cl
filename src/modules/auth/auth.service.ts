import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Registro } from '../../repository/register/register.entity';
import { Usuario } from '../../repository/user/user.entity';
import { Rol } from '../../repository/role/role.entity';
import { RegistrarUsuarioDto } from './dto/register';
import { IniciarSesionDto } from './dto/login';
import { EncryptService } from 'src/shared/encrypt/encrypt.service';

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

    async login(loginData: IniciarSesionDto): Promise<any> {
        const { email, password, rolId } = loginData;
    
        const registro = await this.registroRepository.findOne({ where: { email } });
        if (!registro) throw new UnauthorizedException('Usuario no encontrado');
    
        // Comparar contraseña ingresada vs almacenada
        const passwordMatch = this.encryptService.compare(password, registro.password);
        if (!passwordMatch) throw new UnauthorizedException('Contraseña incorrecta');
    
        // Activar el registro
        registro.es_activo = true;
        await this.registroRepository.save(registro);
    
        // Verificar si el usuario ya existe
        let user = await this.usuarioRepository.findOne({
            where: { email },
            relations: ['rol'], // Incluir el rol
        });
    
        // Si no existe, lo creamos
        if (!user) {
            const rol = await this.rolRepository.findOne({ where: { id: rolId } });
            if (!rol) throw new UnauthorizedException('Rol no encontrado');
    
            user = this.usuarioRepository.create({
                nombres: registro.nombre_completo.split(' ')[0],
                apellidos: registro.nombre_completo.split(' ').slice(1).join(' '),
                password: registro.password,
                email: registro.email,
                rol: rol,
            });
    
            await this.usuarioRepository.save(user);
        }
    
        // Payload del JWT
        const payload = { email: user.email, sub: user.id, rolId: user.rol.id };
        const token = this.jwtService.sign(payload);
    
        return {
            message: 'Login exitoso',
            token,
        };
    }

}    
