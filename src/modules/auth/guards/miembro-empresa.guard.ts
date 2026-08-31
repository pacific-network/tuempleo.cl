import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Empleador } from 'src/repository/employer/employer.entity';

/**
 * Exige pertenecer a la empresa que viene en la petición.
 *
 * Sostiene una invariante que antes no existía en ningún lado:
 *
 *   **ningún endpoint acepta un `empresaId` del cliente sin verificar que
 *   quien pide tenga membresía en esa empresa.**
 *
 * Hacía falta porque hay endpoints que reciben la empresa por parámetro y
 * nunca usaban el `userId` del token: tenían JWT, pero servían los datos de
 * cualquier empresa cambiando el número en la URL. Con una persona en varias
 * empresas eso además ya no se puede validar "por descarte".
 *
 * No distingue rol: vale tanto para empleadores como para colaboradores. Para
 * exigir ser empleador está `EmpleadorEmpresaGuard`, que además resuelve la
 * empresa activa en vez de recibirla.
 */
@Injectable()
export class MiembroDeEmpresaGuard implements CanActivate {
  constructor(
    @InjectRepository(Empleador)
    private readonly empleadorRepo: Repository<Empleador>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub ?? request.user?.userId ?? request.user?.id;

    if (!userId) {
      throw new ForbiddenException('No autenticado');
    }

    const empresaId = this.leerEmpresaId(request);

    if (!empresaId) {
      // Si la ruta no trae empresa, este guard no es el que corresponde:
      // se rechaza en vez de dejar pasar sin verificar nada.
      throw new ForbiddenException('Falta indicar la empresa');
    }

    const membresia = await this.empleadorRepo.findOne({
      where: { usuario: { id: userId }, empresa: { id: empresaId } },
    });

    if (!membresia) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }

    // Queda disponible para el handler, que si no la vuelve a buscar.
    request.membresiaEmpresa = membresia;
    return true;
  }

  /**
   * La empresa puede venir por path, query o body, y con distintos nombres
   * según el endpoint. Se buscan todos para que el guard sirva tal cual en
   * cualquiera de ellos.
   */
  private leerEmpresaId(request: any): number | null {
    const candidatos = [
      request.params?.empresaId,
      request.params?.empresa_id,
      request.query?.empresaId,
      request.query?.empresa_id,
      request.body?.empresaId,
      request.body?.empresa_id,
    ];

    for (const valor of candidatos) {
      const n = Number(valor);
      if (Number.isInteger(n) && n > 0) return n;
    }
    return null;
  }
}
