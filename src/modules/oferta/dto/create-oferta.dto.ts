import {
    IsString,
    IsInt,
    IsDateString,
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsEnum,
    IsArray,
    IsNumber,
    MaxLength,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ======================================================
// 💰 Sub-DTO: RentaSalarialDto
// ======================================================
class RentaSalarialDto {
    @IsOptional()
    @IsNumber({}, { message: 'El valor "desde" debe ser numérico.' })
    desde?: number;

    @IsOptional()
    @IsNumber({}, { message: 'El valor "hasta" debe ser numérico.' })
    hasta?: number;

    @IsOptional()
    @IsBoolean({ message: 'El campo "de_acuerdo_al_mercado" debe ser booleano.' })
    de_acuerdo_al_mercado?: boolean;
}

// ======================================================
// 🔹 Enumeraciones
// ======================================================
export enum TipoContrato {
    PLAZO_FIJO = 'plazo_fijo',
    INDEFINIDO = 'indefinido',
    TEMPORAL = 'temporal',
    PRACTICA = 'practica',
    REEMPLAZO = 'reemplazo',
    OTRO = 'otro_tipo_de_contrato',
}

export enum Modalidad {
    PRESENCIAL = 'presencial',
    REMOTO = 'remoto',
    HIBRIDO = 'hibrido',
}

export enum NivelExperiencia {
    SIN_EXPERIENCIA = 'sin_experiencia',
    CON_EXPERIENCIA = 'con_experiencia',
    JUNIOR = 'junior',
    SEMI_SENIOR = 'semi_senior',
    SENIOR = 'senior',
    EXPERTO = 'experto',
}

// ======================================================
// 🧩 DTO anidado: DataOfertaDto
// ======================================================
export class DataOfertaDto {
    // 1️⃣ Área de trabajo (SIEMPRE obligatoria)
    @IsString()
    @IsNotEmpty({ message: 'El área de trabajo es obligatoria.' })
    area_trabajo: string

    // 2️⃣ Nivel de experiencia (SIEMPRE obligatorio)
    @IsEnum(NivelExperiencia, {
        message:
            'Nivel de experiencia no válido. Use: sin_experiencia, con_experiencia, junior, semi_senior, senior o experto.',
    })
    nivel_experiencia: NivelExperiencia

    // 3️⃣ Años de experiencia (condicional por nivel)
    @IsOptional()
    @IsInt({
        message: 'Los años de experiencia deben ser un número entero.',
    })
    anios_experiencia?: number

    // 4️⃣ Modalidad (SIEMPRE obligatoria)
    @IsEnum(Modalidad, {
        message: 'Modalidad no válida. Use: presencial, remoto o hibrido.',
    })
    modalidad: Modalidad

    // 5️⃣ Ubicación física (CONDICIONAL: no aplica a remoto)
    @IsOptional()
    @IsString({ message: 'La región debe ser texto.' })
    region?: string

    @IsOptional()
    @IsString({ message: 'La comuna debe ser texto.' })
    comuna?: string

    @IsOptional()
    @IsString({
        message: 'La dirección del trabajo debe ser texto.',
    })
    direccion_trabajo?: string

    // 6️⃣ Educación requerida (depende del cargo)
    @IsOptional()
    @IsString({
        message: 'La educación requerida debe ser texto.',
    })
    educacion_requerida?: string

    // 7️⃣ Tipo de contrato (SIEMPRE obligatorio)
    @IsEnum(TipoContrato, {
        message:
            'Tipo de contrato no válido. Use: plazo_fijo, indefinido, temporal, practica, reemplazo u otro_tipo_de_contrato.',
    })
    tipo_contrato: TipoContrato

    // 8️⃣ Número de vacantes (SIEMPRE obligatorio)
    @IsInt({
        message: 'El campo "numero_vacantes" debe ser un número entero.',
    })
    numero_vacantes: number

    // 9️⃣ Descripción del puesto (SIEMPRE obligatoria)
    @IsString()
    @IsNotEmpty({
        message: 'La descripción del puesto es obligatoria.',
    })
    @MaxLength(20000, {
        message: 'La descripción del puesto no puede superar los 20.000 caracteres.',
    })
    descripcion_puesto: string

    // 🔟 Responsabilidades (opcional pero recomendado)
    @IsOptional()
    @IsArray({
        message: 'Las responsabilidades deben ser una lista.',
    })
    @IsString({
        each: true,
        message: 'Cada responsabilidad debe ser texto.',
    })
    responsabilidades?: string[]

    // 11️⃣ Requisitos mínimos (opcional, pero habitual)
    @IsOptional()
    @IsArray({
        message: 'Los requisitos mínimos deben ser una lista.',
    })
    @IsString({
        each: true,
        message: 'Cada requisito debe ser texto.',
    })
    requisitos_minimos?: string[]

    // 12️⃣ Beneficios
    @IsOptional()
    @IsArray({
        message: 'Los beneficios deben ser una lista.',
    })
    @IsString({
        each: true,
        message: 'Cada beneficio debe ser texto.',
    })
    beneficios?: string[]

    // 13️⃣ Inclusión / discapacidad
    @IsBoolean({
        message:
            'El campo "acepta_discapacitados" debe ser booleano.',
    })
    acepta_discapacitados: boolean

    // 14️⃣ Renta salarial (CONDICIONAL)
    @IsOptional()
    @ValidateNested()
    @Type(() => RentaSalarialDto)
    renta_salarial?: RentaSalarialDto

    // 15️⃣ Herramientas básicas
    @IsOptional()
    @IsArray({
        message: 'Las herramientas deben ser una lista.',
    })
    @IsString({
        each: true,
        message: 'Cada herramienta debe ser texto.',
    })
    herramientas_basicas?: string[]

    // 16️⃣ Otras herramientas
    @IsOptional()
    @IsArray({
        message: 'Las herramientas deben ser una lista.',
    })
    @IsString({
        each: true,
        message: 'Cada herramienta debe ser texto.',
    })
    otras_herramientas?: string[]

    // 17️⃣ Preguntas personalizadas
    @IsOptional()
    @IsArray({
        message: 'Las preguntas deben ser una lista.',
    })
    @IsString({
        each: true,
        message: 'Cada pregunta debe ser texto.',
    })
    preguntas_personalizadas?: string[]
}

// ======================================================
// 📦 DTO principal: CreateOfertaDto
// ======================================================
export class CreateOfertaDto {
    @IsString()
    @IsNotEmpty({ message: 'El título es obligatorio.' })
    @MaxLength(255, { message: 'El título no puede superar los 255 caracteres.' })
    titulo: string;

    @IsEnum(['GRATIS', 'BASICO', 'ESTANDAR', 'PREMIUM'] as const, {
        message:
            'El tipo de aviso debe ser GRATIS, BASICO, ESTANDAR o PREMIUM.',
    })
    tipo_aviso: 'GRATIS' | 'BASICO' | 'ESTANDAR' | 'PREMIUM';

    @IsInt()
    @IsNotEmpty({ message: 'Debe indicar la empresa asociada.' })
    empresa_id: number;

    @IsInt()
    @IsNotEmpty({ message: 'Debe indicar el empleador que publica la oferta.' })
    empleador_id: number;

    @IsOptional()
    @IsDateString({}, { message: 'La fecha de publicación debe tener formato ISO8601.' })
    fecha_publicacion?: string = new Date().toISOString();

    @IsOptional()
    @IsInt({ message: 'La duración de publicación debe ser un número.' })
    duracion_publicacion?: number = 30;

    @IsOptional()
    @IsBoolean({ message: 'El campo "es_activa" debe ser booleano.' })
    es_activa?: boolean = true;

    @IsString()
    @IsNotEmpty({ message: 'El estado de la oferta es obligatorio.' })
    estado: string;

    @IsOptional()
    @IsDateString({}, { message: 'La fecha de cierre debe tener formato ISO8601.' })
    fecha_cierre?: string;

    // 🔹 Objeto anidado: data
    @IsNotEmpty({ message: 'Debe incluir los datos de la oferta (data).' })
    @ValidateNested()
    @Type(() => DataOfertaDto)
    data: DataOfertaDto;
}
