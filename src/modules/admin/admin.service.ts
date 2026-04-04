import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from 'src/repository/user/user.entity';
import { Registro } from 'src/repository/register/register.entity';
import { Oferta } from 'src/repository/job_offer/job-offer.entity';
import { Empleador } from 'src/repository/employer/employer.entity';
import { Empresa } from 'src/repository/business/business.entity';
import { Transaction } from 'src/repository/transaction/transaction.entity';

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
  ) {}

  // ─────────────────────────────────────────
  // USUARIOS
  // ─────────────────────────────────────────

  async getUsuarios(page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;
    const [items, total] = await this.usuarioRepo.findAndCount({
      order: { fecha_creacion: 'DESC' },
      take,
      skip,
      select: ['id', 'nombres', 'apellidos', 'email', 'rut', 'is_activo', 'isAdmin', 'fecha_creacion'],
    });
    return { total, page, limit: take, items };
  }

  async getUsuario(id: number) {
    const user = await this.usuarioRepo.findOne({
      where: { id },
      select: ['id', 'nombres', 'apellidos', 'email', 'rut', 'is_activo', 'isAdmin', 'fecha_creacion', 'perfil_foto'],
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
      relations: ['empresa', 'empleador'],
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
    const [items, total] = await this.transaccionRepo.findAndCount({
      relations: ['items'],
      order: { createdAt: 'DESC' },
      take,
      skip,
    });
    return { total, page, limit: take, items };
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
