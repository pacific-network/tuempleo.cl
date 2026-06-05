import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Usuario } from 'src/repository/user/user.entity';
import { Registro } from 'src/repository/register/register.entity';
import { Oferta } from 'src/repository/job_offer/job-offer.entity';
import { Empleador } from 'src/repository/employer/employer.entity';
import { Empresa } from 'src/repository/business/business.entity';
import { Transaction } from 'src/repository/transaction/transaction.entity';
import { Postulante } from 'src/repository/postulant/postulant.entity';
import { EncryptService } from 'src/shared/encrypt/encrypt.service';
import { CreateSupervisorDto } from './dto/create-supervisor.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,

    @InjectRepository(Registro)
    private readonly registroRepo: Repository<Registro>,

    @InjectRepository(Oferta)
    private readonly ofertaRepo: Repository<Oferta>,

    @InjectRepository(Empleador)
    private readonly empleadorRepo: Repository<Empleador>,

    @InjectRepository(Empresa)
    private readonly empresaRepo: Repository<Empresa>,

    @InjectRepository(Transaction)
    private readonly transaccionRepo: Repository<Transaction>,

    @InjectRepository(Postulante)
    private readonly postulanteRepo: Repository<Postulante>,

    private readonly encrypt: EncryptService,
  ) {}

  // ─────────────────────────────────────────
  // USUARIOS
  // ─────────────────────────────────────────

  async getUsuarios(page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;
    const [users, total] = await this.usuarioRepo.findAndCount({
      order: { fecha_creacion: 'DESC' },
      take,
      skip,
      select: ['id', 'nombres', 'apellidos', 'email', 'rut', 'is_activo', 'isAdmin', 'isSupervisor', 'fecha_creacion'],
    });

    const ids = users.map((u) => u.id);
    let empleadorIds = new Set<number>();
    let postulanteIds = new Set<number>();

    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      const [empRows, postRows] = await Promise.all([
        this.usuarioRepo.manager.query(
          `SELECT usuario_id FROM empleador WHERE usuario_id IN (${placeholders})`,
          ids,
        ),
        this.usuarioRepo.manager.query(
          `SELECT usuario_id FROM postulante WHERE usuario_id IN (${placeholders})`,
          ids,
        ),
      ]);
      empleadorIds = new Set(empRows.map((r: any) => Number(r.usuario_id)));
      postulanteIds = new Set(postRows.map((r: any) => Number(r.usuario_id)));
    }

    const items = users.map((u) => ({
      ...u,
      tipo: empleadorIds.has(u.id)
        ? 'empleador'
        : postulanteIds.has(u.id)
          ? 'postulante'
          : null,
    }));

    return { total, page, limit: take, items };
  }

  async getUsuario(id: number) {
    const user = await this.usuarioRepo.findOne({
      where: { id },
      select: ['id', 'nombres', 'apellidos', 'email', 'rut', 'is_activo', 'isAdmin', 'isSupervisor', 'fecha_creacion', 'perfil_foto'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async toggleActivo(id: number) {
    const user = await this.usuarioRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    user.is_activo = !user.is_activo;
    await this.usuarioRepo.save(user);
    return { id: user.id, is_activo: user.is_activo };
  }

  async toggleAdmin(id: number) {
    const user = await this.usuarioRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    user.isAdmin = !user.isAdmin;
    await this.usuarioRepo.save(user);
    return { id: user.id, isAdmin: user.isAdmin };
  }

  async toggleSupervisor(id: number) {
    const user = await this.usuarioRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    user.isSupervisor = !user.isSupervisor;
    await this.usuarioRepo.save(user);
    return { id: user.id, isSupervisor: user.isSupervisor };
  }

  /**
   * Crea una cuenta de supervisor desde cero (admin → crea supervisor).
   * Inserta en `registro` (login/contraseña) y `usuario` (isSupervisor=true),
   * igual que cualquier cuenta de staff. Login: POST /v1/auth/login-empleador.
   */
  async crearSupervisor(dto: CreateSupervisorDto) {
    const email = dto.email.trim().toLowerCase();

    const yaRegistro = await this.registroRepo.findOne({ where: { email } });
    const yaUsuario = await this.usuarioRepo.findOne({ where: { email } });
    if (yaRegistro || yaUsuario) {
      throw new ConflictException('Ya existe una cuenta con ese email');
    }

    const passwordEncriptado = this.encrypt.encrypt(dto.password);

    const registro = this.registroRepo.create({
      nombre_completo: `${dto.nombres} ${dto.apellidos}`.trim(),
      email,
      password: passwordEncriptado,
      es_activo: true,
    });
    await this.registroRepo.save(registro);

    const usuario = this.usuarioRepo.create({
      nombres: dto.nombres,
      apellidos: dto.apellidos,
      email,
      password: passwordEncriptado,
      is_activo: true,
      isSupervisor: true,
    });
    await this.usuarioRepo.save(usuario);

    return {
      id: usuario.id,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      email: usuario.email,
      isSupervisor: usuario.isSupervisor,
    };
  }

  /** Lista las cuentas con rol supervisor. */
  async getSupervisores(page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const [items, total] = await this.usuarioRepo.findAndCount({
      where: { isSupervisor: true },
      order: { fecha_creacion: 'DESC' },
      take,
      skip: (page - 1) * take,
      select: ['id', 'nombres', 'apellidos', 'email', 'is_activo', 'isSupervisor', 'fecha_creacion'],
    });
    return { items, total, page, limit, totalPages: Math.ceil(total / take) };
  }

  // ─────────────────────────────────────────
  // POSTULANTES
  // ─────────────────────────────────────────

  async getPostulantes(page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;
    const [items, total] = await this.postulanteRepo.findAndCount({
      relations: ['usuario'],
      order: { fecha_update: 'DESC' },
      take,
      skip,
    });
    return { total, page, limit: take, items };
  }

  // ─────────────────────────────────────────
  // ADMINS
  // ─────────────────────────────────────────

  async getAdmins(page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;
    const [items, total] = await this.usuarioRepo.findAndCount({
      where: { isAdmin: true },
      // nota: 'admins' lista solo isAdmin; los supervisores se ven en /usuarios
      order: { fecha_creacion: 'DESC' },
      take,
      skip,
      select: ['id', 'nombres', 'apellidos', 'email', 'rut', 'is_activo', 'isAdmin', 'isSupervisor', 'fecha_creacion'],
    });
    return { total, page, limit: take, items };
  }

  // ─────────────────────────────────────────
  // REGISTROS
  // ─────────────────────────────────────────

  async getRegistros(page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;
    const [items, total] = await this.registroRepo.findAndCount({
      order: { fecha_creacion: 'DESC' },
      take,
      skip,
    });
    return { total, page, limit: take, items };
  }

  async activarRegistro(id: number) {
    const registro = await this.registroRepo.findOne({ where: { id } });
    if (!registro) throw new NotFoundException('Registro no encontrado');
    registro.es_activo = true;
    await this.registroRepo.save(registro);
    return { id: registro.id, es_activo: registro.es_activo };
  }

  // ─────────────────────────────────────────
  // OFERTAS
  // ─────────────────────────────────────────

  async getOfertas(page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;
    const [items, total] = await this.ofertaRepo.findAndCount({
      relations: ['empresa', 'empleador'],
      order: { fecha_publicacion: 'DESC' },
      withDeleted: true,
      take,
      skip,
    });
    return { total, page, limit: take, items };
  }

  async getOfertasPendientes(page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;
    const [items, total] = await this.ofertaRepo.findAndCount({
      where: { estado: 'pendiente_revision' },
      relations: ['empresa', 'empleador', 'empleador.usuario'],
      order: { fecha_publicacion: 'ASC' },
      take,
      skip,
    });
    return { total, page, limit: take, items };
  }

  async aprobarOferta(id: number) {
    const oferta = await this.ofertaRepo.findOne({ where: { id } });
    if (!oferta) throw new NotFoundException('Oferta no encontrada');
    if (oferta.estado !== 'pendiente_revision') {
      return { message: 'La oferta no está pendiente de revisión', id };
    }

    oferta.estado = 'publicada';
    oferta.es_activa = true;
    oferta.fecha_publicacion = new Date();
    await this.ofertaRepo.save(oferta);
    return { id, estado: 'publicada', message: 'Oferta aprobada y publicada' };
  }

  async rechazarOferta(id: number) {
    const oferta = await this.ofertaRepo.findOne({ where: { id } });
    if (!oferta) throw new NotFoundException('Oferta no encontrada');
    if (oferta.estado !== 'pendiente_revision') {
      return { message: 'La oferta no está pendiente de revisión', id };
    }

    oferta.estado = 'eliminada';
    oferta.es_activa = false;
    await this.ofertaRepo.save(oferta);
    return { id, estado: 'eliminada', message: 'Oferta rechazada' };
  }

  async eliminarOferta(id: number) {
    const oferta = await this.ofertaRepo.findOne({ where: { id }, withDeleted: true });
    if (!oferta) throw new NotFoundException('Oferta no encontrada');
    await this.ofertaRepo.remove(oferta);
    return { removed: true, id };
  }

  // ─────────────────────────────────────────
  // EMPLEADORES
  // ─────────────────────────────────────────

  async getEmpleadores(page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;
    const [items, total] = await this.empleadorRepo.findAndCount({
      relations: ['usuario', 'empresa'],
      order: { fecha_update: 'DESC' },
      take,
      skip,
    });
    return { total, page, limit: take, items };
  }

  // ─────────────────────────────────────────
  // EMPRESAS
  // ─────────────────────────────────────────

  async getEmpresas(page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;
    const [items, total] = await this.empresaRepo.findAndCount({
      relations: ['plan'],
      order: { fecha_creacion: 'DESC' },
      take,
      skip,
    });
    return { total, page, limit: take, items };
  }

  // ─────────────────────────────────────────
  // TRANSACCIONES
  // ─────────────────────────────────────────

  async getTransacciones(page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;
    const [transacciones, total] = await this.transaccionRepo.findAndCount({
      relations: ['items'],
      order: { createdAt: 'DESC' },
      take,
      skip,
    });

    // sessionId guarda String(userId) tanto en Webpay como en Mercado Pago
    const userIds = Array.from(
      new Set(
        transacciones
          .map((t) => Number(t.sessionId))
          .filter((n) => Number.isFinite(n) && n > 0),
      ),
    );

    const usersById = new Map<number, Usuario>();
    const empresaByUserId = new Map<number, { id: number; razon_social: string; nombre_fantasia: string }>();

    if (userIds.length > 0) {
      const [users, empleadores] = await Promise.all([
        this.usuarioRepo.find({
          where: { id: In(userIds) },
          select: ['id', 'nombres', 'apellidos', 'email'],
        }),
        this.empleadorRepo.find({
          where: { usuario: { id: In(userIds) } },
          relations: ['usuario', 'empresa'],
        }),
      ]);

      for (const u of users) usersById.set(u.id, u);
      for (const e of empleadores) {
        if (e.usuario?.id && e.empresa) {
          empresaByUserId.set(e.usuario.id, {
            id: e.empresa.id,
            razon_social: e.empresa.razon_social,
            nombre_fantasia: e.empresa.nombre_fantasia,
          });
        }
      }
    }

    const items = transacciones.map((t) => {
      const uid = Number(t.sessionId);
      return {
        ...t,
        usuario: usersById.get(uid) ?? null,
        empresa: empresaByUserId.get(uid) ?? null,
      };
    });

    return { total, page, limit: take, items };
  }

  async getTransaccion(id: string) {
    const tx = await this.transaccionRepo.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!tx) throw new NotFoundException('Transacción no encontrada');

    const uid = Number(tx.sessionId);
    let usuario: Pick<Usuario, 'id' | 'nombres' | 'apellidos' | 'email'> | null = null;
    let empresa: { id: number; razon_social: string; nombre_fantasia: string } | null = null;

    if (Number.isFinite(uid) && uid > 0) {
      const [user, empleador] = await Promise.all([
        this.usuarioRepo.findOne({
          where: { id: uid },
          select: ['id', 'nombres', 'apellidos', 'email'],
        }),
        this.empleadorRepo.findOne({
          where: { usuario: { id: uid } },
          relations: ['empresa'],
        }),
      ]);
      usuario = user ?? null;
      if (empleador?.empresa) {
        empresa = {
          id: empleador.empresa.id,
          razon_social: empleador.empresa.razon_social,
          nombre_fantasia: empleador.empresa.nombre_fantasia,
        };
      }
    }

    return { ...tx, usuario, empresa };
  }

  // ─────────────────────────────────────────
  // STATS / DASHBOARD
  // ─────────────────────────────────────────

  async getStats() {
    const [
      totalUsuarios,
      usuariosActivos,
      totalOfertas,
      ofertasActivas,
      totalEmpresas,
      totalEmpleadores,
      totalTransacciones,
      registrosPendientes,
      ofertasPendientesRevision,
    ] = await Promise.all([
      this.usuarioRepo.count(),
      this.usuarioRepo.count({ where: { is_activo: true } }),
      this.ofertaRepo.count({ withDeleted: true }),
      this.ofertaRepo.count({ where: { es_activa: true } }),
      this.empresaRepo.count(),
      this.empleadorRepo.count(),
      this.transaccionRepo.count(),
      this.registroRepo.count({ where: { es_activo: false } }),
      this.ofertaRepo.count({ where: { estado: 'pendiente_revision' } }),
    ]);

    return {
      usuarios: { total: totalUsuarios, activos: usuariosActivos },
      ofertas: { total: totalOfertas, activas: ofertasActivas, pendientes_revision: ofertasPendientesRevision },
      empresas: { total: totalEmpresas },
      empleadores: { total: totalEmpleadores },
      transacciones: { total: totalTransacciones },
      registros: { pendientes: registrosPendientes },
    };
  }
}
