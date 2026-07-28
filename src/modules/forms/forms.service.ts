import {
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common'
import { RegisterBusinessEmployerDto } from './dto/register-business-employer.dto'
import { RegisterPostulantDto } from './dto/register-postulant.dto'
import { EmpresaService } from '../business/business.service'
import { EmpleadorService } from '../employer/employer.service'
import { PostulanteService } from '../postulant/postulant.service'

@Injectable()
export class FormsService {
    constructor(
        private readonly businessService: EmpresaService,
        private readonly empleadorService: EmpleadorService,
        private readonly postulanteService: PostulanteService,
    ) { }

    async registerPostulant(dto: RegisterPostulantDto, userId: number) {
        return this.postulanteService.crearPostulante(userId, dto.rut, dto.data ?? {})
    }

    async registerBusinessAndEmployer(
        dto: RegisterBusinessEmployerDto,
        userId: number, // 🔐 viene desde JWT
    ) {
        console.log('🟢 [FORMS] Inicio onboarding', {
            userId,
            rutEmpresa: dto.business.rut,
            rutEmpleador: dto.employer.rut,
        })

        // ===============================
        // 0️⃣ PRE-VALIDAR RUT DEL EMPLEADOR
        // ===============================
        // Se valida ANTES de crear la empresa: si el RUT está tomado, fallar acá evita
        // dejar la empresa huérfana cuando el rollback posterior no puede borrarla.
        const { disponible } = await this.empleadorService.checkRutUsuarioExists(
            dto.employer.rut,
            userId,
        )
        if (!disponible) {
            console.warn('⚠️ [FORMS] RUT de empleador ya registrado', {
                rut: dto.employer.rut,
                userId,
            })
            throw new ConflictException(
                'El RUT ya está registrado por otro usuario',
            )
        }

        try {
            // ===============================
            // 1️⃣ CREAR EMPRESA
            // ===============================
            console.log('🟡 [FORMS] Creando empresa...', dto.business)

            const createdBusiness =
                await this.businessService.createBusiness(dto.business)

            console.log('✅ [FORMS] Empresa creada', {
                empresaId: createdBusiness.id,
                rut: createdBusiness.rut,
            })

            try {
                // ===============================
                // 2️⃣ CREAR EMPLEADOR
                // ===============================
                console.log('🟡 [FORMS] Creando empleador...', {
                    rut: dto.employer.rut,
                    userId,
                    empresaId: createdBusiness.id,
                })

                const createdEmployer =
                    await this.empleadorService.createEmployerWithCompany(
                        {
                            ...dto.employer,
                            userId, // 🔑 identidad backend
                        },
                        createdBusiness.id,
                    )

                console.log('✅ [FORMS] Empleador creado', {
                    empleadorId: createdEmployer.id,
                    userId,
                })

                // ===============================
                // 3️⃣ ACTUALIZAR USUARIO
                // ===============================
                console.log('🟡 [FORMS] Asociando empresa al usuario...', {
                    userId,
                    empresaId: createdBusiness.id,
                })

                await this.empleadorService.updateCompanyId(
                    userId,
                    createdBusiness.id,
                )

                console.log('✅ [FORMS] Usuario actualizado correctamente')

                return {
                    business: createdBusiness,
                    employer: createdEmployer,
                }

            } catch (err) {
                console.error('❌ [FORMS] Error creando empleador', err)

                // 🔥 rollback empresa (best-effort): si falla, se loguea pero NO se
                // propaga, para no perder el error original que causó el rollback.
                try {
                    await this.businessService.deleteBusinessById(
                        createdBusiness.rut,
                    )
                } catch (rollbackErr) {
                    console.error(
                        '🚨 [FORMS] Rollback falló, empresa huérfana en BD',
                        { empresaId: createdBusiness.id, rut: createdBusiness.rut },
                        rollbackErr,
                    )
                }

                if (err instanceof ConflictException) {
                    throw err
                }

                if (err?.code === 'ER_DUP_ENTRY') {
                    throw new ConflictException(
                        'El empleador ya existe',
                    )
                }

                throw new InternalServerErrorException(
                    'No se pudo crear el empleador',
                )
            }

        } catch (err) {
            console.error('❌ [FORMS] Error creando empresa', err)

            // Respetar las excepciones HTTP ya tipadas (409, etc.) en vez de
            // aplastarlas a un 500 genérico.
            if (err instanceof HttpException) {
                throw err
            }

            if (err?.code === 'ER_DUP_ENTRY') {
                throw new ConflictException(
                    'La empresa ya existe',
                )
            }

            throw new InternalServerErrorException(
                'No se pudo registrar la empresa y el empleador',
            )
        }
    }
}
