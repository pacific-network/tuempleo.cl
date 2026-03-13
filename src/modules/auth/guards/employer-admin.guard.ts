import {
    CanActivate,
    ExecutionContext,
    Injectable,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Empleador } from 'src/repository/employer/employer.entity';

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

        const empleador = await this.empleadorRepo.findOne({
            where: { usuario: { id: userId } },
        });

        if (!empleador) return false;

        if (empleador.rol_empresa !== 'admin') {
            throw new ForbiddenException('Solo el administrador puede realizar esta accion');
        }

        return true;
    }
}
