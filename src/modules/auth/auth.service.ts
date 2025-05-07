import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Registro } from '../../repository/register/register.entity'; // Asumiendo que tienes esta entidad
import { Usuario } from '../../repository/user/user.entity';  // Entidad de usuario base
import { RegistrarUsuarioDto } from './dto/register'; // DTO para el registro
import { IniciarSesionDto } from './dto/login';
import { EncryptService } from 'src/shared/encrypt/encrypt.service'; // Servicio de encriptación

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(Registro)
        private readonly registroRepository: Repository<Registro>,
        @InjectRepository(Usuario)
        private readonly usuarioRepository: Repository<Usuario>,
        private readonly jwtService: JwtService,
        private readonly encryptService: EncryptService // Inyectamos el servicio de encriptación
    ) { }

    // Registro del usuario
    async register(userData: RegistrarUsuarioDto): Promise<any> {
        const { email, password, nombre_completo } = userData;

        // Verificar si el email ya está registrado
        const existingRegistro = await this.registroRepository.findOne({ where: { email } });
        if (existingRegistro) {
            throw new UnauthorizedException('Email ya registrado');
        }

        // Encriptamos la contraseña antes de guardarla
        const passwordhash = await this.encryptService.encrypt(password);

        // Crear un nuevo registro con es_activo en false
        const newRegistro = this.registroRepository.create({
            email,
            password: passwordhash,
            nombre_completo,
            es_activo: false,  // El usuario estará inactivo inicialmente
        });

        // Guardamos el registro
        await this.registroRepository.save(newRegistro);
        return { message: 'Registro exitoso. Espera la activación.' };
    }

    // Login del usuario
    async login(loginData: IniciarSesionDto): Promise<any> {
        const { email, password } = loginData;

        // Buscar el registro del usuario
        const registro = await this.registroRepository.findOne({ where: { email } });
        if (!registro) {
            throw new UnauthorizedException('Usuario no encontrado');
        }

        // Verificar si la contraseña es correcta
        const passwordMatch = await this.encryptService.decrypt(registro.password);
        if (!passwordMatch) {
            throw new UnauthorizedException('Contraseña incorrecta');
        }

        // Activar al usuario: actualizar es_activo a true
        registro.es_activo = true;
        await this.registroRepository.save(registro);

        // Crear el registro en la entidad Usuario
        const [nombres, apellidos] = registro.nombre_completo.split(' ', 2); // Separar el nombre completo en 2 partes

        const newUser = this.usuarioRepository.create({
            nombres,  // Asignar la primera parte como 'nombres'
            apellidos: apellidos || '',  // Asignar la segunda parte (si existe) como 'apellidos'
            password: registro.password,  // Usamos el mismo password, ya encriptado
            email: registro.email,
            rol: 'usuario', // Puedes asignar un rol por defecto, o dejarlo vacío si es necesario
            is_activo: true, // El usuario ya está activo
        });

        await this.usuarioRepository.save(newUser);

        // Generar el token JWT
        const payload = { email: registro.email, sub: newUser.id };
        const token = this.jwtService.sign(payload);

        // Retornar el token junto con cualquier otra información necesaria
        return {
            message: 'Login exitoso',
            token,
        };
    }
}
