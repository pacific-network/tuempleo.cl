import {
    CanActivate,
    ExecutionContext,
    Injectable,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Empleador } from 'src/repository/employer/employer.entity';
import { Usuario } from 'src/repository/user/user.entity';

/**
 * Exige ser main (`admin`) **de la empresa activa**.
 *
 * Con una persona en varias empresas, mirar cualquier membresía no alcanza:
 * quien es main en la empresa A y colaborador en la B pasaría el guard y
 * operaría sobre B con permisos que ahí no tiene. Por eso se resuelve contra
 * `usuario.id_empresa`, que es la empresa sobre la que se está actuando.
 */
@Injectable()
export class EmployerAdminGuard implements CanActivate {
    constructor(
        @InjectRepository(Empleador)
        private readonly empleadorRepo: Repository<Empleador>,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.sub || request.user?.userId;

        if (!userId) return false;

        const usuario = await this.empleadorRepo.manager.findOne(Usuario, {
            where: { id: userId },
        });
        if (!usuario) return false;

        const empleador = usuario.id_empresa
            ? await this.empleadorRepo.findOne({
                where: {
                    usuario: { id: userId },
                    empresa: { id: usuario.id_empresa },
                },
            })
            // Sin empresa activa seleccionada solo se resuelve si hay una sola
            // membresía; con varias, la petición es ambigua y no se adivina.
            : await this.unicaMembresia(userId);

        if (!empleador) return false;

        if (empleador.rol_empresa !== 'admin') {
            throw new ForbiddenException('Solo el administrador puede realizar esta accion');
        }

        return true;
    }

    private async unicaMembresia(userId: number): Promise<Empleador | null> {
        const membresias = await this.empleadorRepo.find({
            where: { usuario: { id: userId } },
            take: 2,
        });
        return membresias.length === 1 ? membresias[0] : null;
    }
}
