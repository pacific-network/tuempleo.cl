import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
    getUserById(id: number) {
        // Lógica para obtener un usuario por ID
        return { id, message: 'Usuario encontrado' };
    }

    createUser(userData: any) {
        // Lógica para crear un nuevo usuario
        return { ...userData, message: 'Usuario creado' };
    }
}
