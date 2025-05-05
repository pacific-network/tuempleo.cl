import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Logger } from "@nestjs/common";
import { UserService } from "../user/user.service";
import { IniciarSesionDto } from "./dto/login";
import { RegistrarUsuarioDto } from "./dto/register";
import { EncryptService } from "src/shared/encrypt/encrypt.service";
import { Registro } from "src/repository/register/register.entity";

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly encryptService: EncryptService,

    ) { }

    async register(userData: RegistrarUsuarioDto) {
        // Encriptar la contraseña antes de guardarla
        const passwordHash = this.encryptService.encrypt(userData.password);

        // Crear un objeto con los datos completos
        const nuevoRegistro: Partial<Registro> = {
            ...userData,
            password: passwordHash,
            es_activo: true,
            fecha_creacion: new Date(),
        };

        // Llamar a tu servicio para guardar el registro
        return await this.userService.crear_nuevo_registro(nuevoRegistro);
    }

    async login(loginData: IniciarSesionDto): Promise<{ access_token: string }> {
        const { email, password } = loginData;
        const usuario = await this.userService.getUserByEmail(email);
        if (!usuario) {
            this.logger.warn(`Intento de inicio de sesión fallido: email ${email} no encontrado.`);
            throw new UnauthorizedException("Credenciales inválidas");
        }
        const decryptedPassword = this.encryptService.decrypt(loginData.password);
        if (decryptedPassword !== password) {
            this.logger.warn(`Las contraseñas no coinciden para el email: ${email}`);
            throw new UnauthorizedException('Las contraseñas no coinciden');
        }
        const payload = { id: usuario.id, email: usuario.email };
        const token = this.jwtService.sign(payload);
        return { access_token: token };
    }


    // async signIn(username: string, password: string): Promise<{ access_token: string }> {
    //     const user = await this.usersService.findOne(username);
    //     if (!user) {
    //         this.logger.warn(`Intento de inicio de sesión fallido: usuario ${username} no encontrado.`);
    //         throw new UnauthorizedException('Usuario no encontrado');
    //     }

    //     const decryptedPassword = this.encrypt.decrypt(user.password);
    //     if (decryptedPassword !== password) {
    //         this.logger.warn(`Las contraseñas no coinciden para el usuario: ${username}`);
    //         throw new UnauthorizedException('Las contraseñas no coinciden');
    //     }

    //     const payload = { sub: user.id, username: user.username, role: user.role_id };

    //     return {
    //         access_token: await this.jwtService.signAsync(payload),
    //     };
    // }
}

