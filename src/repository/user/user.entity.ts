import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Rol } from 'src/repository/role/role.entity';
import { Curriculum } from 'src/repository/curriculum/curriculum.entity';

/**
 * Valor que se guarda en `password` cuando la cuenta no tiene credencial propia
 * (alta por OAuth). No es un texto cifrado válido, así que `EncryptService.compare`
 * devuelve `false` contra cualquier entrada: la cuenta no se puede usar para login
 * por contraseña hasta que su dueño defina una por "recuperar contraseña".
 *
 * Reemplaza al antiguo `dummyPassword`, que cifraba `oauth:<email>:<timestamp>` en
 * cada login OAuth: gasto inútil y, dado que el cifrado es reversible
 * (ver SECURITY-AUDIT.md), un dato descifrable de más en la base.
 */
export const PASSWORD_SENTINEL_OAUTH = '!oauth';

/** Valor de `auth_provider` para cuentas con contraseña propia. */
export const AUTH_PROVIDER_LOCAL = 'local';

@Entity('usuario')
export class Usuario {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
    rut: string | null;

    @Column({ type: 'varchar', length: 255, nullable: false })
    nombres: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    apellidos: string;

    @Exclude()
    @Column({ type: 'varchar', length: 255, nullable: false })
    password: string;

    /**
     * Cómo se autentica esta cuenta. `local` = tiene contraseña propia; el resto
     * son proveedores externos, donde `password` guarda el centinela
     * `PASSWORD_SENTINEL_OAUTH` y no hay credencial que el usuario conozca.
     *
     * Lo consume `LegalService.deleteAccount`, que no puede pedir contraseña a
     * quien nunca tuvo una.
     */
    @Column({ type: 'varchar', length: 20, default: 'local' })
    auth_provider: string;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
    email: string;

    @CreateDateColumn({ type: 'timestamp' })
    fecha_creacion: Date;

    @Column({ type: 'boolean', default: true })
    is_activo: boolean;

    @Column({ type: 'boolean', default: false })
    isAdmin: boolean;

    // Rol supervisor (backoffice): gestiona, pero sin acceso a datos de dinero.
    @Column({ type: 'boolean', default: false })
    isSupervisor: boolean;

    /**
 * ⚠️ LEGACY
 * Este campo NO debe usarse para autorización ni contexto.
 * Se mantiene solo por compatibilidad y migración.
 */
    @ManyToOne(() => Rol, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'rol_id' })
    rol: Rol;

    @Column({ type: 'int', nullable: true })
    id_empresa: number | null; // Empresa activa: sobre cuál de sus empresas está operando

    /**
     * Datos del responsable como persona: domicilio, teléfono y redes.
     *
     * Van acá y no en `empleador.data` porque no cambian entre empresas y
     * porque el formulario los pide ANTES de que exista ninguna: el paso 1 del
     * onboarding no puede escribir en una membresía que todavía no hay.
     * Lo que sí es de cada membresía es el cargo.
     */
    @Column({ type: 'json', nullable: true })
    data: Record<string, any> | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    perfil_foto: string | null; // URL de la foto de perfil

    // Relación con Curriculum
    @OneToMany(() => Curriculum, (curriculum) => curriculum.usuario)
    curriculums: Curriculum[];
}