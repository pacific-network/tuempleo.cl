export interface ParsedCvData {
  datos_personales?: {
    telefono?: string;
    direccion?: string;
  };
  educacion?: Array<{
    titulo: string;
    institucion: string;
    tipo_estudio?: string;
    anno_inicio?: string;
    anno_termino?: string;
  }>;
  experiencias?: Array<{
    cargo: string;
    empresa: string;
    anno_inicio?: string;
    anno_termino?: string;
    descripcion?: string;
  }>;
  idiomas?: Array<{
    idioma: string;
    nivel_oral?: string;
    nivel_escrito?: string;
  }>;
}
