import { Injectable, UnauthorizedException } from '@nestjs/common';
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
    }

    // Login del usuario
    async login(loginData: IniciarSesionDto): Promise<any> {
        const { email, password, rolId } = loginData;

        const registro = await this.registroRepository.findOne({ where: { email } });
        if (!registro) throw new UnauthorizedException('Usuario no encontrado');

        const passwordMatch = await this.encryptService.decrypt(registro.password);
        if (!passwordMatch) throw new UnauthorizedException('Contraseña incorrecta');

        // Activar el registro
        registro.es_activo = true;
        await this.registroRepository.save(registro);

        // Verificar el rol
        const rol = await this.rolRepository.findOne({ where: { id: rolId } });
        if (!rol) throw new UnauthorizedException('Rol no encontrado');

        // Crear el usuario con el rol
        const newUser = this.usuarioRepository.create({
            nombres: registro.nombre_completo.split(' ')[0],
            apellidos: registro.nombre_completo.split(' ').slice(1).join(' '),
            password: registro.password,
            email: registro.email,
            rol: rol,
        });

        await this.usuarioRepository.save(newUser);

        // Payload del JWT
        const payload = { email: registro.email, sub: newUser.id, rolId: rol.id };
        const token = this.jwtService.sign(payload);

        return {
            message: 'Login exitoso',
            token,
        };
    }
}
