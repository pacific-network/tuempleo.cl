import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from './constants';

/**
 * Permite el acceso a staff de plataforma: administradores (isAdmin)
 * o supervisores (isSupervisor). Para endpoints de "gestión".
 * Los endpoints de dinero/sensibles se siguen protegiendo además con AdminGuard.
 */
@Injectable()
export class StaffGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers['authorization'];
    const token =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice(7)
        : null;

    if (!token) throw new UnauthorizedException();

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: jwtConstants.secret,
      });
    } catch {
      throw new UnauthorizedException();
    }

    if (payload?.isAdmin !== true && payload?.isSupervisor !== true) {
      throw new ForbiddenException(
        'Acceso restringido a administradores o supervisores',
      );
    }

    request['user'] = payload;
    return true;
  }
}
